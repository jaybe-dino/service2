# Apify 크레딧 보상 요청 (Issues 탭 경유)

> Apify 정책: **환불 불가(약관), 크레딧 보상만 가능.** 그리고 스토어 액터는 **개발자를 통해서만** 신청됨.
> 절차: 액터 **Issues 탭에 이슈 등록 → 개발자 검토·인정 → 개발자가 Support에 크레딧 요청**.
> 현실: 이번 건은 **우리 설정 오류**(액터 버그 아님)라 **선의 요청**. 거절될 수 있으나 "중복 과금" 프레임으로 시도.

---

## 어디에 올리나
- **clockworks/tiktok-scraper 의 Issues 탭**: https://apify.com/clockworks/tiktok-scraper/issues
- "Create issue"로 아래 본문 등록. (가능하면 Historical usage 스크린샷 첨부)

## 먼저 준비할 것
- **Apify User ID**: Console → **Settings → Account/Integrations**에서 확인 (또는 URL의 사용자 식별자)
- **요청 금액**: 전액 말고 **중복분 ~50%(약 $300)** 정도로 합리적으로 (수용 확률↑)

---

## Issue 본문 (영문 — 그대로 복사)

**Title:** Unexpectedly high pay-per-result charges from duplicate results — credit compensation request

Hi, and thanks for maintaining this actor.

We use `clockworks/tiktok-scraper` to collect TikTok videos per brand on a schedule. Over the recent billing period we were charged for **70,924 “Result” events (~$213 in one line item, ~$600 across the period)**. However, after de-duplicating by video ID, we only retained **~36,000 unique videos** — meaning **roughly half of the billed results were duplicates** of content we already had.

This happened because our own scheduler ran **multiple hashtag queries per brand, repeatedly**, which caused the actor to return the same videos again and again. We have since **fixed our configuration** (a single query per brand, and we disabled the scheduled runs), so this will not recur.

Since about half of the pay-per-result charges were duplicate content, would you be willing to submit a **credit compensation** request to Apify Support on our behalf? We understand this originated from our configuration, so we’re asking in good faith for a partial credit.

For the Support request, here are the details:
- **Apify User ID:** (fill in your user id)
- **Actor ID:** clockworks/tiktok-scraper
- **Requested compensation:** ~$300 (the duplicated ~50%), or whatever you consider fair
- **Reason:** duplicate results led to unexpected pay-per-result charges; configuration has since been corrected

Thank you for considering this.

---

## 한글 요지
- 환불은 불가 → **크레딧 보상**을, **clockworks Issues 탭**에서 개발자에게 요청.
- 청구 70,924건 중 **저장 36,000건 = 절반이 중복** → 중복분 크레딧을 정중히 요청.
- 우리 설정 오류였고 **이미 수정**했음을 명시(재발 방지) → 선의 처리 유도.
- 요청 금액은 **~$300(중복 50%)**로 합리적으로.

## 기대치
- 개발자가 인정하면 → Support로 크레딧 요청 전달 → 계정에 **크레딧**(현금 환불 아님)으로 반영될 수 있음.
- 거절/무응답 가능성도 있음(우리 귀책이라). 그래도 시도 비용 0.
