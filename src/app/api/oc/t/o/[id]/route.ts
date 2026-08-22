import { sql, isConfigured, ensureSchema } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 오픈 추적 픽셀(공개) — 1x1 투명 GIF. 수신자가 메일을 열면 호출됨.
const GIF = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mid = Number(id);
  if (mid && isConfigured()) {
    try {
      await ensureSchema();
      await sql`UPDATE oc_messages SET open_count = open_count + 1, opened_at = COALESCE(opened_at, now()) WHERE id = ${mid}`;
    } catch { /* 추적 실패는 무시 */ }
  }
  return new Response(GIF, {
    status: 200,
    headers: { "Content-Type": "image/gif", "Cache-Control": "no-store, no-cache, must-revalidate, private", "Pragma": "no-cache" },
  });
}
