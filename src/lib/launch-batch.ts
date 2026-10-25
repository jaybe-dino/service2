import crypto from "crypto";
import { sql } from "./db";
import { sessionSecret } from "./session-secret";

// 글로벌 진출 배치 1기(start.glovek.space) 전용 신청 저장소.
// ⚠️ 기존 inquiries/consult_requests/admin-ingest와 완전히 분리된 전용 테이블·로직.
//    외부 전달(Slack/leadhook/CRM/메일) 없음 — DB 적재 + 전용 관리자 조회만.

/* ── 상품 고정값(기존 landing 정본과 동일) ── */
// 권역당: 정가 300만 → 10월 50% 할인 공급가 150만(부가세 별도) / VAT 포함 165만.
export const UNIT_SUPPLY = 1_500_000; // 할인 공급가(ex-VAT)
export const UNIT_INCL = 1_650_000; // VAT 포함

// 3권역(미국 / 일본 / 동남아 5개국 묶음)
export const REGIONS = ["미국", "일본", "동남아"] as const;
export type Region = (typeof REGIONS)[number];
export const SEA_COUNTRIES = ["태국", "베트남", "필리핀", "말레이시아", "싱가포르"] as const;
export type SeaCountry = (typeof SEA_COUNTRIES)[number];

// 신청 처리 상태 enum (관리자용)
export const STATUSES = ["new", "contacting", "selected", "onboarding", "done", "hold"] as const;
export type Status = (typeof STATUSES)[number];
export const STATUS_LABEL: Record<Status, string> = {
  new: "신규",
  contacting: "연락중",
  selected: "선정",
  onboarding: "온보딩",
  done: "완료",
  hold: "보류",
};

// 개인정보 수집·이용 동의 버전(동의 문구가 바뀌면 +1). 저장 시 동의 시각과 함께 기록.
export const CONSENT_VERSION = "2026-10-26";

/* ── 서버 비용 산정(클라이언트 금액 신뢰하지 않음) ── */
export function computeCost(regionCount: number): { supply: number; incl: number } {
  const n = Math.max(0, regionCount | 0);
  return { supply: UNIT_SUPPLY * n, incl: UNIT_INCL * n };
}

/* ── IP 해시(원문 저장 금지, 시크릿 솔트 적용) — 속도제한/중복 식별용 ── */
export function hashIp(ip: string): string {
  return crypto
    .createHash("sha256")
    .update("glovek-lb-ip:" + sessionSecret() + ":" + ip)
    .digest("hex")
    .slice(0, 32);
}

/* ── 입력 검증 결과 ── */
export interface CleanApplication {
  brand: string;
  manager: string;
  email: string;
  productUrl: string | null;
  regions: Region[];
  seaCountries: SeaCountry[];
  message: string | null;
  regionCount: number;
  costSupply: number;
  costIncl: number;
  isTest: boolean;
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const URL_RE = /^https?:\/\/\S+$/i;

/**
 * 서버측 검증 — enums/타입/길이/이메일/URL. 통과 시 서버 산정 비용까지 포함해 반환.
 * 실패 시 { error } 반환. (XSS는 저장 후 렌더 단계에서 React가 자동 이스케이프)
 */
export function validateApplication(raw: Record<string, unknown>):
  | { ok: true; data: CleanApplication }
  | { ok: false; error: string } {
  const s = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

  const brand = s(raw.brand, 120);
  const manager = s(raw.manager, 80);
  const email = s(raw.email, 160).toLowerCase();
  const productRaw = s(raw.product, 400);
  const message = s(raw.message, 2000);

  if (!brand) return { ok: false, error: "브랜드명을 입력해 주세요." };
  if (!manager) return { ok: false, error: "담당자 이름을 입력해 주세요." };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "이메일 형식을 확인해 주세요." };
  if (productRaw && !URL_RE.test(productRaw)) return { ok: false, error: "제품 URL은 http(s):// 형식이어야 합니다." };

  // 권역 — enum만 허용, 중복 제거, 1개 이상
  const regionsIn = Array.isArray(raw.regions) ? raw.regions : [];
  const regions = REGIONS.filter((r) => regionsIn.includes(r));
  if (regions.length === 0) return { ok: false, error: "희망 권역을 1개 이상 선택해 주세요." };

  // 동남아 선택 시 하위 국가 1개 이상
  const seaIn = Array.isArray(raw.seaCountries) ? raw.seaCountries : [];
  const seaCountries = regions.includes("동남아") ? SEA_COUNTRIES.filter((c) => seaIn.includes(c)) : [];
  if (regions.includes("동남아") && seaCountries.length === 0) {
    return { ok: false, error: "동남아 진출 국가를 1개 이상 선택해 주세요." };
  }

  const regionCount = regions.length;
  const { supply, incl } = computeCost(regionCount);

  // QA 테스트 식별: example.com 이메일 또는 'TEST' 접두 브랜드는 실적 집계 제외용으로 표시.
  const isTest = email.endsWith("@example.com") || /^test\b/i.test(brand);

  return {
    ok: true,
    data: {
      brand,
      manager,
      email,
      productUrl: productRaw || null,
      regions: regions as Region[],
      seaCountries: seaCountries as SeaCountry[],
      message: message || null,
      regionCount,
      costSupply: supply,
      costIncl: incl,
      isTest,
    },
  };
}

/* ── 전용 최소 DDL(기존 ensureSchema의 수백 쿼리와 분리, 자체 1회 가드) ── */
let tableReady: Promise<void> | null = null;
export function ensureLaunchBatchTable(): Promise<void> {
  if (!tableReady) {
    tableReady = (async () => {
      await sql`CREATE TABLE IF NOT EXISTS launch_batch_applications (
        id serial PRIMARY KEY,
        request_id uuid UNIQUE,
        payload_hash text,
        brand text NOT NULL,
        manager text NOT NULL,
        email text NOT NULL,
        product_url text,
        regions jsonb NOT NULL,
        sea_countries jsonb NOT NULL DEFAULT '[]'::jsonb,
        message text,
        region_count integer NOT NULL,
        cost_supply integer NOT NULL,
        cost_incl integer NOT NULL,
        consent boolean NOT NULL DEFAULT false,
        consent_version text,
        consent_at timestamptz,
        is_test boolean NOT NULL DEFAULT false,
        status text NOT NULL DEFAULT 'new',
        admin_note text,
        ip_hash text,
        user_agent text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`;
      await sql`CREATE INDEX IF NOT EXISTS launch_batch_created_idx ON launch_batch_applications (created_at DESC)`;
    })().catch((e) => {
      tableReady = null; // 실패 시 다음 요청에서 재시도
      throw e;
    });
  }
  return tableReady;
}

// 접수번호 포맷(공개 안전 — 신청자 식별 정보 없음)
export function receiptNo(id: number): string {
  return "LB-" + String(id).padStart(4, "0");
}
