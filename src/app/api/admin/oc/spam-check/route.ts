import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 발송 전 스팸 점검 — 규칙 기반 점수(0~100, 높을수록 위험) + 개선 항목.
// DB 불필요(순수 텍스트 분석). ComposeTab에서 캠페인 생성 전 호출.

const TRIGGER_WORDS = [
  // 영어 상용 스팸 트리거
  "free money", "100% free", "act now", "buy now", "click here", "limited time", "no cost",
  "risk-free", "winner", "guarantee", "cash bonus", "earn money", "make money", "urgent",
  "congratulations", "exclusive deal", "once in a lifetime", "double your", "$$$",
  // 한국어
  "무료 증정", "지금 바로 클릭", "100% 보장", "대박", "긴급", "마지막 기회", "파격 할인",
];

interface Issue { level: "high" | "mid" | "low"; msg: string; score: number }

export async function POST(req: Request) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { subject?: string; body?: string };
  const subject = String(b.subject || "");
  const body = String(b.body || "");
  const all = subject + "\n" + body;
  const lower = all.toLowerCase();
  const issues: Issue[] = [];

  // 트리거 단어
  const hits = TRIGGER_WORDS.filter((w) => lower.includes(w));
  if (hits.length) issues.push({ level: hits.length > 2 ? "high" : "mid", score: Math.min(30, hits.length * 10), msg: `스팸 트리거 표현 ${hits.length}개: ${hits.slice(0, 4).join(", ")}` });

  // 제목 품질
  if (!subject.trim()) issues.push({ level: "high", score: 15, msg: "제목이 비어 있음" });
  if (subject.length > 78) issues.push({ level: "low", score: 5, msg: `제목이 깁니다(${subject.length}자) — 50자 이내 권장` });
  const subjCaps = subject.replace(/[^A-Z]/g, "").length;
  const subjLetters = subject.replace(/[^A-Za-z]/g, "").length;
  if (subjLetters >= 8 && subjCaps / subjLetters > 0.5) issues.push({ level: "mid", score: 10, msg: "제목 대문자 과다(외침으로 인식)" });
  if ((subject.match(/[!?]{2,}|[!?].*[!?]/g) || []).length) issues.push({ level: "mid", score: 8, msg: "제목에 느낌표/물음표 과다" });
  if (/^(re|fwd):/i.test(subject.trim()) ) issues.push({ level: "mid", score: 10, msg: "가짜 Re:/Fwd: 제목 — 신뢰 훼손·스팸 신고 유발" });

  // 링크 밀도·단축 URL
  const links = all.match(/https?:\/\/[^\s<"']+/g) || [];
  if (links.length > 3) issues.push({ level: "mid", score: 10, msg: `링크 ${links.length}개 — 2개 이하 권장` });
  if (links.some((u) => /bit\.ly|tinyurl|t\.co|goo\.gl|is\.gd|buff\.ly/i.test(u))) issues.push({ level: "high", score: 15, msg: "단축 URL 사용 — 스팸 필터가 강하게 감점" });
  const textLen = body.replace(/https?:\/\/[^\s<"']+/g, "").replace(/<[^>]+>/g, "").length;
  if (links.length && textLen < 200) issues.push({ level: "mid", score: 8, msg: "본문 대비 링크 비중 높음 — 설명 텍스트 보강 권장" });

  // 개인화 (스팸 회피에 가장 효과적)
  const vars = body.match(/\{\{\s*[a-z_]+\s*\}\}/gi) || [];
  if (!vars.length) issues.push({ level: "mid", score: 12, msg: "개인화 변수 없음 — {{handle}} {{brands}} 등 수신자별 내용이 전달률을 크게 올립니다" });

  // 본문 길이·기타
  if (textLen < 120) issues.push({ level: "low", score: 5, msg: "본문이 짧음(120자 미만) — 맥락 있는 소개가 스팸 판정을 줄입니다" });
  if (/[\u{1F300}-\u{1FAFF}]/u.test(subject) && (subject.match(/[\u{1F300}-\u{1FAFF}]/gu) || []).length > 2) issues.push({ level: "low", score: 4, msg: "제목 이모지 과다" });

  const score = Math.min(100, issues.reduce((s, i) => s + i.score, 0));
  const grade = score < 15 ? "안전" : score < 35 ? "주의" : "위험";
  return NextResponse.json({
    score, grade,
    issues: issues.sort((a, b) => b.score - a.score).map(({ level, msg }) => ({ level, msg })),
    info: "발송 시 List-Unsubscribe(원클릭 수신거부) 헤더와 수신거부 링크는 자동 삽입됩니다.",
  });
}
