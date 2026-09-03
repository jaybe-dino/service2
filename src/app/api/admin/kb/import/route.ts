import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { sql, isConfigured, ensureSchema } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// K-Beauty 대용량 CSV 적재 API — UPLOAD_SPEC.md의 검증·업서트 규칙 구현.
// (원 스펙의 5MB 청크 PUT은 서버리스 바디 한도 4.5MB·무디스크 제약과 상충 →
//  브라우저에서 gunzip+CSV 파싱 후 행 배열을 1,000행 단위 JSON으로 POST하는 방식.
//  업서트는 PK 기준 멱등이라 같은 파일 재전송도 안전.)

const REGIONS = new Set(["US", "TH", "VN"]);
const SHOP_TIERS = new Set(["T1", "T2", "T3", "T4", "T5"]);
const MAP_TIERS = new Set(["M1", "M3", "M4", "M5"]);

type ColType = "text" | "num" | "ts";
interface DatasetSpec {
  table: string;
  pk: string[];
  // CSV 헤더명 → [DB 컬럼명, 타입]
  cols: Record<string, [string, ColType]>;
  required: string[]; // CSV 헤더명 기준
}

const SPECS: Record<string, DatasetSpec> = {
  shops: {
    table: "kb_shops", pk: ["seller_id"], required: ["seller_id", "region", "shop_name", "tier"],
    cols: {
      tier: ["tier", "text"], tier_name: ["tier_name", "text"], region: ["region", "text"],
      seller_id: ["seller_id", "text"], shop_name: ["shop_name", "text"], brand_en: ["brand_en", "text"],
      brand_ko: ["brand_ko", "text"], brand_count: ["brand_count", "num"], creator_pool: ["creator_pool", "num"],
      gmv_local_30d: ["gmv_local_30d", "num"], currency: ["currency", "text"], gmv_usd_30d: ["gmv_usd_30d", "num"],
      sold_30d: ["sold_30d", "num"], avg_price_local: ["avg_price_local", "num"], gmv_growth: ["gmv_growth", "num"],
      new_items: ["new_items", "num"], seller_type: ["seller_type", "text"], match_reason: ["match_reason", "text"],
      top_items: ["top_items", "text"],
    },
  },
  creators: {
    table: "kb_creators", pk: ["creator_uid"], required: ["creator_uid", "mapping_tier"],
    cols: {
      creator_uid: ["creator_uid", "text"], handle: ["handle", "text"], nickname: ["nickname", "text"],
      region: ["region", "text"], followers: ["followers", "num"], mapping_tier: ["mapping_tier", "text"],
      tier_desc: ["tier_desc", "text"], email: ["email", "text"], instagram_id: ["instagram_id", "text"],
      youtube_channel: ["youtube_channel", "text"], bio_link: ["bio_link", "text"],
      messaging_platforms: ["messaging_platforms", "text"], contact_channels: ["contact_channels", "text"],
      kb_videos: ["kb_videos", "num"], kb_brands_count: ["kb_brands_count", "num"], kb_brands: ["kb_brands", "text"],
      kb_products_count: ["kb_products_count", "num"], kb_video_gmv_usd: ["kb_video_gmv_usd", "num"],
      kb_plays: ["kb_plays", "num"], kb_rpm_usd: ["kb_rpm_usd", "num"], aff_sold_90d: ["aff_sold_90d", "num"],
      aff_gmv_local: ["aff_gmv_local", "num"], aff_video_count: ["aff_video_count", "num"],
      aff_live_rooms: ["aff_live_rooms", "num"], aff_avg_plays: ["aff_avg_plays", "num"], tiktok_url: ["tiktok_url", "text"],
    },
  },
  brand_videos: {
    table: "kb_brand_videos", pk: ["video_id", "item_id"], required: ["video_id", "kb_item_id", "kb_brand", "region"],
    cols: {
      video_id: ["video_id", "text"], kb_brand: ["brand_en", "text"], kb_item_id: ["item_id", "text"],
      region: ["region", "text"], creator_uid: ["creator_uid", "text"], creator_handle: ["creator_handle", "text"],
      creator_name: ["creator_name", "text"], followers: ["followers", "num"], plays: ["plays", "num"],
      likes: ["likes", "num"], comments: ["comments", "num"], shares: ["shares", "num"], sold: ["sold", "num"],
      gmv_local: ["gmv_local", "num"], gmv_usd: ["gmv_usd", "num"], rpm: ["rpm", "num"],
      conv_rate: ["conv_rate", "num"], duration_sec: ["duration_sec", "num"], created: ["created_at", "ts"],
      caption: ["caption", "text"], video_url: ["video_url", "text"],
    },
  },
  category_videos: {
    table: "kb_category_videos", pk: ["video_id"], required: ["video_id", "region"],
    cols: {
      video_id: ["video_id", "text"], region: ["region", "text"], creator_uid: ["creator_uid", "text"],
      creator_handle: ["creator_handle", "text"], creator_nickname: ["creator_nickname", "text"],
      followers: ["followers", "num"], item_id: ["item_id", "text"], item_name: ["item_name", "text"],
      price_usd: ["price_usd", "num"], video_gmv_usd: ["video_gmv_usd", "num"], video_sold: ["video_sold", "num"],
      plays: ["plays", "num"], engage_rate: ["engage_rate", "num"], rpm_local: ["rpm_local", "num"],
      duration_sec: ["duration_sec", "num"], created_at: ["created_at", "ts"], caption: ["caption", "text"],
      video_url: ["video_url", "text"],
    },
  },
  hashtag_creators: {
    table: "kb_hashtag_creators", pk: ["creator_uid"], required: ["creator_uid"],
    cols: {
      creator_uid: ["creator_uid", "text"], author_name: ["author_name", "text"], region: ["region", "text"],
      followers: ["followers", "num"], likes: ["likes", "num"], video_count: ["video_count", "num"],
      related_videos: ["related_videos", "num"], categories: ["categories", "text"],
      src_hashtag: ["src_hashtag", "text"], src_region: ["src_region", "text"],
      in_affiliate_db: ["in_affiliate_db", "text"], contact_status: ["contact_status", "text"],
      tiktok_url: ["tiktok_url", "text"],
    },
  },
};

const TS_RE = /^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2})?)?/;

interface RejectRow { row: number; column: string; value: string; message: string }

// 타임스탬프 관용 파싱: ISO/일반 포맷·epoch(초/밀리초)·Date 파싱 가능값 → ISO 문자열, 실패 시 null.
function parseTs(v: string): string | null {
  if (TS_RE.test(v)) return v;
  if (/^\d{13}$/.test(v)) return new Date(Number(v)).toISOString();
  if (/^\d{10}$/.test(v)) return new Date(Number(v) * 1000).toISOString();
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// 행 검증 + DB 컬럼 객체 변환. null 반환 시 rejects에 사유 기록.
// 거부는 필수키 누락·enum 위반만 — 숫자/시간 파싱 실패는 해당 필드만 NULL 처리(행은 등록).
function convertRow(spec: DatasetSpec, dataset: string, raw: Record<string, string>, rowNo: number, rejects: RejectRow[]): Record<string, string | null> | null {
  const out: Record<string, string | null> = {};
  for (const req of spec.required) {
    if (!(raw[req] ?? "").trim()) { rejects.push({ row: rowNo, column: req, value: "", message: "required" }); return null; }
  }
  const region = (raw.region ?? "").trim().toUpperCase(); // 대소문자 정규화
  if (region && !REGIONS.has(region)) { rejects.push({ row: rowNo, column: "region", value: region, message: "region not allowed" }); return null; }
  if (dataset === "shops" && !SHOP_TIERS.has((raw.tier ?? "").trim().toUpperCase())) { rejects.push({ row: rowNo, column: "tier", value: raw.tier ?? "", message: "tier not in T1..T5" }); return null; }
  if (dataset === "creators" && !MAP_TIERS.has((raw.mapping_tier ?? "").trim().toUpperCase())) { rejects.push({ row: rowNo, column: "mapping_tier", value: raw.mapping_tier ?? "", message: "mapping_tier not in M1,M3,M4,M5" }); return null; }
  for (const [csvName, [dbCol, type]] of Object.entries(spec.cols)) {
    let v = (raw[csvName] ?? "").trim();
    if (!v) { out[dbCol] = null; continue; } // 빈 값 = NULL (스펙 §2)
    if (dbCol === "region" || dbCol === "tier" || dbCol === "mapping_tier" || dbCol === "src_region") v = v.toUpperCase();
    if (type === "num") {
      out[dbCol] = Number.isFinite(Number(v)) ? v : null; // 파싱 실패 → NULL (행 유지)
    } else if (type === "ts") {
      out[dbCol] = parseTs(v); // 파싱 실패 → NULL (행 유지)
    } else out[dbCol] = v;
  }
  return out;
}

// jsonb_to_recordset 기반 배치 업서트 SQL 생성 (모든 필드 text 수신 → SELECT에서 캐스팅)
function upsertSql(dataset: string, spec: DatasetSpec): string {
  const dbCols = Object.values(spec.cols).map(([c]) => c);
  const recDef = dbCols.map((c) => `"${c}" text`).join(", ");
  const cast = (c: string): string => {
    const t = Object.values(spec.cols).find(([col]) => col === c)![1];
    if (t === "num") return `NULLIF(r."${c}",'')::numeric`;
    if (t === "ts") return `NULLIF(r."${c}",'')::timestamptz`;
    return `r."${c}"`;
  };
  const selects = dbCols.map(cast).join(", ");
  const pkCols = spec.pk.join(", ");
  const nonPk = dbCols.filter((c) => !spec.pk.includes(c));
  let updates: string;
  if (dataset === "creators") {
    // 스펙 §4: 연락처는 빈 값으로 덮어쓰지 않음, followers는 GREATEST
    const CONTACT = new Set(["email", "instagram_id", "youtube_channel", "bio_link"]);
    updates = nonPk.map((c) => {
      if (CONTACT.has(c)) return `${c}=COALESCE(NULLIF(EXCLUDED.${c},''), t.${c})`;
      if (c === "followers") return `followers=GREATEST(COALESCE(EXCLUDED.followers,0), COALESCE(t.followers,0))`;
      return `${c}=EXCLUDED.${c}`;
    }).join(", ");
  } else if (dataset === "shops") {
    updates = nonPk.map((c) => c === "creator_pool" ? `creator_pool=COALESCE(EXCLUDED.creator_pool, t.creator_pool)` : `${c}=EXCLUDED.${c}`).join(", ");
  } else {
    updates = nonPk.map((c) => `${c}=EXCLUDED.${c}`).join(", ");
  }
  return `INSERT INTO ${spec.table} AS t (${dbCols.join(", ")}, snapshot_date)
    SELECT ${selects}, CURRENT_DATE FROM jsonb_to_recordset($1::jsonb) AS r(${recDef})
    ON CONFLICT (${pkCols}) DO UPDATE SET ${updates}, snapshot_date=CURRENT_DATE
    RETURNING (xmax = 0) AS inserted`;
}

export async function GET() {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();
  const { rows } = await sql`SELECT * FROM kb_import_batches ORDER BY started_at DESC LIMIT 50`;
  return NextResponse.json({ batches: rows });
}

export async function POST(req: Request) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();
  const b = (await req.json().catch(() => null)) as {
    action?: string; dataset?: string; fileName?: string; rowsDeclared?: number;
    batchId?: number; rows?: Record<string, string>[]; startRow?: number; error?: string;
  } | null;
  if (!b) return NextResponse.json({ error: "본문 파싱 실패" }, { status: 400 });

  // 배치 시작 — 감사 로그 생성
  if (b.action === "begin") {
    const spec = SPECS[b.dataset || ""];
    if (!spec) return NextResponse.json({ error: `dataset 오류: ${b.dataset}` }, { status: 400 });
    const r = await sql`INSERT INTO kb_import_batches (file_name, dataset, row_count, status)
      VALUES (${b.fileName || "unknown"}, ${b.dataset!}, ${b.rowsDeclared || 0}, 'running') RETURNING batch_id`;
    return NextResponse.json({ ok: true, batchId: r.rows[0].batch_id });
  }

  // 배치 종료/실패
  if (b.action === "complete" || b.action === "fail") {
    if (!b.batchId) return NextResponse.json({ error: "batchId 필요" }, { status: 400 });
    await sql`UPDATE kb_import_batches SET status=${b.action === "complete" ? "done" : "failed"},
      error_log=${b.error || null}, finished_at=now() WHERE batch_id=${b.batchId}`;
    return NextResponse.json({ ok: true });
  }

  // 행 청크 업서트 (기본 액션)
  const spec = SPECS[b.dataset || ""];
  if (!spec) return NextResponse.json({ error: `dataset 오류: ${b.dataset}` }, { status: 400 });
  const rows = Array.isArray(b.rows) ? b.rows : [];
  if (!rows.length) return NextResponse.json({ error: "rows 비어있음" }, { status: 400 });
  if (rows.length > 2000) return NextResponse.json({ error: "청크당 최대 2000행" }, { status: 400 });

  const rejects: RejectRow[] = [];
  const startRow = Math.max(0, b.startRow || 0);
  const converted: Record<string, string | null>[] = [];
  for (let i = 0; i < rows.length; i++) {
    const c = convertRow(spec, b.dataset!, rows[i], startRow + i + 2, rejects); // +2 = 헤더+1기준 행번호
    if (c) converted.push(c);
  }
  // 청크 내 PK 중복 제거(뒤 행 우선) — ON CONFLICT는 같은 문장 내 중복 시 에러
  const byPk = new Map<string, Record<string, string | null>>();
  for (const c of converted) byPk.set(spec.pk.map((k) => c[k]).join(""), c);
  const finalRows = Array.from(byPk.values());

  let inserted = 0, updated = 0;
  if (finalRows.length) {
    try {
      const r = await sql.query(upsertSql(b.dataset!, spec), [JSON.stringify(finalRows)]);
      for (const row of r.rows) { if (row.inserted) inserted++; else updated++; }
    } catch (e) {
      return NextResponse.json({ error: `업서트 실패: ${String(e instanceof Error ? e.message : e).slice(0, 300)}` }, { status: 500 });
    }
  }
  if (b.batchId) {
    // 거부 사유 샘플을 이력에 남김(최대 ~800자) — 대량 거부 시 원인을 이력에서 바로 확인 가능
    const sample = rejects.length
      ? rejects.slice(0, 3).map((e) => `행${e.row} ${e.column}="${e.value}" ${e.message}`).join(" | ")
      : null;
    await sql`UPDATE kb_import_batches SET inserted_count=inserted_count+${inserted},
      updated_count=updated_count+${updated}, rejected_count=rejected_count+${rejects.length},
      error_log=CASE WHEN ${sample}::text IS NULL THEN error_log
        WHEN error_log IS NULL THEN ${sample}
        WHEN length(error_log) < 800 THEN error_log || ' | ' || ${sample} ELSE error_log END
      WHERE batch_id=${b.batchId}`;
  }
  return NextResponse.json({ ok: true, inserted, updated, rejected: rejects.length, errors: rejects.slice(0, 100) });
}
