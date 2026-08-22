import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { isConfigured } from "@/lib/db";
import { promises as dns } from "node:dns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 도메인 인증(SPF/DKIM/DMARC) 점검 — 배포 서버에서 DNS 조회. 스팸함 방지 진단.
async function txt(name: string): Promise<string[]> {
  try { return (await dns.resolveTxt(name)).map((chunks) => chunks.join("")); } catch { return []; }
}

export async function GET(req: Request) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });

  const domain = (new URL(req.url).searchParams.get("domain") || "glovek.space").trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");

  const [root, dmarc, dkimGoogle] = await Promise.all([
    txt(domain),
    txt(`_dmarc.${domain}`),
    txt(`google._domainkey.${domain}`),
  ]);

  const spf = root.find((r) => /v=spf1/i.test(r)) || "";
  const dmarcRec = dmarc.find((r) => /v=DMARC1/i.test(r)) || "";
  const dkim = dkimGoogle.find((r) => /v=DKIM1|p=/i.test(r)) || "";

  const spfIncludesGoogle = /include:_spf\.google\.com|include:.*google/i.test(spf);
  return NextResponse.json({
    domain,
    spf: { found: !!spf, value: spf, google: spfIncludesGoogle },
    dkim: { found: !!dkim, selector: "google", value: dkim.slice(0, 80) + (dkim.length > 80 ? "…" : "") },
    dmarc: { found: !!dmarcRec, value: dmarcRec },
    ok: !!spf && !!dkim && !!dmarcRec,
  });
}
