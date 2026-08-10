# Apify 과다 사용료 환불 요청 (클레임)

> 목적: 설정 오류로 인한 의도치 않은 과다 결과 스크랩(~$600) 환불/크레딧 요청.
> 근거: pay-per-result 액터가 동일 영상을 중복 스크랩 → 결과 수·비용 폭증. 실제 보관 데이터는 절반뿐.

---

## 보낼 곳 (우선순위)
1. **Apify Console 우측 하단 채팅(Intercom)** — Starter 플랜은 Chat 지원 포함. **가장 빠름.**
2. **support@apify.com** (이메일) — 아래 본문 그대로 발송.
3. **help.apify.com** / Console → Billing → “Contact support”.

> 팁: 채팅과 이메일 **둘 다** 남기고, Billing → Historical usage 스크린샷(“clockworks/tiktok-scraper – Result 70,924 events = $212.77”)을 첨부하세요.

---

## 이메일/채팅 본문 (영문 — 그대로 복사)

**Subject:** Refund request — unintended runaway pay-per-result usage due to misconfiguration

Hi Apify Support,

We are writing to request a **refund (or platform credit)** for unintended, runaway usage on our account this billing period.

**What happened**
- Our backend calls `clockworks/tiktok-scraper` (pay-per-result, $0.003/result) on an hourly cron to collect TikTok videos per brand.
- Due to a **configuration error on our side**, each brand was queried with **8 hashtag variants** and **re-scraped every hour**, so the actor repeatedly returned the **same videos** over and over.
- As a result we were billed for **70,924 “Result” events ($212.77)** in this breakdown alone, and roughly **$600 across the period** — but after de-duplication we only **stored ~36,000 unique videos**. In other words, **about half of the billed results were duplicates** of data we already had.
- This was **not intentional usage** — it was a runaway loop from a misconfigured job, which we have since **fixed** (reduced to a single query per brand, added an emergency pause switch, and disabled the video actor by default).

**Request**
- We kindly ask for a **refund or credit for the duplicated/runaway portion** of the charges (approximately the redundant ~50% of results, or as much as your policy allows).
- We have already corrected the configuration to prevent recurrence.

**Details for your reference**
- Account: (your Apify account email)
- Actor: `clockworks/tiktok-scraper`
- Billing line: “Result” — 70,924 events × $0.003 = $212.77 (plus prior days at ~$116/day)
- Billing period: (e.g., 2026-07-10 – 2026-08-09) and 2026-08-10 spike (~$328)

We appreciate your understanding and any credit you can extend for this accidental overage.

Thank you,
(Your name)
GloveK / glovek.space

---

## 한글 요지 (담당자 공유용)
- clockworks 액터가 **결과당 과금**인데, **해시태그 8종 × 매시간 재수집**으로 같은 영상을 반복 구매.
- 청구 70,924건인데 **저장은 36,000건** → **약 절반이 중복 재구매(낭비)**.
- 설정 오류였고 **이미 수정**(1종으로 축소·정지 스위치·영상 기본 OFF).
- **중복분/폭주분에 대한 환불 또는 크레딧** 요청.

## 성공 확률 높이는 팁
- 정중하게, **“our misconfiguration”**을 인정하되 **runaway/duplicate**임을 강조(= 정상 사용 아님).
- **이미 고쳤다**는 점(재발 방지)을 명시 → 호의적 처리 유도.
- 스크린샷(Historical usage) 첨부.
- 첫 응답이 부분 크레딧이면 정중히 추가 요청 가능.
