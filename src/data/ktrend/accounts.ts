// 테스트용 데모 계정 + 회원가입 멤버 저장 (백엔드 없는 정적 사이트 — 클라이언트 데모 인증)
import type { PlanId } from "./meta";

export interface Account {
  id: string;
  email: string;
  password: string;
  name: string;
  company: string;
  plan: PlanId;
  brand?: string;
  role?: string;
  isMember?: boolean;
  proUntil?: number; // 체험/유료 만료 타임스탬프(ms)
}

export const DEMO_ACCOUNTS: Account[] = [
  { id: "enterprise-demo", email: "pro@ktrend.demo", password: "ktrend2026", name: "프로 테스터", company: "글로우랩 (Enterprise)", plan: "enterprise" },
  { id: "basic-demo", email: "basic@ktrend.demo", password: "ktrend2026", name: "베이직 테스터", company: "스타트업 코스메틱 (Basic)", plan: "basic" },
  { id: "admin-demo", email: "admin@ktrend.demo", password: "ktrend2026", name: "관리자", company: "K-Trend Analytics", plan: "enterprise" },
];

export const ADMIN_EMAILS = ["admin@ktrend.demo", "jbheo91@gmail.com", "jaybe@dinostudio.kr"];

const MEMBERS_KEY = "ktrend.members";

export function loadMembers(): Account[] {
  try {
    const raw = localStorage.getItem(MEMBERS_KEY);
    return raw ? (JSON.parse(raw) as Account[]) : [];
  } catch {
    return [];
  }
}

export function saveMembers(list: Account[]) {
  try {
    localStorage.setItem(MEMBERS_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export function findAccount(email: string, password: string): Account | null {
  const e = email.trim().toLowerCase();
  const demo = DEMO_ACCOUNTS.find((a) => a.email.toLowerCase() === e && a.password === password);
  if (demo) return demo;
  return loadMembers().find((a) => a.email.toLowerCase() === e && a.password === password) ?? null;
}

export function findById(id: string): Account | null {
  return DEMO_ACCOUNTS.find((a) => a.id === id) ?? loadMembers().find((a) => a.id === id) ?? null;
}

export function emailDomain(email: string): string {
  return email.split("@")[1]?.toLowerCase() ?? "";
}
