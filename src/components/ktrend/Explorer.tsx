"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Plus, X, Check, SlidersHorizontal, Sparkles, Loader2 } from "lucide-react";
import ContentCard from "./ContentCard";
import { usePlan } from "./PlanContext";
import { BRANDS, BRAND_AZ_KEYS, isPopular } from "@/data/ktrend/brands";
import {
  CATEGORIES,
  SUBCATEGORIES,
  TIERS,
  type CategoryId,
  type SubCategoryId,
  type InfluencerTier,
} from "@/data/ktrend/meta";
import {
  loadContent,
  SORTS,
  sortContent,
  type Content,
  type SortKey,
} from "@/data/ktrend/content";

function toggle<T>(set: Set<T>, v: T): Set<T> {
  const next = new Set(set);
  if (next.has(v)) next.delete(v);
  else next.add(v);
  return next;
}

const TIER_KEYS = Object.keys(TIERS) as InfluencerTier[];
const PAGE = 48;

export default function Explorer() {
  const { isPro, isAdmin } = usePlan();

  const [all, setAll] = useState<Content[] | null>(null);
  const [az, setAz] = useState<string>("ALL");
  const [brandQuery, setBrandQuery] = useState("");
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<Set<CategoryId>>(new Set());
  const [subs, setSubs] = useState<Set<SubCategoryId>>(new Set());
  const [tiers, setTiers] = useState<Set<InfluencerTier>>(new Set());
  const [onlyShop, setOnlyShop] = useState(false);
  const [onlyAd, setOnlyAd] = useState(false);
  const [sort, setSort] = useState<SortKey>("random");
  const [showFilters, setShowFilters] = useState(false);
  const [visible, setVisible] = useState(PAGE);

  const [modalOpen, setModalOpen] = useState(false);
  const [pendingBrands, setPendingBrands] = useState<{ name: string; progress: number }[]>([]);

  useEffect(() => {
    loadContent().then(setAll);
  }, []);

  // 콘텐츠가 1개라도 있는 브랜드만 노출 (수집 전 빈 브랜드 숨김)
  const brandsWithContent = useMemo(() => {
    if (!all) return null;
    return new Set(all.map((c) => c.brandId));
  }, [all]);

  const visibleBrands = useMemo(() => {
    let list = BRANDS;
    if (brandsWithContent) list = list.filter((b) => brandsWithContent.has(b.id));
    if (az !== "ALL") list = list.filter((b) => b.az === az);
    if (brandQuery.trim()) {
      const q = brandQuery.trim().toLowerCase();
      list = list.filter((b) => b.name.toLowerCase().includes(q));
    }
    if (!isPro) list = list.filter((b) => isPopular(b.id));
    return list;
  }, [az, brandQuery, isPro, brandsWithContent]);

  const filtered = useMemo(() => {
    if (!all) return [];
    const list = all.filter((c) => {
      if (selectedBrands.size && !selectedBrands.has(c.brandId)) return false;
      if (categories.size && !categories.has(c.category)) return false;
      if (subs.size && !subs.has(c.subCategory)) return false;
      if (tiers.size && !tiers.has(c.tier)) return false;
      if (onlyShop && !c.isShop) return false;
      if (onlyAd && !c.isAd) return false;
      return true;
    });
    return sortContent(list, sort);
  }, [all, selectedBrands, categories, subs, tiers, onlyShop, onlyAd, sort]);

  useEffect(() => setVisible(PAGE), [selectedBrands, categories, subs, tiers, onlyShop, onlyAd, sort]);

  const activeCount =
    selectedBrands.size + categories.size + subs.size + tiers.size + (onlyShop ? 1 : 0) + (onlyAd ? 1 : 0);

  const clearAll = () => {
    setSelectedBrands(new Set());
    setCategories(new Set());
    setSubs(new Set());
    setTiers(new Set());
    setOnlyShop(false);
    setOnlyAd(false);
    setAz("ALL");
    setBrandQuery("");
  };

  const submitNewBrand = (name: string, handle?: string, hashtags?: string) => {
    setModalOpen(false);
    if (!name.trim()) return;
    // 서버 수집 큐에 실제 요청 등록 (수집 워커/cron가 처리)
    fetch("/api/brands/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brandName: name.trim(), handle, hashtags }),
    }).catch(() => {});
    const entry = { name: name.trim(), progress: 0 };
    setPendingBrands((p) => [...p, entry]);
    const id = setInterval(() => {
      setPendingBrands((prev) =>
        prev.map((b) => (b.name === entry.name ? { ...b, progress: Math.min(100, b.progress + 9) } : b)),
      );
    }, 600);
    setTimeout(() => clearInterval(id), 8000);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      {/* ===== 좌측 필터 패널 ===== */}
      <aside className={`${showFilters ? "block" : "hidden"} lg:block`}>
        <div className="kt-card sticky top-[68px] max-h-[calc(100vh-84px)] overflow-y-auto kt-thin-scroll p-3">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[13px] font-bold">필터</h2>
            {activeCount > 0 && (
              <button onClick={clearAll} className="text-[10px] font-semibold text-[var(--accent)] hover:underline">
                초기화 ({activeCount})
              </button>
            )}
          </div>

          {/* 콘텐츠 유형 */}
          <FilterGroup title="콘텐츠 유형">
            <div className="flex flex-wrap gap-1.5">
              <Toggle on={onlyShop} onClick={() => setOnlyShop((v) => !v)} label="🛒 TikTok Shop" />
              <Toggle on={onlyAd} onClick={() => setOnlyAd((v) => !v)} label="📢 광고(#ad)" />
            </div>
          </FilterGroup>

          {/* 카테고리 */}
          <FilterGroup title="카테고리">
            <div className="flex flex-col gap-1">
              {CATEGORIES.map((cat) => {
                const on = categories.has(cat.id);
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategories((s) => toggle(s, cat.id))}
                    className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] transition-colors ${
                      on ? "bg-[var(--accent-light)] font-semibold text-[var(--accent)]" : "hover:bg-slate-50"
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span className="flex-1">{cat.nameKo}</span>
                    {on && <Check size={12} />}
                  </button>
                );
              })}
            </div>
          </FilterGroup>

          {/* 세부 카테고리 */}
          <FilterGroup title="세부 카테고리">
            <div className="flex flex-wrap gap-1.5">
              {SUBCATEGORIES.map((sc) => {
                const on = subs.has(sc.id);
                return (
                  <button
                    key={sc.id}
                    onClick={() => setSubs((s) => toggle(s, sc.id))}
                    className={`rounded-md border px-2 py-1 text-[10px] font-semibold transition-colors ${
                      on
                        ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]"
                        : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]"
                    }`}
                  >
                    {sc.icon} {sc.nameKo}
                  </button>
                );
              })}
            </div>
          </FilterGroup>

          {/* 인플루언서 규모 */}
          <FilterGroup title="인플루언서 규모 (평균 조회수)">
            <div className="flex flex-wrap gap-1.5">
              {TIER_KEYS.map((t) => {
                const on = tiers.has(t);
                return (
                  <button
                    key={t}
                    onClick={() => setTiers((s) => toggle(s, t))}
                    className="rounded-md border px-2 py-1 text-[10px] font-semibold transition-colors"
                    style={
                      on
                        ? { borderColor: TIERS[t].color, color: TIERS[t].color, background: `${TIERS[t].color}14` }
                        : { borderColor: "var(--border)", color: "var(--muted)" }
                    }
                  >
                    {TIERS[t].label}
                  </button>
                );
              })}
            </div>
          </FilterGroup>

          {/* 브랜드 */}
          <FilterGroup title={isAdmin ? `브랜드 (${BRANDS.length})` : "브랜드"}>
            <div className="kt-noscrollbar mb-2 flex gap-1 overflow-x-auto pb-1">
              {["ALL", ...BRAND_AZ_KEYS].map((k) => (
                <button
                  key={k}
                  onClick={() => setAz(k)}
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold transition-colors ${
                    az === k ? "bg-[var(--accent)] text-white" : "text-[var(--muted)] hover:bg-slate-100"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>

            <div className="relative mb-2">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input
                value={brandQuery}
                onChange={(e) => setBrandQuery(e.target.value)}
                placeholder="브랜드 검색"
                className="w-full rounded-md border border-[var(--border)] py-1.5 pl-7 pr-2 text-[11px] outline-none focus:border-[var(--accent)]"
              />
            </div>

            {!isPro && (
              <p className="mb-2 rounded-md bg-amber-50 px-2 py-1.5 text-[9px] font-medium text-amber-700">
                Basic 플랜은 상위 브랜드만 노출됩니다. Pro 가입 시 전체 브랜드 해금.
              </p>
            )}

            <div className="flex max-h-[220px] flex-col gap-0.5 overflow-y-auto kt-thin-scroll">
              {visibleBrands.map((b) => {
                const on = selectedBrands.has(b.id);
                return (
                  <label
                    key={b.id}
                    className={`flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-[11px] transition-colors hover:bg-slate-50 ${
                      on ? "font-semibold text-[var(--accent)]" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => setSelectedBrands((s) => toggle(s, b.id))}
                      className="h-3 w-3 accent-[var(--accent)]"
                    />
                    <span className="flex-1 truncate">{b.name}</span>
                    <span className="text-[9px] text-[var(--muted)]">{b.videos}</span>
                  </label>
                );
              })}
              {visibleBrands.length === 0 && (
                <p className="px-1.5 py-2 text-[10px] text-[var(--muted)]">검색 결과 없음</p>
              )}
            </div>

            {pendingBrands.map((b) => (
              <div key={b.name} className="mt-1.5 rounded-md border border-dashed border-[var(--accent)] bg-[var(--accent-light)]/50 px-2 py-1.5">
                <div className="flex items-center justify-between text-[10px] font-semibold">
                  <span>{b.name}</span>
                  <span className="text-[var(--accent)]">{b.progress < 100 ? `학습 중 ${b.progress}%` : "✓ 완료"}</span>
                </div>
                <div className="mt-1 h-1 w-full overflow-hidden rounded bg-white">
                  <div className="h-full bg-[var(--accent)] transition-all" style={{ width: `${b.progress}%` }} />
                </div>
              </div>
            ))}

            <button
              onClick={() => (isPro ? setModalOpen(true) : null)}
              disabled={!isPro}
              className={`mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed py-2 text-[10px] font-bold transition-colors ${
                isPro
                  ? "border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-light)]"
                  : "cursor-not-allowed border-[var(--border)] text-[var(--muted)]"
              }`}
            >
              <Plus size={12} /> 신규 브랜드 추가 {!isPro && "(Pro 전용)"}
            </button>
          </FilterGroup>
        </div>
      </aside>

      {/* ===== 우측 콘텐츠 리스팅 ===== */}
      <section>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowFilters((v) => !v)}
            className="kt-btn kt-btn-outline px-3 py-1.5 text-[11px] lg:hidden"
          >
            <SlidersHorizontal size={13} /> 필터 {activeCount > 0 && `(${activeCount})`}
          </button>
          <div className="text-[12px] font-semibold">
            {all ? (
              activeCount > 0 ? (
                <><span className="text-[var(--accent)]">{filtered.length.toLocaleString()}</span>개 결과</>
              ) : (
                <span className="text-[var(--muted)]">콘텐츠 탐색</span>
              )
            ) : (
              "데이터 로딩 중…"
            )}
            {isAdmin && all && (
              <span className="ml-1 text-[var(--muted)]">/ 전체 {all.length.toLocaleString()}</span>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[10px] text-[var(--muted)]">정렬</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-md border border-[var(--border)] px-2 py-1.5 text-[11px] font-semibold outline-none focus:border-[var(--accent)]"
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {!all ? (
          <div className="flex flex-col items-center justify-center gap-2 py-24 text-[var(--muted)]">
            <Loader2 className="animate-spin" />
            <p className="text-[12px]">실제 틱톡 콘텐츠 11,703건을 불러오는 중…</p>
          </div>
        ) : filtered.length > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              {filtered.slice(0, visible).map((c) => (
                <ContentCard key={c.id} content={c} />
              ))}
            </div>
            {visible < filtered.length && (
              <div className="mt-6 text-center">
                <button
                  onClick={() => setVisible((v) => v + PAGE)}
                  className="kt-btn kt-btn-outline px-6 py-2.5 text-[12px]"
                >
                  더 보기 ({(filtered.length - visible).toLocaleString()}개 남음)
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="kt-card flex flex-col items-center justify-center gap-2 py-20 text-center">
            <Sparkles className="text-[var(--muted)]" />
            <p className="text-[13px] font-semibold">조건에 맞는 콘텐츠가 없습니다</p>
            <button onClick={clearAll} className="kt-btn kt-btn-primary px-4 py-1.5 text-[11px]">필터 초기화</button>
          </div>
        )}
      </section>

      {modalOpen && <NewBrandModal onClose={() => setModalOpen(false)} onSubmit={submitNewBrand} />}
    </div>
  );
}

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md border px-2 py-1 text-[10px] font-semibold transition-colors ${
        on
          ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]"
          : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]"
      }`}
    >
      {label}
    </button>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 border-t border-[var(--border)] pt-2.5 first:border-t-0 first:pt-0">
      <div className="mb-1.5 text-[11px] font-bold text-[var(--fg)]">{title}</div>
      {children}
    </div>
  );
}

function NewBrandModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (name: string, handle?: string, hashtags?: string) => void }) {
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [tags, setTags] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[15px] font-bold">신규 브랜드 추가</h3>
          <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--fg)]"><X size={18} /></button>
        </div>
        <p className="mb-4 text-[11px] leading-relaxed text-[var(--muted)]">
          제출 즉시 백엔드 수집 에이전트가 가동됩니다. 정확히 12시간의 자가 학습 후 전용 틱톡 콘텐츠
          분석 데이터가 해금됩니다. (데모에서는 빠르게 진행됩니다)
        </p>
        <div className="space-y-2.5">
          <Field label="브랜드명 (국문/영문)" value={name} onChange={setName} placeholder="예: Biodance / 바이오던스" />
          <Field label="공식 틱톡 핸들 (선택)" value={handle} onChange={setHandle} placeholder="@biodance.official" />
          <Field label="타겟 해시태그" value={tags} onChange={setTags} placeholder="#biodance #collagenmask" />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="kt-btn kt-btn-outline px-4 py-2 text-[12px]">취소</button>
          <button
            onClick={() => onSubmit(name, handle, tags)}
            disabled={!name.trim()}
            className="kt-btn kt-btn-primary px-4 py-2 text-[12px] disabled:opacity-40"
          >
            <Plus size={14} /> 학습 시작
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-[var(--border)] px-2.5 py-2 text-[12px] outline-none focus:border-[var(--accent)]"
      />
    </label>
  );
}
