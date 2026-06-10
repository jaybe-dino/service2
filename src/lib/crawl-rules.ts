// 크롤링 규칙 (어드민에서 조회/수정, admin_settings 테이블 key="crawl_rules")
export interface CrawlRules {
  collectIntervalHours: number; // 콘텐츠 수집 주기(시간)
  weeklyLearningDays: string[]; // 주간 AI 재학습 요일
  weeklyLearningTime: string; // 재학습 시각
  newBrandLearningHours: number; // 신규 브랜드 자가학습 소요(시간)
  excludeOfficialAccounts: boolean; // 브랜드 공식/샵 계정 제외
  excludeKeywords: string[]; // 공식계정 판별 키워드
  minViews: number; // 최소 조회수 필터
  sources: string[]; // 수집 소스
}

export const DEFAULT_CRAWL_RULES: CrawlRules = {
  collectIntervalHours: 24,
  weeklyLearningDays: ["월", "목"],
  weeklyLearningTime: "09:00",
  newBrandLearningHours: 12,
  excludeOfficialAccounts: true,
  excludeKeywords: ["official", "tiktokshop", "flagship", "store"],
  minViews: 0,
  sources: ["TikTok Shop Open DB", "TikTok Web (scraping)", "TikTok One API (예정)"],
};
