"use client";

// 글로벌 크리에이터 DB — K-Beauty 판매 실적 기반 60만 크리에이터 (US·TH·VN).
// Pro 전용(기존 BM: 인플루언서 DB·컨택은 Pro부터). 데이터: kb_creators (관리자 적재).
import { useCallback, useEffect, useState } from "react";
import { Globe2, Search, Loader2, Mail, ChevronLeft, ChevronRight } from "lucide-react";
import PageShell from "@/components/ktrend/PageShell";
import ProGate from "@/components/ktrend/ProGate";

interface Row {
  creator_uid: string; handle: string | null; nickname: string | null; region: string | null;
  followers: number; mapping_tier: string; email: string | null; instagram_id: string | null;
  messaging_platforms: string | null; kb_videos: number; kb_brands_count: number; kb_brands: string | null;
  kb_video_gmv_usd: string | null; kb_rpm_usd: string | null; tiktok_url: string | null;
}

const fmt = (n?: number | string | null) => Math.round(Number(n ?? 0)).toLocaleString();
const TIER_LABEL: Record<string, string> = { M1: "실적+컨택", M3: "컨택만", M4: "실적만" };

export default function GlobalInfluencersPage() {
  const [region, setRegion] = useState("");
  const [tier, setTier] = useState("");
  const [contact, setContact] = useState(false);
  const [sort, setSort] = useState("rpm");
  const [q, setQ] = useState("");
  const [qInput, setQInput] = useState("");
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(() => {
    setBusy(true); setErr("");
    const qs = new URLSearchParams({ region, tier, sort, q, page: String(page), ...(contact ? { contact: "1" } : {}) });
    fetch(`/api/influencers/global?${qs}`).then((r) => r.json()).then((j) => {
      if (j.error) { setErr(j.error); setRows([]); setTotal(null); return; }
      setRows(j.rows || []); setTotal(j.total ?? 0);
    }).catch(() => setErr("불러오기 실패")).finally(() => setBusy(false));
  }, [region, tier, sort, q, page, contact]);
  useEffect(() => { load(); }, [load]);

  const pages = total ? Math.ceil(total / 50) : 0;
  const chip = (on: boolean) => `rounded-full border px-3 py-1.5 text-[11px] font-bold ${on ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--muted)]"}`;

  return (
    <PageShell>
      <div className="mb-5">
        <div className="flex items-center gap-2">
          <Globe2 size={20} className="text-[var(--accent)]" />
          <h1 className="text-[22px] font-black tracking-tight">글로벌 크리에이터 DB</h1>
          <span className="rounded-full bg-[var(--accent-light)] px-2.5 py-0.5 text-[10px] font-bold text-[var(--accent)]">NEW</span>
        </div>
        <p className="mt-1.5 text-[13px] text-[var(--muted)]">
          K-뷰티 판매 실적으로 검증된 US·TH·VN 크리에이터. RPM(1천뷰당 매출)순 — 팔로워 수보다 판매력이 정확합니다.
        </p>
      </div>

      <ProGate label="글로벌 크리에이터 DB" features={["K-뷰티 실적 크리에이터 열람", "이메일·메시징 컨택 정보", "브랜드별 판매 이력·RPM"]}>
        {/* 필터 바 */}
        <div className="kt-card flex flex-wrap items-center gap-2 p-4">
          {["", "US", "TH", "VN"].map((r) => (
            <button key={r || "all"} onClick={() => { setRegion(r); setPage(0); }} className={chip(region === r)}>{r || "전체 지역"}</button>
          ))}
          <span className="mx-1 h-4 w-px bg-[var(--border)]" />
          {["", "M1", "M3", "M4"].map((t) => (
            <button key={t || "all"} onClick={() => { setTier(t); setPage(0); }} className={chip(tier === t)}>{t ? `${t} ${TIER_LABEL[t]}` : "전체 등급"}</button>
          ))}
          <span className="mx-1 h-4 w-px bg-[var(--border)]" />
          <button onClick={() => { setContact(!contact); setPage(0); }} className={chip(contact)}>컨택 가능만</button>
          <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(0); }} className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-[11px] font-semibold">
            <option value="rpm">RPM 높은 순</option>
            <option value="gmv">판매액 높은 순</option>
            <option value="followers">팔로워 많은 순</option>
          </select>
          <div className="relative ml-auto">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input value={qInput} onChange={(e) => setQInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { setQ(qInput); setPage(0); } }}
              placeholder="핸들·닉네임·브랜드 검색 (Enter)"
              className="w-56 rounded-lg border border-[var(--border)] py-1.5 pl-8 pr-3 text-[12px]" />
          </div>
        </div>

        {/* 결과 */}
        <div className="kt-card mt-3 overflow-hidden p-0">
          {err && <div className="p-8 text-center text-[13px] text-[var(--muted)]">{err}</div>}
          {!err && total === 0 && !busy && (
            <div className="p-10 text-center text-[13px] text-[var(--muted)]">
              데이터 준비 중입니다 — 곧 60만 크리에이터가 공개됩니다.
            </div>
          )}
          {!err && rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-[12px]">
                <thead><tr className="border-b border-[var(--border)] bg-slate-50 text-left text-[10px] uppercase text-[var(--muted)]">
                  <th className="p-3">크리에이터</th><th className="p-3">지역</th><th className="p-3">등급</th>
                  <th className="p-3">팔로워</th><th className="p-3">K-뷰티 영상</th><th className="p-3">판매 브랜드</th>
                  <th className="p-3">판매액(USD)</th><th className="p-3">RPM</th><th className="p-3">컨택</th>
                </tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.creator_uid} className="border-b border-[var(--border)] last:border-0 hover:bg-slate-50/60">
                      <td className="p-3">
                        <div className="font-bold">
                          {r.tiktok_url
                            ? <a href={r.tiktok_url} target="_blank" rel="noreferrer noopener" className="text-[var(--accent)] hover:underline">@{r.handle || r.creator_uid.slice(0, 10)}</a>
                            : `@${r.handle || r.creator_uid.slice(0, 10)}`}
                        </div>
                        {r.nickname && <div className="text-[10px] text-[var(--muted)]">{r.nickname}</div>}
                      </td>
                      <td className="p-3">{r.region || "—"}</td>
                      <td className="p-3"><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold">{r.mapping_tier}</span></td>
                      <td className="p-3 tabular-nums">{fmt(r.followers)}</td>
                      <td className="p-3 tabular-nums">{fmt(r.kb_videos)}</td>
                      <td className="p-3 max-w-[220px] truncate text-[11px] text-[var(--muted)]" title={r.kb_brands || ""}>{r.kb_brands || "—"}</td>
                      <td className="p-3 tabular-nums font-bold">${fmt(r.kb_video_gmv_usd)}</td>
                      <td className="p-3 tabular-nums font-bold text-[var(--accent)]">{Number(r.kb_rpm_usd || 0).toFixed(2)}</td>
                      <td className="p-3">
                        {r.email
                          ? <a href={`mailto:${r.email}`} className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:underline"><Mail size={11} /> 이메일</a>
                          : r.messaging_platforms
                          ? <span className="text-[10px] text-[var(--muted)]">{r.messaging_platforms.split(",")[0]}</span>
                          : <span className="text-[10px] text-[var(--muted)]">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {busy && <div className="flex items-center justify-center gap-2 p-6 text-[12px] text-[var(--muted)]"><Loader2 size={14} className="animate-spin" /> 불러오는 중…</div>}
        </div>

        {/* 페이지네이션 */}
        {pages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-3 text-[12px]">
            <button disabled={page === 0} onClick={() => setPage(page - 1)} className="kt-btn kt-btn-outline px-3 py-1.5 disabled:opacity-30"><ChevronLeft size={14} /></button>
            <span className="font-bold">{(page + 1).toLocaleString()} / {pages.toLocaleString()}</span>
            <span className="text-[var(--muted)]">· 총 {Number(total).toLocaleString()}명</span>
            <button disabled={page >= pages - 1} onClick={() => setPage(page + 1)} className="kt-btn kt-btn-outline px-3 py-1.5 disabled:opacity-30"><ChevronRight size={14} /></button>
          </div>
        )}
      </ProGate>
    </PageShell>
  );
}
