import { NextResponse } from "next/server";
import crypto from "crypto";
import { sql, ensureSchema, isConfigured as dbConfigured } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX = 4 * 1024 * 1024; // 4MB (Vercel 함수 본문 한도 고려)
const OK_MIME = ["application/pdf", "image/jpeg", "image/png"];

// 온보딩 제출 파일 업로드 (사업자등록증 / 제품 인증서류). DB에 base64로 보관.
export async function POST(req: Request) {
  if (!dbConfigured()) return NextResponse.json({ ok: false, error: "DB 미설정" }, { status: 503 });
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });

  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ ok: false, error: "잘못된 요청" }, { status: 400 }); }
  const file = form.get("file");
  const kind = String(form.get("kind") ?? "");
  const productIndex = form.get("productIndex") != null ? Number(form.get("productIndex")) : null;
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "파일이 없습니다." }, { status: 400 });
  if (!["biz_reg", "product_cert"].includes(kind)) return NextResponse.json({ ok: false, error: "잘못된 종류" }, { status: 400 });
  if (!OK_MIME.includes(file.type)) return NextResponse.json({ ok: false, error: "PDF·JPG·PNG만 업로드할 수 있습니다." }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ ok: false, error: "파일은 최대 4MB까지 업로드할 수 있습니다." }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  const data = buf.toString("base64");
  const id = `onbf_${crypto.randomUUID()}`;
  await ensureSchema();
  await sql`INSERT INTO onboarding_files (id, user_id, kind, product_index, filename, mime, size, data)
            VALUES (${id}, ${me.id}, ${kind}, ${productIndex}, ${file.name.slice(0, 200)}, ${file.type}, ${file.size}, ${data})`;
  return NextResponse.json({ ok: true, id, filename: file.name, mime: file.type, size: file.size });
}
