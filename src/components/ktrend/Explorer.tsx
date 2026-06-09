"use client";

import { useMemo, useState } from "react";
import { Search, Plus, X, Check, SlidersHorizontal, Sparkles } from "lucide-react";
import ContentCard from "./ContentCard";
import { usePlan } from "./PlanContext";
import { BRANDS, BRAND_AZ_KEYS } from "@/data/ktrend/brands";
import { INFLUENCER_MAP } from "@/data/ktrend/influencers";
import {
  CATEGORIES,
  CONTENT_STYLES,
  COUNTRIES,
  TIERS,
  type CategoryId,
  type ContentStyle,
  type CountryCode,
  type InfluencerTier,
} from "@/data/ktrend/meta";
import { CONTENT, SORTS, sortContent, type SortKey } from "@/data/ktrend/content";

function toggle<T>(set: Set<T>, v: T): Set<T> {
  const next = new Set(set);
  if (next.has(v)) next.delete(v);
  else next.add(v);
  return next;
}

const TIER_KEYS = Object.keys(TIERS) as InfluencerTier[];

export default function Explorer({
  initialBrand,
  initialInfluencer,
}: {
  initialBrand?: string;
  initialInfluencer?: string;
}) {
  const { isPro } = usePlan();

  const [az, setAz] = useState<string>("ALL");
  const [brandQuery, setBrandQuery] = useState("");
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(
    new Set(initialBrand ? [initialBrand] : []),
  );
  const [categories, setCategories] = useState<Set<CategoryId>>(new Set());
  const [countries, setCountries] = useState<Set<CountryCode>>(new Set());
  const [styles, setStyles] = useState<Set<ContentStyle>>(new Set());
  const [tiers, setTiers] = useState<Set<InfluencerTier>>(new Set());
  const [influencer] = useState<string | null>(initialInfluencer ?? null);
  const [sort, setSort] = useState<SortKey>("viral");
  const [showFilters, setShowFilters] = useState(false);

  // 신규 브랜드 추가 모달
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingBrands, setPendingBrands] = useState<{ name: string; progress: number }[]>([]);

  // 좌측 브랜드 리스트 (A-Z + 검색 + Basic 상위 제한)
  const visibleBrands = useMemo(() => {
    let list = BRANDS;
    if (az !== "ALL") list = list.filter((b) => b.az === az);
    if (brandQuery.trim()) {
      const q = brandQuery.trim().toLowerCase();
      list = list.filter(
        (b) => b.nameEn.toLowerCase().includes(q) || b.nameKo.includes(q),
      );
    }
    if (!isPro) list = list.filter((b) => b.popular); // Basic: 상위 브랜드만
    return list;
  }, [az, brandQuery, isPro]);

  // 콘텐츠 필터링
  const filtered = useMemo(() => {
    const list = CONTENT.filter((c) => {
      if (selectedBrands.size && !selectedBrands.has(c.brandId)) return false;
      if (categories.size && !categories.has(c.category)) return false;
      if (countries.size && !countries.has(c.country)) return false;
      if (styles.size && !styles.has(c.style)) return false;
      if (influencer && c.influencerId !== influencer) return false;
      if (tiers.size) {
        const t = INFLUENCER_MAP[c.influencerId].tier;
        if (!tiers.has(t)) return false;
      }
      return true;
    });
    return sortContent(list, sort);
  }, [selectedBrands, categories, countries, styles, tiers, influencer, sort]);

  const activeCount =
    selectedBrands.size +
    categories.size +
    countries.size +
    styles.size +
    tiers.size +
    (influencer ? 1 : 0);

  const clearAll = () => {
    setSelectedBrands(new Set());
    setCategories(new Set());
    setCountries(new Set());
    setStyles(new Set());
    setTiers(new Set());
    setAz("ALL");
    setBrandQuery("");
  };

  const submitNewBrand = (name: string) => {
    setModalOpen(false);
    if (!name.trim()) return;
    const entry = { name: name.trim(), progress: 0 };
    setPendingBrands((p) => [...p, entry]);
    // 12시간 자가 학습 시뮬레이션 (데모: 빠른 진행)
    const id = setInterval(() => {
      setPendingBrands((prev) =>
        prev.map((b) =>
          b.name === entry.name
            ? { ...b, progress: Math.min(100, b.progress + 9) }
            : b,
        ),
      );
    }, 600);
    setTimeout(() => clearInterval(id), 8000);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      {/* ===== 좌측 필터 패널 ===== */}
      <aside
        className={`${showFilters ? "block" : "hidden"} lg:block`}
      >
        <div className="kt-card sticky top-[68px] max-h-[calc(100vh-84px)] overflow-y-auto kt-thin-scroll p-3">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[13px] font-bold">필터</h2>
            {activeCount > 0 && (
              <button
                onClick={clearAll}
                className="text-[10px] font-semibold text-[var(--accent)] hover:underline"
              >
                초기화 ({activeCount})
              </button>
            )}
          </div>

          {/* 국가 (미국 중심 6개국) */}
          <FilterGroup title="국가">
            <div className="flex flex-wrap gap-1.5">
              {COUNTRIES.map((c) => {
                const on = countries.has(c.code);
                return (
                  <button
                    key={c.code}
                    onClick={() => setCountries((s) => toggle(s, c.code))}
                    className={`rounded-md border px-2 py-1 text-[10px] font-semibold transition-colors ${
                      on
                        ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]"
                        : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]"
                    }`}
                  >
                    {c.flag} {c.nameKo}
                  </button>
                );
              })}
            </div>
          </FilterGroup>

          {/* 카테고리 (코스메틱 중심) */}
          <FilterGroup title="카테고리 (코스메틱)">
            <div className="flex flex-col gap-1">
              {CATEGORIES.map((cat) => {
                const on = categories.has(cat.id);
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategories((s) => toggle(s, cat.id))}
                    className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] transition-colors ${
                      on
                        ? "bg-[var(--accent-light)] font-semibold text-[var(--accent)]"
                        : "hover:bg-slate-50"
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

          {/* 콘텐츠 스타일 */}
          <FilterGroup title="콘텐츠 스타일">
            <div className="flex flex-wrap gap-1.5">
              {CONTENT_STYLES.map((s) => {
                const on = styles.has(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => setStyles((set) => toggle(set, s.id))}
                    className={`rounded-md border px-2 py-1 text-[10px] font-semibold transition-colors ${
                      on
                        ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]"
                        : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]"
                    }`}
                  >
                    {s.nameKo}
                  </button>
                );
              })}
            </div>
          </FilterGroup>

          {/* 인플루언서 규모 */}
          <FilterGroup title="인플루언서 규모">
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

          {/* 브랜드 (A-Z 퀵 탭 + 검색 + 체크리스트) */}
          <FilterGroup title={`브랜드 (${BRANDS.length})`}>
            {/* A-Z 퀵 탭 */}
            <div className="kt-noscrollbar mb-2 flex gap-1 overflow-x-auto pb-1">
              {["ALL", ...BRAND_AZ_KEYS].map((k) => (
                <button
                  key={k}
                  onClick={() => setAz(k)}
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold transition-colors ${
                    az === k
                      ? "bg-[var(--accent)] text-white"
                      : "text-[var(--muted)] hover:bg-slate-100"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>

            {/* 검색 */}
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
                Basic 플랜은 상위 브랜드만 노출됩니다. Pro 가입 시 110개 전체 해금.
              </p>
            )}

            {/* 체크리스트 */}
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
                    <span className="flex-1 truncate">{b.nameEn}</span>
                    <span className="text-[9px] text-[var(--muted)]">{b.nameKo}</span>
                  </label>
                );
              })}
              {visibleBrands.length === 0 && (
                <p className="px-1.5 py-2 text-[10px] text-[var(--muted)]">검색 결과 없음</p>
              )}
            </div>

            {/* 학습 대기 중 브랜드 */}
            {pendingBrands.map((b) => (
              <div key={b.name} className="mt-1.5 rounded-md border border-dashed border-[var(--accent)] bg-[var(--accent-light)]/50 px-2 py-1.5">
                <div className="flex items-center justify-between text-[10px] font-semibold">
                  <span>{b.name}</span>
                  <span className="text-[var(--accent)]">
                    {b.progress < 100 ? `학습 중 ${b.progress}%` : "✓ 완료"}
                  </span>
                </div>
                <div className="mt-1 h-1 w-full overflow-hidden rounded bg-white">
                  <div className="h-full bg-[var(--accent)] transition-all" style={{ width: `${b.progress}%` }} />
                </div>
              </div>
            ))}

            {/* 신규 브랜드 추가 (유료 전용) */}
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
        {/* 결과 헤더 + 정렬 */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowFilters((v) => !v)}
            className="kt-btn kt-btn-outline px-3 py-1.5 text-[11px] lg:hidden"
          >
            <SlidersHorizontal size={13} /> 필터 {activeCount > 0 && `(${activeCount})`}
          </button>
          <div className="text-[12px] font-semibold">
            <span className="text-[var(--accent)]">{filtered.length}</span>개 콘텐츠
            <span className="ml-1 text-[var(--muted)]">/ 전체 {CONTENT.length}</span>
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

        {/* 4열 콤팩트 그리드 (반응형: 1→2→3→4) */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {filtered.map((c) => (
              <ContentCard key={c.id} content={c} />
            ))}
          </div>
        ) : (
          <div className="kt-card flex flex-col items-center justify-center gap-2 py-20 text-center">
            <Sparkles className="text-[var(--muted)]" />
            <p className="text-[13px] font-semibold">조건에 맞는 콘텐츠가 없습니다</p>
            <button onClick={clearAll} className="kt-btn kt-btn-primary px-4 py-1.5 text-[11px]">
              필터 초기화
            </button>
          </div>
        )}
      </section>

      {/* ===== 신규 브랜드 추가 모달 ===== */}
      {modalOpen && (
        <NewBrandModal onClose={() => setModalOpen(false)} onSubmit={submitNewBrand} />
      )}
    </div>
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

function NewBrandModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [tags, setTags] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[15px] font-bold">신규 브랜드 추가</h3>
          <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--fg)]">
            <X size={18} />
          </button>
        </div>
        <p className="mb-4 text-[11px] leading-relaxed text-[var(--muted)]">
          제출 즉시 백엔드 수집 에이전트가 가동됩니다. 정확히 12시간의 AI 자가 학습 후
          전용 틱톡 콘텐츠 분석 데이터가 해금됩니다. (데모에서는 빠르게 진행됩니다)
        </p>
        <div className="space-y-2.5">
          <Field label="브랜드명 (국문/영문)" value={name} onChange={setName} placeholder="예: Biodance / 바이오던스" />
          <Field label="공식 틱톡 핸들 (선택)" value={handle} onChange={setHandle} placeholder="@biodance.official" />
          <Field label="타겟 해시태그" value={tags} onChange={setTags} placeholder="#biodance #collagenmask" />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="kt-btn kt-btn-outline px-4 py-2 text-[12px]">취소</button>
          <button
            onClick={() => onSubmit(name)}
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

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
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
