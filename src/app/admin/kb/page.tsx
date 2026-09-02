"use client";

// K-Beauty 대용량 크리에이터 데이터 적재 콘솔 (kbeauty_schema_docs UPLOAD_SPEC 대응)
// - .csv / .csv.gz 를 브라우저에서 스트리밍 해제·파싱 → 1,000행 JSON 청크로 업서트
// - 데이터셋 순서 강제(shops → creators → brand_videos → category_videos → hashtag_creators)
// - 중단 시 이어올리기(행 프리픽스 기준, 업서트 멱등이라 중복 안전) · 배치 이력 · 커버리지
import { useCallback, useEffect, useRef, useState } from "react";
import { Database, Upload, RefreshCw, CheckCircle2, XCircle, Loader2, Play, Filter, Download, Search } from "lucide-react";

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

/* ── 세그먼트 빌더 ─────────────────────────────────────────────── */
interface SegFilter {
  regions: string[]; tiers: string[]; followersMin: string; followersMax: string;
  emailOnly: boolean; contactAny: boolean; brand: string; rpmMin: string; kbBrandsMin: string; platform: string;
}
const EMPTY_FILTER: SegFilter = { regions: [], tiers: [], followersMin: "", followersMax: "", emailOnly: false, contactAny: false, brand: "", rpmMin: "", kbBrandsMin: "", platform: "" };

// 03_views.sql 운영 뷰 상당 프리셋
const PRESETS: { name: string; desc: string; f: Partial<SegFilter> }[] = [
  { name: "M1 아웃리치 준비", desc: "연락처+판매실적 검증", f: { tiers: ["M1"] } },
  { name: "마이크로 고효율", desc: "M1 · 1천~15만 팔로워 · 이메일", f: { tiers: ["M1"], followersMin: "1000", followersMax: "150000", emailOnly: true } },
  { name: "멀티브랜드 3+", desc: "한국 브랜드 3개 이상 판매", f: { kbBrandsMin: "3" } },
  { name: "콜드 풀", desc: "M3 · 이메일 보유(미검증)", f: { tiers: ["M3"], emailOnly: true } },
  { name: "초대장 대상", desc: "M4 · 실적 있으나 연락처 없음", f: { tiers: ["M4"] } },
  { name: "태국 LINE", desc: "TH · LINE 연락 가능", f: { regions: ["TH"], platform: "LINE" } },
];

interface SegRow {
  creator_uid: string; handle: string | null; nickname: string | null; region: string | null;
  followers: number; mapping_tier: string; email: string | null; instagram_id: string | null;
  messaging_platforms: string | null; contact_channels: string | null; kb_videos: number;
  kb_brands_count: number; kb_brands: string | null; kb_video_gmv_usd: string | null; kb_rpm_usd: string | null; tiktok_url: string | null;
}

function toApiFilter(f: SegFilter) {
  return {
    regions: f.regions, tiers: f.tiers,
    followersMin: f.followersMin ? Number(f.followersMin) : undefined,
    followersMax: f.followersMax ? Number(f.followersMax) : undefined,
    emailOnly: f.emailOnly || undefined, contactAny: f.contactAny || undefined,
    brand: f.brand || undefined, rpmMin: f.rpmMin ? Number(f.rpmMin) : undefined,
    kbBrandsMin: f.kbBrandsMin ? Number(f.kbBrandsMin) : undefined, platform: f.platform || undefined,
  };
}

const EXPORT_CAP = 100_000;
const EXPORT_PAGE = 5000;

function SegmentBuilder() {
  const [f, setF] = useState<SegFilter>(EMPTY_FILTER);
  const [brands, setBrands] = useState<{ brand_en: string; creator_count: number }[]>([]);
  const [rows, setRows] = useState<SegRow[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [withEmail, setWithEmail] = useState(0);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/kb/segment").then((r) => r.json()).then((j) => setBrands(j.brands || [])).catch(() => {});
  }, []);

  const toggle = (key: "regions" | "tiers", v: string) =>
    setF((p) => ({ ...p, [key]: p[key].includes(v) ? p[key].filter((x) => x !== v) : [...p[key], v] }));

  async function search(filter: SegFilter = f) {
    setBusy(true);
    const r = await fetch("/api/admin/kb/segment", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filter: toApiFilter(filter), limit: 100 }),
    }).then((x) => x.json()).catch(() => null);
    setBusy(false);
    if (r?.error || !r) { alert(r?.error || "검색 실패"); return; }
    setRows(r.rows || []); setCount(r.count ?? 0); setWithEmail(r.withEmail ?? 0);
  }

  function applyPreset(preset: Partial<SegFilter>) {
    const nf = { ...EMPTY_FILTER, ...preset } as SegFilter;
    setF(nf); search(nf);
  }

  async function exportCsv() {
    if (!count) return;
    const total = Math.min(count, EXPORT_CAP);
    setExporting(`0 / ${fmt(total)}`);
    const header = ["creator_uid", "handle", "nickname", "region", "followers", "mapping_tier", "email", "instagram_id", "messaging_platforms", "contact_channels", "kb_videos", "kb_brands_count", "kb_brands", "kb_video_gmv_usd", "kb_rpm_usd", "tiktok_url"];
    const esc = (v: unknown) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const parts: string[] = [header.join(",") + "\n"];
    for (let off = 0; off < total; off += EXPORT_PAGE) {
      const r = await fetch("/api/admin/kb/segment", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filter: toApiFilter(f), limit: EXPORT_PAGE, offset: off }),
      }).then((x) => x.json()).catch(() => null);
      if (!r || r.error) { alert(r?.error || "내보내기 실패"); setExporting(null); return; }
      for (const row of r.rows as SegRow[]) parts.push(header.map((h) => esc(row[h as keyof SegRow])).join(",") + "\n");
      setExporting(`${fmt(Math.min(off + EXPORT_PAGE, total))} / ${fmt(total)}`);
      if (!r.rows?.length) break;
    }
    const url = URL.createObjectURL(new Blob(["﻿", ...parts], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `kb_segment_${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    setExporting(null);
  }

  const inputCls = "w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-[12px]";
  const chip = (on: boolean) => `rounded-full border px-2.5 py-1 text-[11px] font-bold ${on ? "border-violet-500 bg-violet-50 text-violet-700" : "border-slate-200 text-slate-500"}`;

  return (
    <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2">
        <Filter size={15} className="text-violet-600" />
        <h2 className="text-[14px] font-black">세그먼트 빌더</h2>
        <span className="text-[10px] text-slate-400">필터 → 미리보기 → CSV 내보내기 (RPM 내림차순)</span>
      </div>

      {/* 프리셋 */}
      <div className="mt-3 flex flex-wrap gap-2">
        {PRESETS.map((pz) => (
          <button key={pz.name} onClick={() => applyPreset(pz.f)} title={pz.desc}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold hover:border-violet-400 hover:text-violet-700">
            {pz.name}
          </button>
        ))}
      </div>

      {/* 필터 */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="mb-1 text-[10px] font-bold uppercase text-slate-400">지역</div>
          <div className="flex gap-1.5">{["US", "TH", "VN"].map((r) => <button key={r} onClick={() => toggle("regions", r)} className={chip(f.regions.includes(r))}>{r}</button>)}</div>
        </div>
        <div>
          <div className="mb-1 text-[10px] font-bold uppercase text-slate-400">매핑 티어</div>
          <div className="flex gap-1.5">{["M1", "M3", "M4", "M5"].map((t) => <button key={t} onClick={() => toggle("tiers", t)} className={chip(f.tiers.includes(t))}>{t}</button>)}</div>
        </div>
        <div>
          <div className="mb-1 text-[10px] font-bold uppercase text-slate-400">팔로워</div>
          <div className="flex items-center gap-1.5">
            <input inputMode="numeric" value={f.followersMin} onChange={(e) => setF({ ...f, followersMin: e.target.value.replace(/\D/g, "") })} placeholder="최소" className={inputCls} />
            <span className="text-slate-300">~</span>
            <input inputMode="numeric" value={f.followersMax} onChange={(e) => setF({ ...f, followersMax: e.target.value.replace(/\D/g, "") })} placeholder="최대" className={inputCls} />
          </div>
        </div>
        <div>
          <div className="mb-1 text-[10px] font-bold uppercase text-slate-400">브랜드 (파생 리빌드 후)</div>
          <select value={f.brand} onChange={(e) => setF({ ...f, brand: e.target.value })} className={inputCls}>
            <option value="">전체</option>
            {brands.map((b) => <option key={b.brand_en} value={b.brand_en}>{b.brand_en} ({fmt(b.creator_count)})</option>)}
          </select>
        </div>
        <div>
          <div className="mb-1 text-[10px] font-bold uppercase text-slate-400">RPM 최소 (USD/1천뷰)</div>
          <input inputMode="decimal" value={f.rpmMin} onChange={(e) => setF({ ...f, rpmMin: e.target.value.replace(/[^\d.]/g, "") })} placeholder="예: 5" className={inputCls} />
        </div>
        <div>
          <div className="mb-1 text-[10px] font-bold uppercase text-slate-400">한국 브랜드 수 최소</div>
          <input inputMode="numeric" value={f.kbBrandsMin} onChange={(e) => setF({ ...f, kbBrandsMin: e.target.value.replace(/\D/g, "") })} placeholder="예: 3" className={inputCls} />
        </div>
        <div>
          <div className="mb-1 text-[10px] font-bold uppercase text-slate-400">메시징 플랫폼</div>
          <select value={f.platform} onChange={(e) => setF({ ...f, platform: e.target.value })} className={inputCls}>
            <option value="">전체</option>
            {["LINE", "Zalo", "WhatsApp", "Telegram", "KakaoTalk", "Instagram", "YouTube", "Linktree"].map((pl) => <option key={pl} value={pl}>{pl}</option>)}
          </select>
        </div>
        <div className="flex items-end gap-3 pb-0.5">
          <label className="flex items-center gap-1.5 text-[11px] font-bold"><input type="checkbox" checked={f.emailOnly} onChange={(e) => setF({ ...f, emailOnly: e.target.checked })} /> 이메일 보유</label>
          <label className="flex items-center gap-1.5 text-[11px] font-bold"><input type="checkbox" checked={f.contactAny} onChange={(e) => setF({ ...f, contactAny: e.target.checked })} /> 연락채널 有</label>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button onClick={() => search()} disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-[12px] font-bold text-white disabled:opacity-40">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />} 검색
        </button>
        <button onClick={() => { setF(EMPTY_FILTER); setRows([]); setCount(null); }} className="rounded-lg border border-slate-200 px-3 py-2 text-[12px] font-semibold text-slate-500">초기화</button>
        {count !== null && (
          <span className="text-[12px] font-bold">
            {fmt(count)}명 <span className="font-normal text-slate-400">· 이메일 {fmt(withEmail)}명{count > EXPORT_CAP && ` · 내보내기는 상위 ${fmt(EXPORT_CAP)}명까지`}</span>
          </span>
        )}
        {count !== null && count > 0 && (
          <button onClick={exportCsv} disabled={!!exporting}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-emerald-400 bg-emerald-50 px-4 py-2 text-[12px] font-bold text-emerald-700 disabled:opacity-40">
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} {exporting ? `내보내는 중 ${exporting}` : "CSV 내보내기"}
          </button>
        )}
      </div>

      {rows.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[860px] text-[11.5px]">
            <thead><tr className="border-b border-slate-200 text-left text-[10px] uppercase text-slate-400">
              <th className="py-2 pr-3">핸들</th><th className="py-2 pr-3">지역</th><th className="py-2 pr-3">티어</th>
              <th className="py-2 pr-3">팔로워</th><th className="py-2 pr-3">이메일</th><th className="py-2 pr-3">플랫폼</th>
              <th className="py-2 pr-3">KB영상</th><th className="py-2 pr-3">브랜드수</th><th className="py-2 pr-3">GMV$</th><th className="py-2">RPM$</th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.creator_uid} className="border-b border-slate-100 last:border-0">
                  <td className="py-1.5 pr-3 font-semibold">
                    {r.tiktok_url ? <a href={r.tiktok_url} target="_blank" rel="noreferrer noopener" className="text-violet-600 hover:underline">@{r.handle || r.creator_uid}</a> : `@${r.handle || r.creator_uid}`}
                  </td>
                  <td className="py-1.5 pr-3">{r.region || "—"}</td>
                  <td className="py-1.5 pr-3">{r.mapping_tier}</td>
                  <td className="py-1.5 pr-3 tabular-nums">{fmt(r.followers)}</td>
                  <td className="py-1.5 pr-3">{r.email || "—"}</td>
                  <td className="py-1.5 pr-3 text-[10px] text-slate-500">{r.messaging_platforms || "—"}</td>
                  <td className="py-1.5 pr-3 tabular-nums">{fmt(r.kb_videos)}</td>
                  <td className="py-1.5 pr-3 tabular-nums">{fmt(r.kb_brands_count)}</td>
                  <td className="py-1.5 pr-3 tabular-nums">{fmt(Math.round(Number(r.kb_video_gmv_usd || 0)))}</td>
                  <td className="py-1.5 tabular-nums">{Number(r.kb_rpm_usd || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[10px] text-slate-400">미리보기 상위 100명 — 전체는 CSV 내보내기로 받으세요.</p>
        </div>
      )}
    </div>
  );
}

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

        {/* 세그먼트 빌더 */}
        <SegmentBuilder />

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
