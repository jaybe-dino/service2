"use client";

// K-Beauty 대용량 크리에이터 데이터 적재 콘솔 (kbeauty_schema_docs UPLOAD_SPEC 대응)
// - .csv / .csv.gz 를 브라우저에서 스트리밍 해제·파싱 → 1,000행 JSON 청크로 업서트
// - 데이터셋 순서 강제(shops → creators → brand_videos → category_videos → hashtag_creators)
// - 중단 시 이어올리기(행 프리픽스 기준, 업서트 멱등이라 중복 안전) · 배치 이력 · 커버리지
import { useCallback, useEffect, useRef, useState } from "react";
import { Database, Upload, RefreshCw, CheckCircle2, XCircle, Loader2, Play } from "lucide-react";

const CHUNK_ROWS = 1000;

const DATASET_ORDER = ["shops", "creators", "brand_videos", "category_videos", "hashtag_creators"] as const;
type Dataset = (typeof DATASET_ORDER)[number];

const HEADERS: Record<Dataset, string[]> = {
  shops: ["tier", "tier_name", "region", "seller_id", "shop_name", "brand_en", "brand_ko", "brand_count", "creator_pool", "gmv_local_30d", "currency", "gmv_usd_30d", "sold_30d", "avg_price_local", "gmv_growth", "new_items", "seller_type", "match_reason", "top_items"],
  creators: ["creator_uid", "handle", "nickname", "region", "followers", "mapping_tier", "tier_desc", "email", "instagram_id", "youtube_channel", "bio_link", "messaging_platforms", "contact_channels", "kb_videos", "kb_brands_count", "kb_brands", "kb_products_count", "kb_video_gmv_usd", "kb_plays", "kb_rpm_usd", "aff_sold_90d", "aff_gmv_local", "aff_video_count", "aff_live_rooms", "aff_avg_plays", "tiktok_url"],
  brand_videos: ["video_id", "kb_brand", "kb_item_id", "region", "creator_uid", "creator_handle", "creator_name", "followers", "plays", "likes", "comments", "shares", "sold", "gmv_local", "gmv_usd", "rpm", "conv_rate", "duration_sec", "created", "caption", "video_url"],
  category_videos: ["video_id", "region", "creator_uid", "creator_handle", "creator_nickname", "followers", "item_id", "item_name", "price_usd", "video_gmv_usd", "video_sold", "plays", "engage_rate", "rpm_local", "duration_sec", "created_at", "caption", "video_url"],
  hashtag_creators: ["creator_uid", "author_name", "region", "followers", "likes", "video_count", "related_videos", "categories", "src_hashtag", "src_region", "in_affiliate_db", "contact_status", "tiktok_url"],
};

function detectDataset(name: string): Dataset | null {
  const n = name.toLowerCase();
  if (n.startsWith("shops")) return "shops";
  if (n.startsWith("creators_master")) return "creators";
  if (n.startsWith("brand_videos")) return "brand_videos";
  if (n.startsWith("category_videos")) return "category_videos";
  if (n.startsWith("hashtag_creators")) return "hashtag_creators";
  return null;
}

/* ── 스트리밍 RFC4180 CSV 파서 — 청크 단위 텍스트 입력, 완성된 행 배열 반환 ── */
class CsvStream {
  private field = "";
  private row: string[] = [];
  private inQuote = false;
  private prevQuote = false; // 닫힘 따옴표 직후 상태("" 이스케이프 판별)
  push(text: string): string[][] {
    const rows: string[][] = [];
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (this.inQuote) {
        if (this.prevQuote) {
          this.prevQuote = false;
          if (ch === '"') { this.field += '"'; continue; } // "" → 이스케이프
          this.inQuote = false; // 닫힘 확정 → 일반 모드로 재처리
          i--; continue;
        }
        if (ch === '"') { this.prevQuote = true; continue; }
        this.field += ch;
      } else {
        if (ch === '"' && this.field === "") { this.inQuote = true; continue; }
        if (ch === ",") { this.row.push(this.field); this.field = ""; continue; }
        if (ch === "\n") {
          this.row.push(this.field.endsWith("\r") ? this.field.slice(0, -1) : this.field);
          this.field = "";
          rows.push(this.row); this.row = [];
          continue;
        }
        this.field += ch;
      }
    }
    return rows;
  }
  flush(): string[][] {
    if (this.prevQuote) { this.inQuote = false; this.prevQuote = false; }
    if (this.field !== "" || this.row.length) {
      this.row.push(this.field.endsWith("\r") ? this.field.slice(0, -1) : this.field);
      const r = [this.row]; this.field = ""; this.row = [];
      return r;
    }
    return [];
  }
}

interface FileJob {
  file: File;
  dataset: Dataset;
  status: "wait" | "run" | "done" | "error" | "skip";
  rowsSent: number;
  inserted: number;
  updated: number;
  rejected: number;
  msg?: string;
  errors: { row: number; column: string; value: string; message: string }[];
}

interface Batch { batch_id: number; file_name: string; dataset: string; row_count: number; inserted_count: number; updated_count: number; rejected_count: number; status: string; started_at: string; finished_at?: string }
interface Coverage { shops: number; shops_measured: number; creators: number; with_email: number; contactable: number; m1_ready: number; brand_videos: number; category_videos: number; hashtag_creators: number; brands: number }

const fmt = (n?: number) => (n ?? 0).toLocaleString();
const resumeKey = (f: File) => `kb.upload.${f.name}.${f.size}`;

export default function KbImportPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [u, setU] = useState(""); const [p, setP] = useState("");
  const [jobs, setJobs] = useState<FileJob[]>([]);
  const [running, setRunning] = useState(false);
  const [cov, setCov] = useState<Coverage | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [rebuilding, setRebuilding] = useState(false);
  const stopRef = useRef(false);

  useEffect(() => {
    fetch("/api/admin/session", { cache: "no-store" }).then((r) => r.json()).then((j) => setAuthed(!!j.authed)).catch(() => setAuthed(false));
  }, []);
  const loadStats = useCallback(() => {
    fetch("/api/admin/kb/stats").then((r) => r.json()).then((j) => setCov(j.coverage || null)).catch(() => {});
    fetch("/api/admin/kb/import").then((r) => r.json()).then((j) => setBatches(j.batches || [])).catch(() => {});
  }, []);
  useEffect(() => { if (authed) loadStats(); }, [authed, loadStats]);

  async function login() {
    const r = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: u, password: p }) });
    if (r.ok) setAuthed(true); else alert("로그인 실패");
  }

  function pickFiles(list: FileList | null) {
    if (!list) return;
    const next: FileJob[] = [];
    for (const f of Array.from(list)) {
      const ds = detectDataset(f.name);
      next.push({ file: f, dataset: (ds || "shops") as Dataset, status: ds ? "wait" : "skip", rowsSent: 0, inserted: 0, updated: 0, rejected: 0, errors: [], msg: ds ? undefined : "파일명에서 데이터셋 인식 실패" });
    }
    next.sort((a, b) => DATASET_ORDER.indexOf(a.dataset) - DATASET_ORDER.indexOf(b.dataset) || a.file.name.localeCompare(b.file.name));
    setJobs(next);
  }

  const patchJob = (i: number, patch: Partial<FileJob>) =>
    setJobs((prev) => prev.map((j, k) => (k === i ? { ...j, ...patch } : j)));

  // 한 파일 처리: 스트리밍 파싱 → 청크 업서트. resumeFrom 이후 행부터 전송.
  async function runFile(idx: number, job: FileJob): Promise<boolean> {
    const { file, dataset } = job;
    const expected = HEADERS[dataset];
    let resumeFrom = 0;
    try { resumeFrom = Number(localStorage.getItem(resumeKey(file)) || 0); } catch { /* ignore */ }
    patchJob(idx, { status: "run", msg: resumeFrom ? `${fmt(resumeFrom)}행부터 이어올리기` : undefined });

    // begin 배치
    const bg = await fetch("/api/admin/kb/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "begin", dataset, fileName: file.name }) }).then((r) => r.json());
    if (!bg.batchId) { patchJob(idx, { status: "error", msg: bg.error || "배치 생성 실패" }); return false; }
    const batchId = bg.batchId as number;

    // 스트림 구성: raw → (gz면 해제) → 텍스트 → CSV
    const gz = file.name.endsWith(".gz");
    const src = gz ? file.stream().pipeThrough(new DecompressionStream("gzip")) : file.stream();
    const reader = src.pipeThrough(new TextDecoderStream()).getReader();
    const csv = new CsvStream();

    let header: string[] | null = null;
    let colIdx: number[] = [];
    let rowNo = 0; // 데이터 행 번호(0부터)
    let buf: Record<string, string>[] = [];
    let sent = resumeFrom, ins = job.inserted, upd = job.updated, rej = job.rejected;
    const errs = [...job.errors];

    const flush = async (): Promise<boolean> => {
      if (!buf.length) return true;
      const payload = buf; buf = [];
      const r = await fetch("/api/admin/kb/import", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataset, batchId, rows: payload, startRow: sent }),
      }).then((x) => x.json()).catch((e) => ({ error: String(e) }));
      if (r.error) { patchJob(idx, { status: "error", msg: r.error }); await fetch("/api/admin/kb/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "fail", batchId, error: r.error }) }); return false; }
      sent += payload.length; ins += r.inserted || 0; upd += r.updated || 0; rej += r.rejected || 0;
      if (Array.isArray(r.errors) && errs.length < 100) errs.push(...r.errors.slice(0, 100 - errs.length));
      try { localStorage.setItem(resumeKey(file), String(sent)); } catch { /* ignore */ }
      patchJob(idx, { rowsSent: sent, inserted: ins, updated: upd, rejected: rej, errors: errs });
      return true;
    };

    const handleRow = (cells: string[]): Record<string, string> => {
      const o: Record<string, string> = {};
      for (let c = 0; c < expected.length; c++) o[expected[c]] = cells[colIdx[c]] ?? "";
      return o;
    };

    try {
      for (;;) {
        if (stopRef.current) { patchJob(idx, { status: "error", msg: "사용자 중단 — 같은 파일 다시 올리면 이어서 진행" }); return false; }
        const { done, value } = await reader.read();
        const rows = done ? csv.flush() : csv.push(value || "");
        for (const cells of rows) {
          if (!header) {
            header = cells.map((h) => h.replace(/^﻿/, "").trim());
            const missing = expected.filter((c) => !header!.includes(c));
            if (missing.length) { patchJob(idx, { status: "error", msg: `헤더 불일치: ${missing.slice(0, 5).join(", ")} 누락` }); return false; }
            colIdx = expected.map((c) => header!.indexOf(c));
            continue;
          }
          if (cells.length === 1 && cells[0] === "") continue; // 빈 줄
          if (rowNo++ < resumeFrom) continue; // 이어올리기: 이미 보낸 행 건너뜀
          buf.push(handleRow(cells));
          if (buf.length >= CHUNK_ROWS) { if (!(await flush())) return false; }
        }
        if (done) break;
      }
      if (!(await flush())) return false;
      await fetch("/api/admin/kb/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "complete", batchId }) });
      try { localStorage.removeItem(resumeKey(file)); } catch { /* ignore */ }
      patchJob(idx, { status: "done", msg: undefined });
      return true;
    } catch (e) {
      const msg = String(e instanceof Error ? e.message : e).slice(0, 200);
      patchJob(idx, { status: "error", msg });
      await fetch("/api/admin/kb/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "fail", batchId, error: msg }) });
      return false;
    }
  }

  async function runAll() {
    setRunning(true); stopRef.current = false;
    for (let i = 0; i < jobs.length; i++) {
      const j = jobs[i];
      if (j.status === "done" || j.status === "skip") continue;
      const ok = await runFile(i, j);
      if (!ok && !stopRef.current) break; // 데이터셋 순서 의존 → 실패 시 중단
      if (stopRef.current) break;
    }
    setRunning(false);
    loadStats();
  }

  async function rebuild() {
    setRebuilding(true);
    const r = await fetch("/api/admin/kb/stats", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "rebuild" }) }).then((x) => x.json()).catch(() => null);
    setRebuilding(false);
    if (r?.ok) { alert(`파생 리빌드 완료 — 브랜드 ${fmt(r.brands)} · 크리에이터×브랜드 ${fmt(r.pairs)}`); loadStats(); }
    else alert(r?.error || "리빌드 실패");
  }

  function downloadErrors(job: FileJob) {
    const csvTxt = "row,column,value,message\n" + job.errors.map((e) => `${e.row},"${e.column}","${String(e.value).replace(/"/g, '""')}","${e.message}"`).join("\n");
    const url = URL.createObjectURL(new Blob([csvTxt], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = `errors_${job.file.name}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  if (authed === null) return <div className="grid min-h-screen place-items-center text-sm text-slate-400">확인 중…</div>;
  if (!authed) return (
    <div className="grid min-h-screen place-items-center bg-slate-50">
      <div className="w-80 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-[16px] font-black">K-Beauty 데이터 적재</h1>
        <input value={u} onChange={(e) => setU(e.target.value)} placeholder="아이디" className="mt-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]" />
        <input value={p} onChange={(e) => setP(e.target.value)} type="password" placeholder="비밀번호" className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]" onKeyDown={(e) => e.key === "Enter" && login()} />
        <button onClick={login} className="mt-3 w-full rounded-lg bg-slate-900 py-2 text-[13px] font-bold text-white">로그인</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 px-5 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center gap-2">
          <Database size={20} className="text-violet-600" />
          <h1 className="text-[20px] font-black">K-Beauty 크리에이터 데이터 적재</h1>
        </div>
        <p className="mt-1 text-[12px] text-slate-500">
          kbeauty-dataset의 .csv / .csv.gz 파일을 그대로 올리면 브라우저에서 해제·파싱해 순서대로 적재합니다.
          적재 순서(shops → creators → brand_videos → category_videos → hashtag_creators)는 자동 정렬되고, 중단해도 같은 파일을 다시 올리면 이어서 올라갑니다.
        </p>

        {/* 커버리지 */}
        {cov && (
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {[
              ["샵", cov.shops, `측정 ${fmt(cov.shops_measured)}`],
              ["크리에이터", cov.creators, `M1 ${fmt(cov.m1_ready)}`],
              ["이메일 보유", cov.with_email, `컨택가능 ${fmt(cov.contactable)}`],
              ["브랜드 영상", cov.brand_videos, `카테고리 ${fmt(cov.category_videos)}`],
              ["브랜드", cov.brands, `해시태그 ${fmt(cov.hashtag_creators)}`],
            ].map(([label, n, sub]) => (
              <div key={String(label)} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="text-[10px] font-bold uppercase text-slate-400">{label}</div>
                <div className="text-[18px] font-black">{fmt(Number(n))}</div>
                <div className="text-[10px] text-slate-400">{sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* 파일 선택 + 실행 */}
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-violet-400 bg-violet-50 px-4 py-2.5 text-[12px] font-bold text-violet-700">
              <Upload size={14} /> 파일 선택 (.csv / .csv.gz, 복수 가능)
              <input type="file" multiple accept=".csv,.gz" className="hidden" onChange={(e) => pickFiles(e.target.files)} disabled={running} />
            </label>
            <button onClick={runAll} disabled={running || !jobs.some((j) => j.status === "wait" || j.status === "error")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2.5 text-[12px] font-bold text-white disabled:opacity-40">
              {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} {running ? "적재 중…" : "적재 시작"}
            </button>
            {running && <button onClick={() => { stopRef.current = true; }} className="rounded-lg border border-rose-300 px-3 py-2.5 text-[12px] font-bold text-rose-600">중단</button>}
            <button onClick={rebuild} disabled={rebuilding || running}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2.5 text-[12px] font-bold disabled:opacity-40">
              {rebuilding ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} 파생 테이블 리빌드
            </button>
          </div>
          <p className="mt-2 text-[10px] text-slate-400">전체 적재 완료 후 &ldquo;파생 테이블 리빌드&rdquo;를 1회 눌러 브랜드 마스터·크리에이터×브랜드 집계를 갱신하세요.</p>

          {jobs.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-[12px]">
                <thead><tr className="border-b border-slate-200 text-left text-[10px] uppercase text-slate-400">
                  <th className="py-2 pr-3">파일</th><th className="py-2 pr-3">데이터셋</th><th className="py-2 pr-3">전송 행</th>
                  <th className="py-2 pr-3">신규</th><th className="py-2 pr-3">갱신</th><th className="py-2 pr-3">거부</th><th className="py-2">상태</th>
                </tr></thead>
                <tbody>
                  {jobs.map((j, i) => (
                    <tr key={j.file.name + i} className="border-b border-slate-100 last:border-0">
                      <td className="py-2 pr-3 font-semibold">{j.file.name} <span className="text-[10px] text-slate-400">({(j.file.size / 1048576).toFixed(1)}MB)</span></td>
                      <td className="py-2 pr-3">{j.dataset}</td>
                      <td className="py-2 pr-3 tabular-nums">{fmt(j.rowsSent)}</td>
                      <td className="py-2 pr-3 tabular-nums text-emerald-600">{fmt(j.inserted)}</td>
                      <td className="py-2 pr-3 tabular-nums text-sky-600">{fmt(j.updated)}</td>
                      <td className="py-2 pr-3 tabular-nums">
                        {j.rejected > 0 ? <button onClick={() => downloadErrors(j)} className="font-bold text-rose-600 underline underline-offset-2">{fmt(j.rejected)}</button> : 0}
                      </td>
                      <td className="py-2">
                        {j.status === "wait" && <span className="text-slate-400">대기</span>}
                        {j.status === "run" && <span className="inline-flex items-center gap-1 font-bold text-violet-600"><Loader2 size={12} className="animate-spin" /> 진행</span>}
                        {j.status === "done" && <span className="inline-flex items-center gap-1 font-bold text-emerald-600"><CheckCircle2 size={13} /> 완료</span>}
                        {(j.status === "error" || j.status === "skip") && <span className="inline-flex items-center gap-1 font-bold text-rose-600" title={j.msg}><XCircle size={13} /> {j.msg?.slice(0, 40) || "오류"}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 배치 이력 */}
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-[14px] font-black">적재 이력</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-[12px]">
              <thead><tr className="border-b border-slate-200 text-left text-[10px] uppercase text-slate-400">
                <th className="py-2 pr-3">#</th><th className="py-2 pr-3">파일</th><th className="py-2 pr-3">데이터셋</th>
                <th className="py-2 pr-3">신규</th><th className="py-2 pr-3">갱신</th><th className="py-2 pr-3">거부</th><th className="py-2 pr-3">상태</th><th className="py-2">시작</th>
              </tr></thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.batch_id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-3 text-slate-400">{b.batch_id}</td>
                    <td className="py-2 pr-3 font-semibold">{b.file_name}</td>
                    <td className="py-2 pr-3">{b.dataset}</td>
                    <td className="py-2 pr-3 tabular-nums">{fmt(b.inserted_count)}</td>
                    <td className="py-2 pr-3 tabular-nums">{fmt(b.updated_count)}</td>
                    <td className="py-2 pr-3 tabular-nums">{fmt(b.rejected_count)}</td>
                    <td className="py-2 pr-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${b.status === "done" ? "bg-emerald-50 text-emerald-600" : b.status === "failed" ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"}`}>{b.status}</span>
                    </td>
                    <td className="py-2 text-[11px] text-slate-400">{new Date(b.started_at).toLocaleString("ko-KR")}</td>
                  </tr>
                ))}
                {!batches.length && <tr><td colSpan={8} className="py-6 text-center text-slate-400">이력이 없습니다</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
