// tpartners.live 이동 시 UTM 부착 (유입 추적)
export function tpartnersUrl(campaign = "tiktokshop_onboarding", content = "site"): string {
  const u = new URL("https://tpartners.live");
  u.searchParams.set("utm_source", "glovek");
  u.searchParams.set("utm_medium", "referral");
  u.searchParams.set("utm_campaign", campaign);
  u.searchParams.set("utm_content", content);
  return u.toString();
}
