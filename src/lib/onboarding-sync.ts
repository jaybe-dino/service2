// 온보딩(입점) 상세 전체를 운영 어드민으로 송신 — 기업이 제출한 데이터의 스냅샷 동기화.
// 이벤트: POST {ADMIN_INGEST_URL}/api/ingest/onboarding (tiktokadmin 쪽 수신 엔드포인트 필요)
// 멱등키: onb:{onb_id}:{epoch} — 저장 시점 스냅샷 단위(diagnosis와 동일한 방식).
// 파일: URL로 전달 — tiktokadmin 서버는 URL 뒤에 ?key=<연동시크릿>을 붙여 다운로드(파일 라우트 서버간 인증).
import { sql } from "./db";
import { sendIngest } from "./admin-ingest";

interface OnbFile { id?: string; filename?: string }

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://glovek.space").replace(/\/$/, "");
}
const fileUrl = (f?: OnbFile | null): string | null => (f?.id ? `${siteUrl()}/api/onboarding/file/${f.id}` : null);

// 사용자의 온보딩 신청 행을 읽어 전체 스냅샷을 전송. 저장 API(기본정보/제품) 성공 후 호출.
export async function syncOnboardingToAdmin(userId: string): Promise<void> {
  if (!process.env.ADMIN_INGEST_URL) return; // 미설정 시 no-op
  try {
    const r = await sql<{ id: string; email: string | null; status: string; phase: string | null; track: string | null; grade: string | null; countries: string | null; term: string | null; amount: number | null; referral_code: string | null; payload: { details?: Record<string, unknown> } | null; updated_at: string }>`
      SELECT id, email, status, phase, track, grade, countries, term, amount, referral_code, payload, updated_at
      FROM onboarding_applications WHERE user_id=${userId} LIMIT 1`;
    const a = r.rows[0];
    if (!a) return;
    const d = (a.payload?.details ?? {}) as Record<string, unknown>;
    const settle = (d.settlement ?? {}) as Record<string, unknown>;
    const rawProducts = Array.isArray(d.products) ? (d.products as Record<string, unknown>[]) : [];
    const products = rawProducts.map((p, i) => {
      const label = (p.label ?? {}) as Record<string, boolean>;
      const contact = (p.contact ?? {}) as Record<string, string>;
      const photos = Array.isArray(p.photos) ? (p.photos as OnbFile[]) : [];
      return {
        no: i + 1,
        name_ko: (p.nameKo as string) ?? "",
        name_en: (p.nameEn as string) ?? "",
        category: (p.cat as string) ?? "",
        price: (p.price as string) ?? "",
        cert_url: fileUrl(p.cert as OnbFile | null),
        photo_urls: photos.map((ph) => fileUrl(ph)).filter(Boolean),
        label_checks: {
          product_name: !!label.productName, net_quantity: !!label.netQuantity,
          directions: !!label.directions, ingredients: !!label.ingredients, contact: !!label.contact,
        },
        contact: { address: contact.address ?? "", phone: contact.phone ?? "", website: contact.website ?? "" },
        real_photo: !!p.realPhoto,
      };
    });

    const epoch = Date.now();
    await sendIngest("onboarding", `onb:${a.id}:${epoch}`, {
      email: a.email ?? undefined,
      glovek_user_id: userId,
      glovek_onb_id: a.id,
      status: a.status,
      phase: a.phase ?? undefined,
      track: a.track ?? undefined,
      grade: a.grade ?? undefined,
      countries: (a.countries ?? "").split(",").filter(Boolean),
      term: a.term ?? undefined,
      amount: a.amount ?? undefined,
      referral_code: a.referral_code ?? undefined,
      brand_ko: (d.brandKo as string) ?? "",
      brand_en: (d.brandEn as string) ?? "",
      biz_no: (d.bizNo as string) ?? "",
      rep_name: (d.repName as string) ?? "",
      manager_name: (d.managerName as string) ?? "",
      contact: (d.contact as string) ?? "",
      settlement: { bank: settle.bank ?? "", acct: settle.acct ?? "", holder: settle.holder ?? "" },
      bizreg_file_url: fileUrl(d.bizRegFile as OnbFile | null),
      note: (d.note as string) ?? "",
      products,
      source_ref: a.id,
    });
  } catch (e) {
    console.error("[ingest] onboarding sync 실패", userId, (e as Error).message);
  }
}
