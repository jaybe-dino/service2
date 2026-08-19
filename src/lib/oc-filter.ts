// oc_creators 필터 → 파라미터라이즈드 WHERE 절 빌더.
// 크리에이터 검색 API와 캠페인 수신자 확정에서 공통 사용.
// 주의: 이 데이터셋은 followers 가 전부 비어 있어 규모는 avg_views/total_views 로 판단한다.

export interface OcFilter {
  hasEmail?: boolean;         // 이메일 보유(발송 가능) 만
  minAvgViews?: number;
  maxAvgViews?: number;
  minTotalViews?: number;
  minVideos?: number;
  maxVideos?: number;
  brands?: string[];          // 브랜드 이력(카테고리 시그널) — 하나라도 포함
  region?: string;            // 지역 텍스트 부분일치
  contactStatus?: string;     // contact_status 정확일치
  search?: string;            // handle 부분일치
}

export interface WhereClause { where: string; params: unknown[] }

export function buildWhere(f: OcFilter): WhereClause {
  const cond: string[] = [];
  const params: unknown[] = [];
  const P = (v: unknown) => { params.push(v); return `$${params.length}`; };

  if (f.hasEmail) cond.push(`email IS NOT NULL AND email <> ''`);
  if (typeof f.minAvgViews === "number" && f.minAvgViews > 0) cond.push(`avg_views >= ${P(f.minAvgViews)}`);
  if (typeof f.maxAvgViews === "number" && f.maxAvgViews > 0) cond.push(`avg_views <= ${P(f.maxAvgViews)}`);
  if (typeof f.minTotalViews === "number" && f.minTotalViews > 0) cond.push(`total_views >= ${P(f.minTotalViews)}`);
  if (typeof f.minVideos === "number" && f.minVideos > 0) cond.push(`videos >= ${P(f.minVideos)}`);
  if (typeof f.maxVideos === "number" && f.maxVideos > 0) cond.push(`videos <= ${P(f.maxVideos)}`);
  if (f.region && f.region.trim()) cond.push(`region ILIKE ${P("%" + f.region.trim() + "%")}`);
  if (f.contactStatus && f.contactStatus.trim()) cond.push(`contact_status = ${P(f.contactStatus.trim())}`);
  if (f.search && f.search.trim()) cond.push(`handle ILIKE ${P("%" + f.search.trim() + "%")}`);

  const brands = (f.brands || []).map((b) => String(b || "").trim()).filter(Boolean).slice(0, 30);
  if (brands.length) {
    const ors = brands.map((b) => `brands ILIKE ${P("%" + b + "%")}`);
    cond.push(`(${ors.join(" OR ")})`);
  }

  const where = cond.length ? "WHERE " + cond.join(" AND ") : "";
  return { where, params };
}
