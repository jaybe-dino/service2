import { readFileSync } from "node:fs";
import { join } from "node:path";

// 글로벌 50 E-book — 온라인 열람 전용 (glovek.space/guidebook)
// 원문 HTML(ebook.html, src 내부 — 공개 URL 없음)에 보호층과 noindex를 주입해 서빙.
// 파일(PDF/HTML)로는 제공하지 않으며, robots disallow + AI 봇 미들웨어 403이 함께 적용됨.

export const runtime = "nodejs";
export const dynamic = "force-static";

const PROTECT = `
<meta name="robots" content="noindex, nofollow">
<style>
  body { -webkit-user-select: none; user-select: none; }
  @media print { body > * { display: none !important; } body::before { content: "이 문서는 온라인 열람 전용입니다 — glovek.space/guidebook"; font-size: 15px; } }
</style>
<script>
(function () {
  var block = function (e) { e.preventDefault(); };
  document.addEventListener("contextmenu", block);
  document.addEventListener("copy", block);
  document.addEventListener("cut", block);
  document.addEventListener("dragstart", block);
  document.addEventListener("keydown", function (e) {
    var k = (e.key || "").toLowerCase();
    if ((e.ctrlKey || e.metaKey) && ["p", "s", "c", "u"].indexOf(k) >= 0) e.preventDefault();
  });
})();
</script>`;

export async function GET() {
  // force-static: 빌드 시 1회 실행되어 결과가 정적 서빙됨 → 런타임 파일 의존 없음
  const html = readFileSync(join(process.cwd(), "src/app/guidebook/ebook.html"), "utf-8")
    .replace("</head>", PROTECT + "\n</head>");
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "x-robots-tag": "noindex, nofollow, noai, noimageai",
      "cache-control": "public, max-age=0, s-maxage=3600",
    },
  });
}
