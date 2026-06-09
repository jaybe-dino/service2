"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, X, Check, Sparkles, Eye, DollarSign, Flame } from "lucide-react";
import { BRANDS, letterCounts, TOTAL_BRANDS } from "@/data/ktrend/brands";
import { CONTENT, formatCount, formatUsd } from "@/data/ktrend/content";
import {
  CATEGORIES,
  COUNTRIES,
  CONTENT_STYLES,
  TIERS,
  type CategoryKey,
  type ContentStyle,
  type InfluencerTier,
} from "@/data/ktrend/meta";
import ContentCard from "./ContentCard";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

export default function Explorer() {
  const [brandQuery, setBrandQuery] = useState("");
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [categories, setCategories] = useState<CategoryKey[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [styles, setStyles] = useState<ContentStyle[]>([]);
  const [tiers, setTiers] = useState<InfluencerTier[]>([]);
  const [mobileFilters, setMobileFilters] = useState(false);

  const counts = useMemo(letterCounts, []);

  const stats = useMemo(() => {
    let totalViews = 0;
    let totalRevenue = 0;
    let trending = 0;
    for (const c of CONTENT) {
      totalViews += c.views;
      totalRevenue += c.estRevenue;
      if (c.trending) trending++;
    }
    return { totalViews, totalRevenue, trending };
  }, []);

  const visibleBrands = useMemo(() => {
    return BRANDS.filter((brand) => {
      if (activeLetter && brand.letter !== activeLetter) return false;
      if (brandQuery) {
        const q = brandQuery.toLowerCase();
        if (!brand.name.toLowerCase().includes(q) && !brand.nameKo.includes(brandQuery)) return false;
      }
      return true;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [activeLetter, brandQuery]);

  const filtered = useMemo(() => {
    return CONTENT.filter((c) => {
      if (selectedBrands.length && !selectedBrands.includes(c.brandId)) return false;
      if (categories.length && !categories.includes(c.category)) return false;
      if (countries.length && !countries.includes(c.country)) return false;
      if (styles.length && !styles.includes(c.style)) return false;
      if (tiers.length && !tiers.includes(c.tier)) return false;
      return true;
    });
  }, [selectedBrands, categories, countries, styles, tiers]);

  const activeFilterCount =
    categories.length + countries.length + styles.length + tiers.length + selectedBrands.length;

  function clearAll() {
    setSelectedBrands([]);
    setCategories([]);
    setCountries([]);
    setStyles([]);
    setTiers([]);
    setActiveLetter(null);
    setBrandQuery("");
  }

  return (
    <div className="mx-auto max-w-[1800px] px-4 sm:px-6">
      {/* 그라데이션 히어로 */}
      <div className="relative my-5 overflow-hidden rounded-3xl bg-gradient-to-br from-rose-500 via-fuchsia-500 to-indigo-500 p-6 text-white shadow-lg sm:p-8">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/15 blur-2xl" />
        <div className="absolute -bottom-20 left-1/3 h-64 w-64 rounded-full bg-fuchsia-300/20 blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium ring-1 ring-white/25 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" /> 실시간 K-뷰티 틱톡 트렌드
          </span>
          <h1 className="mt-3 text-2xl font-bold leading-tight tracking-tight sm:text-4xl">
            글로벌 틱톡에서 바이럴 중인 K-뷰티 콘텐츠
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-white/85">
            {TOTAL_BRANDS}개 한국 코스메틱 브랜드 · 6개국 틱톡 샵 · 어필리에이트 성과를 한 화면에서 탐색하세요.
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <StatPill icon={<Sparkles className="h-4 w-4" />} value={`${TOTAL_BRANDS}+`} label="추적 브랜드" />
            <StatPill icon={<Eye className="h-4 w-4" />} value={formatCount(stats.totalViews)} label="누적 조회수" />
            <StatPill icon={<DollarSign className="h-4 w-4" />} value={formatUsd(stats.totalRevenue)} label="추정 기여매출" />
            <StatPill icon={<Flame className="h-4 w-4" />} value={`${stats.trending}`} label="바이럴 감지" />
          </div>
        </div>
      </div>

      <div className="flex gap-6 pb-12">
        {/* ===== 좌측 브랜드 사이드바 (데스크톱) ===== */}
        <aside className="hidden w-72 shrink-0 lg:block">
          <div className="sticky top-20 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">브랜드 필터</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                {selectedBrands.length}/{TOTAL_BRANDS}
              </span>
            </div>

            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={brandQuery}
                onChange={(e) => setBrandQuery(e.target.value)}
                placeholder="브랜드 검색…"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-rose-300 focus:bg-white"
              />
            </div>

            {/* A-Z 퀵 필터 */}
            <div className="mt-3 flex flex-wrap gap-1">
              <button
                onClick={() => setActiveLetter(null)}
                className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                  activeLetter === null ? "bg-rose-500 text-white" : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                전체
              </button>
              {ALPHABET.map((l) => {
                const has = counts[l] > 0;
                return (
                  <button
                    key={l}
                    disabled={!has}
                    onClick={() => setActiveLetter(activeLetter === l ? null : l)}
                    className={`h-6 w-6 rounded text-[11px] font-semibold transition ${
                      activeLetter === l
                        ? "bg-rose-500 text-white"
                        : has
                          ? "text-slate-600 hover:bg-slate-100"
                          : "cursor-not-allowed text-slate-300"
                    }`}
                  >
                    {l}
                  </button>
                );
              })}
            </div>

            {/* 브랜드 체크리스트 */}
            <div className="mt-3 max-h-[52vh] space-y-0.5 overflow-y-auto pr-1">
              {visibleBrands.map((brand) => {
                const checked = selectedBrands.includes(brand.id);
                return (
                  <label
                    key={brand.id}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-slate-50"
                  >
                    <span
                      className={`flex h-4 w-4 items-center justify-center rounded border ${
                        checked ? "border-rose-500 bg-rose-500" : "border-slate-300"
                      }`}
                    >
                      {checked && <Check className="h-3 w-3 text-white" />}
                    </span>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => setSelectedBrands((s) => toggle(s, brand.id))}
                      className="sr-only"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-slate-700">{brand.name}</span>
                      <span className="block truncate text-[11px] text-slate-400">{brand.nameKo}</span>
                    </span>
                  </label>
                );
              })}
              {visibleBrands.length === 0 && (
                <p className="px-2 py-4 text-center text-xs text-slate-400">검색 결과 없음</p>
              )}
            </div>
          </div>
        </aside>

        {/* ===== 우측 메인 영역 ===== */}
        <div className="min-w-0 flex-1">
          {/* 필터 바 */}
          <div className="mb-4 space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <FilterRow label="카테고리">
              {CATEGORIES.map((c) => (
                <Chip key={c.key} active={categories.includes(c.key)} onClick={() => setCategories((s) => toggle(s, c.key))}>
                  {c.emoji} {c.labelKo}
                </Chip>
              ))}
            </FilterRow>
            <FilterRow label="국가">
              {COUNTRIES.map((c) => (
                <Chip key={c.code} active={countries.includes(c.code)} onClick={() => setCountries((s) => toggle(s, c.code))}>
                  {c.flag} {c.nameKo}
                </Chip>
              ))}
            </FilterRow>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <FilterRow label="스타일" inline>
                {CONTENT_STYLES.map((s) => (
                  <Chip key={s.key} active={styles.includes(s.key)} onClick={() => setStyles((v) => toggle(v, s.key))}>
                    {s.labelKo}
                  </Chip>
                ))}
              </FilterRow>
              <FilterRow label="규모" inline>
                {TIERS.map((t) => (
                  <Chip key={t.key} active={tiers.includes(t.key)} onClick={() => setTiers((v) => toggle(v, t.key))}>
                    {t.labelKo}
                  </Chip>
                ))}
              </FilterRow>
            </div>
          </div>

          {/* 결과 헤더 */}
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              <span className="font-bold text-slate-900">{filtered.length}</span>개 콘텐츠
              {activeFilterCount > 0 && <span className="text-slate-400"> · 필터 {activeFilterCount}개 적용</span>}
            </p>
            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <button onClick={clearAll} className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-rose-600">
                  <X className="h-3.5 w-3.5" /> 초기화
                </button>
              )}
              <button
                onClick={() => setMobileFilters(true)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 lg:hidden"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" /> 브랜드
                {selectedBrands.length > 0 && (
                  <span className="rounded-full bg-rose-500 px-1.5 text-[10px] text-white">{selectedBrands.length}</span>
                )}
              </button>
            </div>
          </div>

          {/* 매소너리 그리드 */}
          {filtered.length > 0 ? (
            <div className="columns-2 gap-3 sm:columns-3 lg:columns-4 xl:columns-5 2xl:columns-6 [&>*]:break-inside-avoid">
              {filtered.map((item, i) => (
                <ContentCard key={item.id} item={item} index={i} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 py-20 text-center">
              <p className="text-sm text-slate-500">조건에 맞는 콘텐츠가 없습니다.</p>
              <button onClick={clearAll} className="mt-3 text-sm font-medium text-rose-600">필터 초기화</button>
            </div>
          )}
        </div>
      </div>

      {/* ===== 모바일 브랜드 필터 드로어 ===== */}
      {mobileFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileFilters(false)} />
          <div className="absolute inset-y-0 left-0 flex w-80 max-w-[85%] flex-col bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <h2 className="font-bold text-slate-900">브랜드 필터</h2>
              <button onClick={() => setMobileFilters(false)} className="p-1 text-slate-500">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={brandQuery}
                  onChange={(e) => setBrandQuery(e.target.value)}
                  placeholder="브랜드 검색…"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none"
                />
              </div>
            </div>
            <div className="flex-1 space-y-0.5 overflow-y-auto px-4 pb-4">
              {visibleBrands.map((brand) => {
                const checked = selectedBrands.includes(brand.id);
                return (
                  <label key={brand.id} className="flex items-center gap-2.5 rounded-lg px-2 py-2">
                    <span className={`flex h-5 w-5 items-center justify-center rounded border ${checked ? "border-rose-500 bg-rose-500" : "border-slate-300"}`}>
                      {checked && <Check className="h-3.5 w-3.5 text-white" />}
                    </span>
                    <input type="checkbox" checked={checked} onChange={() => setSelectedBrands((s) => toggle(s, brand.id))} className="sr-only" />
                    <span className="text-sm text-slate-700">{brand.name} <span className="text-slate-400">{brand.nameKo}</span></span>
                  </label>
                );
              })}
            </div>
            <div className="border-t border-slate-200 p-4">
              <button onClick={() => setMobileFilters(false)} className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white">
                {filtered.length}개 콘텐츠 보기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatPill({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl bg-white/15 px-3.5 py-2 ring-1 ring-white/20 backdrop-blur">
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20">{icon}</span>
      <div>
        <p className="text-base font-bold leading-none">{value}</p>
        <p className="mt-1 text-[11px] text-white/75">{label}</p>
      </div>
    </div>
  );
}

function FilterRow({ label, inline, children }: { label: string; inline?: boolean; children: React.ReactNode }) {
  return (
    <div className={inline ? "flex items-center gap-2" : "flex items-start gap-3"}>
      <span className="mt-1.5 w-12 shrink-0 text-xs font-semibold text-slate-400">{label}</span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "border-rose-500 bg-rose-500 text-white"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}
