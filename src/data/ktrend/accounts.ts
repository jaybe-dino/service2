// 테스트용 데모 계정 (백엔드 없는 정적 사이트 — 클라이언트 데모 인증)
// ⚠️ 실서비스에서는 절대 이렇게 자격증명을 클라이언트에 두지 않습니다. 데모/QA 목적 한정.
import type { PlanId } from "./meta";

export interface Account {
  id: string;
  email: string;
  password: string;
  name: string;
  company: string;
  plan: PlanId;
}

export const DEMO_ACCOUNTS: Account[] = [
  {
    id: "enterprise-demo",
    email: "pro@ktrend.demo",
    password: "ktrend2026",
    name: "프로 테스터",
    company: "글로우랩 (Enterprise)",
    plan: "enterprise", // 유료 전체 활성
  },
  {
    id: "basic-demo",
    email: "basic@ktrend.demo",
    password: "ktrend2026",
    name: "베이직 테스터",
    company: "스타트업 코스메틱 (Basic)",
    plan: "basic", // 무료 — 지표 블러/상위 브랜드만
  },
];

export function findAccount(email: string, password: string): Account | null {
  const e = email.trim().toLowerCase();
  return (
    DEMO_ACCOUNTS.find((a) => a.email.toLowerCase() === e && a.password === password) ??
    null
  );
}
