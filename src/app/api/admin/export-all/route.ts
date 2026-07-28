import JSZip from "jszip";
import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";
import { LOGIC_SOURCE_MD, glovekEnvMd } from "@/lib/export-static";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// 통합 데이터 익스포트 — 운영 어드민 통합용 실데이터·스키마·문서를 ZIP 하나로.
// GET /api/admin/export-all  (관리자 세션 필요) → glovek_export_{YYYY-MM-DD}.zip
// 포함: 전 테이블 CSV(규칙 적용) + payload_schema.md + logic_source.md + glovek_ENV.md
//      + glovek_files_inventory.csv + schema.sql(인트로스펙션 DDL)

const KST_TZ = "Asia/Seoul";
const kst = (v: unknown): string => {
  if (v == null || v === "") return "";
  const d = new Date(typeof v === "number" || /^\d+$/.test(String(v)) ? Number(v) : String(v));
  return isNaN(d.getTime()) ? String(v) : d.toLocaleString("sv-SE", { timeZone: KST_TZ });
};
const cell = (v: unknown): string => {
  let s: string;
  if (v == null) s = "";
  else if (v instanceof Date) s = kst(v.toISOString());
  else if (typeof v === "object") s = JSON.stringify(v);
  else s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
// 행 배열(객체) → CSV. 헤더는 전 행 키의 합집합(BOM 포함).
function csvOf(rows: Record<string, unknown>[]): string {
  const keys: string[] = [];
  for (const r of rows) for (const k of Object.keys(r)) if (!keys.includes(k)) keys.push(k);
  const lines = [keys.join(","), ...rows.map((r) => keys.map((k) => cell(r[k])).join(","))];
  return "﻿" + lines.join("\r\n");
}

// payload jsonb 재귀 키 수집 → { path: { types, count, example } }
type SchemaAcc = Map<string, { types: Set<string>; count: number; example: string }>;
function walk(v: unknown, path: string, acc: SchemaAcc) {
  const t = Array.isArray(v) ? "array" : v === null ? "null" : typeof v;
  const e = acc.get(path) ?? { types: new Set<string>(), count: 0, example: "" };
  e.types.add(t);
  e.count += 1;
  if (!e.example && v != null && t !== "object" && t !== "array") e.example = String(v).slice(0, 80);
  acc.set(path, e);
  if (Array.isArray(v)) { for (const item of v.slice(0, 50)) walk(item, `${path}[]`, acc); }
  else if (v && typeof v === "object") {
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) walk(val, path ? `${path}.${k}` : k, acc);
  }
}

export async function GET() {
  if (!(await isAdminAuthed())) return new Response("unauthorized — /admin 로그인 후 이용", { status: 401 });
  if (!isConfigured()) return new Response("DB 미설정", { status: 503 });
  await ensureSchema();

  const zip = new JSZip();
  const q = async (text: string): Promise<Record<string, unknown>[]> => {
    try { return (await sql.query(text)).rows as Record<string, unknown>[]; }
    catch (e) { return [{ export_error: String(e).slice(0, 300) }]; }
  };
  const add = (name: string, rows: Record<string, unknown>[]) => zip.file(name, csvOf(rows));

  // ── 1) 테이블 CSV (규칙: 해시 제외, payments raw 축약, bid 마스킹, 크롤링 테이블 상한) ──
  add("users.csv", await q(`SELECT id,email,name,brand,role,plan,pro_until,referred_by,markets,created_at FROM users ORDER BY created_at DESC LIMIT 50000`));
  add("referrers.csv", await q(`SELECT code,login_id,name,created_at FROM referrers ORDER BY created_at ASC`));
  add("subscriptions.csv", await q(`SELECT user_id, CASE WHEN bid IS NULL THEN NULL ELSE left(bid,4)||'…'||right(bid,4) END AS bid_masked, plan,amount,status,next_charge_at,failures,period_days,created_at,updated_at FROM subscriptions`));
  add("mall_subscriptions.csv", await q(`SELECT user_id,track, CASE WHEN bid IS NULL THEN NULL ELSE left(bid,4)||'…'||right(bid,4) END AS bid_masked, amount,status,next_charge_at,failures,period_days,created_at,updated_at FROM mall_subscriptions`));
  add("orders.csv", await q(`SELECT order_id,user_id,plan,amount,charge_amount,goods_name,status,kind,period_days,tid,created_at FROM orders ORDER BY created_at DESC LIMIT 50000`));
  add("payments.csv", await q(`SELECT payment_id,order_id,amount, raw->>'resultCode' AS result_code, raw->>'resultMsg' AS result_msg, raw->>'status' AS pg_status, raw->>'paidAt' AS pg_paid_at, created_at FROM payments ORDER BY created_at DESC LIMIT 50000`));
  add("inquiries.csv", await q(`SELECT id,kind,user_email,payload::text AS payload_json,status,response,created_at,updated_at FROM inquiries ORDER BY created_at DESC LIMIT 50000`));
  add("consult_requests.csv", await q(`SELECT * FROM consult_requests ORDER BY created_at DESC LIMIT 50000`));
  add("consult_progress.csv", await q(`SELECT sid,fields::text AS fields_json,last_field,field_count,category,agreed,completed,ua,referrer,utm_source,utm_medium,utm_campaign,utm_content,utm_term,landing,created_at,updated_at FROM consult_progress ORDER BY updated_at DESC LIMIT 100000`));
  const onbRows = await q(`SELECT id,user_id,name,brand,contact,email,category,note,status,order_id,track,grade,recommended_track,countries,term,amount,phase,referral_code,dino_linked, payload::text AS payload_json, created_at,updated_at FROM onboarding_applications ORDER BY updated_at DESC LIMIT 10000`);
  add("onboarding_applications.csv", onbRows); // ★ payload 원형 포함
  const filesMeta = await q(`SELECT id,user_id,kind,product_index,filename,mime,size FROM onboarding_files ORDER BY created_at DESC LIMIT 100000`);
  add("onboarding_files.csv", filesMeta); // ★ data 제외 메타만
  add("promo_codes.csv", await q(`SELECT * FROM promo_codes`));
  add("promo_redemptions.csv", await q(`SELECT * FROM promo_redemptions ORDER BY created_at DESC LIMIT 50000`));
  add("utm_events.csv", await q(`SELECT * FROM utm_events ORDER BY created_at DESC LIMIT 100000`));
  add("brand_stats.csv", await q(`SELECT * FROM brand_stats ORDER BY total_views DESC`));
  add("brand_shop_stats.csv", await q(`SELECT * FROM brand_shop_stats ORDER BY est_gmv DESC`));
  add("brand_tracking.csv", await q(`SELECT * FROM brand_tracking ORDER BY brand_name ASC`));
  add("creators.csv", await q(`SELECT * FROM creators ORDER BY total_views DESC LIMIT 1000`));
  add("videos.csv", await q(`SELECT video_id,brand_name,handle,views,likes,comments,shares,is_ad,is_shop,posted_at,url,country,tier,product_ref,collected_at FROM videos WHERE collected_at > now() - interval '30 days' ORDER BY views DESC LIMIT 20000`));
  add("products.csv", await q(`SELECT * FROM products ORDER BY collected_at DESC LIMIT 50000`));
  add("collect_jobs.csv", await q(`SELECT * FROM collect_jobs ORDER BY created_at DESC LIMIT 100`));

  // ── 2) payload_schema.md — onboarding_applications.payload 재귀 키 문서화 ──
  const acc: SchemaAcc = new Map();
  let payloadCount = 0;
  for (const r of onbRows) {
    const txt = r.payload_json as string | null;
    if (!txt) continue;
    try { walk(JSON.parse(txt), "", acc); payloadCount += 1; } catch { /* skip broken */ }
  }
  const schemaLines = [
    "# payload_schema.md — onboarding_applications.payload 실제 구조",
    "",
    `분석 대상: ${payloadCount}건 (실데이터 재귀 스캔). 경로의 \`[]\`는 배열 요소.`,
    "",
    "| 키 경로 | 타입 | 등장 수 | 예시값 |",
    "|---|---|---|---|",
    ...[...acc.entries()]
      .filter(([p]) => p !== "")
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([p, e]) => `| \`${p}\` | ${[...e.types].join("/")} | ${e.count} | ${e.example ? cell(e.example) : ""} |`),
  ];
  zip.file("payload_schema.md", schemaLines.join("\n"));

  // ── 3·5) 문서 ──
  zip.file("logic_source.md", LOGIC_SOURCE_MD);
  zip.file("glovek_ENV.md", glovekEnvMd());

  // ── 4) 파일 인벤토리 (onboarding_files 메타와 동일 내용, 별도 파일명) ──
  zip.file("glovek_files_inventory.csv", csvOf(filesMeta));

  // ── 5) schema.sql — information_schema 인트로스펙션 DDL(서버리스에서 pg_dump 불가 대체) ──
  const cols = await q(`SELECT table_name, column_name, data_type, is_nullable, column_default
    FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name, ordinal_position`);
  const pks = await q(`SELECT tc.table_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema
    WHERE tc.table_schema='public' AND tc.constraint_type='PRIMARY KEY' ORDER BY tc.table_name, kcu.ordinal_position`);
  const pkMap = new Map<string, string[]>();
  for (const p of pks) {
    const t = String(p.table_name);
    pkMap.set(t, [...(pkMap.get(t) ?? []), String(p.column_name)]);
  }
  const byTable = new Map<string, Record<string, unknown>[]>();
  for (const c of cols) {
    const t = String(c.table_name);
    byTable.set(t, [...(byTable.get(t) ?? []), c]);
  }
  const ddl: string[] = ["-- schema.sql — information_schema 기반 DDL 근사본 (원본: src/lib/db.ts ensureSchema)", ""];
  for (const [t, tcols] of [...byTable.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    ddl.push(`CREATE TABLE ${t} (`);
    const lines = tcols.map((c) => `  ${c.column_name} ${c.data_type}${c.is_nullable === "NO" ? " NOT NULL" : ""}${c.column_default ? ` DEFAULT ${c.column_default}` : ""}`);
    const pk = pkMap.get(t);
    if (pk?.length) lines.push(`  PRIMARY KEY (${pk.join(", ")})`);
    ddl.push(lines.join(",\n"), ");", "");
  }
  zip.file("schema.sql", ddl.join("\n"));

  const stamp = new Date().toLocaleDateString("sv-SE", { timeZone: KST_TZ });
  const buf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="glovek_export_${stamp}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
