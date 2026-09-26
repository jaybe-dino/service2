// 디노스튜디오 레퍼런스(/refer) 공개 데이터 — 내부 청구·Slack·연락처·계산서 등은 제외한 공개 안전 필드만.
// 규모 분류는 홈페이지 진열용 잠정값이며 '미확인/확인필요'는 임의 재분류하지 않는다.
// 자료 출처: 2024 디노스튜디오 회사소개서 클라이언트 표기 + 내부 조사(2026-09).

export type LogoSize = "대형" | "중형" | "소형" | "확인필요" | "미확인";

export interface ReferLogo { brand: string; size: LogoSize; logo: string; isCompany: boolean }
export const REFER_LOGOS: ReferLogo[] = [{"brand": "코오롱스포츠", "size": "대형", "logo": "/refer/logos/kolon-sport.png", "isCompany": false}, {"brand": "신원", "size": "중형", "logo": "/refer/logos/shinwon.png", "isCompany": false}, {"brand": "동국", "size": "중형", "logo": "/refer/logos/dongkook.png", "isCompany": false}, {"brand": "동화약품", "size": "중형", "logo": "/refer/logos/dongwha.png", "isCompany": false}, {"brand": "LG생활건강", "size": "대형", "logo": "/refer/logos/lg-hnh.png", "isCompany": false}, {"brand": "SAMWHA", "size": "확인필요", "logo": "/refer/logos/samwha.png", "isCompany": false}, {"brand": "애경", "size": "대형", "logo": "/refer/logos/aekyung.png", "isCompany": false}, {"brand": "농협", "size": "대형", "logo": "/refer/logos/nonghyup.png", "isCompany": false}, {"brand": "3M", "size": "대형", "logo": "/refer/logos/3m.png", "isCompany": false}, {"brand": "CJ제일제당", "size": "대형", "logo": "/refer/logos/cj-cheiljedang.png", "isCompany": false}, {"brand": "동아오츠카", "size": "중형", "logo": "/refer/logos/donga-otsuka.png", "isCompany": false}, {"brand": "모두투어", "size": "중형", "logo": "/refer/logos/modetour.png", "isCompany": false}, {"brand": "파우", "size": "미확인", "logo": "/refer/logos/fau.png", "isCompany": false}, {"brand": "픽셀퓨어", "size": "미확인", "logo": "/refer/logos/pixelpure.png", "isCompany": false}, {"brand": "웰더마", "size": "미확인", "logo": "/refer/logos/wellderma.png", "isCompany": false}, {"brand": "베리즈", "size": "미확인", "logo": "/refer/logos/berries.png", "isCompany": false}, {"brand": "닥터브라이언", "size": "미확인", "logo": "/refer/logos/dr-brian.png", "isCompany": false}, {"brand": "버모어", "size": "미확인", "logo": "/refer/logos/vermore.png", "isCompany": false}, {"brand": "JMW / 로아띠", "size": "미확인", "logo": "/refer/logos/jmw-roatti.png", "isCompany": true}, {"brand": "리꼼", "size": "미확인", "logo": "/refer/logos/licom.png", "isCompany": false}, {"brand": "볼라보", "size": "미확인", "logo": "/refer/logos/volabo.png", "isCompany": false}, {"brand": "닥터노바메디", "size": "미확인", "logo": "/refer/logos/dr-novamedi.png", "isCompany": false}, {"brand": "피븐", "size": "미확인", "logo": "/refer/logos/peeven.png", "isCompany": false}, {"brand": "앱소", "size": "미확인", "logo": "/refer/logos/abso.png", "isCompany": false}, {"brand": "리터뉴", "size": "미확인", "logo": "/refer/logos/returnu.png", "isCompany": false}, {"brand": "프럼네이처", "size": "미확인", "logo": "/refer/logos/from-nature.png", "isCompany": false}, {"brand": "닥터비타", "size": "미확인", "logo": "/refer/logos/dr-vita.png", "isCompany": false}, {"brand": "부강코스메틱", "size": "미확인", "logo": "/refer/logos/bukang-cosmetic.svg", "isCompany": true}, {"brand": "허브이오", "size": "미확인", "logo": "/refer/logos/herb-io.png", "isCompany": false}, {"brand": "더이유", "size": "미확인", "logo": "/refer/logos/the-yiu.png", "isCompany": false}, {"brand": "고려공작1392", "size": "미확인", "logo": "/refer/logos/koryo-1392.png", "isCompany": false}, {"brand": "안나어드바이스랩", "size": "미확인", "logo": "/refer/logos/anna-advice-lab.png", "isCompany": false}];

// 규모 표시 순서(미확인·확인필요를 소형에 편입하지 않음 — 별도 유지)
export const SIZE_ORDER: LogoSize[] = ["대형", "중형", "소형", "확인필요", "미확인"];
export const SIZE_LABEL: Record<LogoSize, string> = {
  "대형": "대형", "중형": "중형", "소형": "소형", "확인필요": "분류 확인 중", "미확인": "규모 미확인",
};

// TikTok Shop — 일반 유튜브 콘텐츠와 별개. 확인된 수행 범위(온보딩·샵 개설·운영)만. 청구/계약을 실적으로 과장하지 않음.
export interface ReferTiktok { brand: string; market: string; scope: string; size: LogoSize; logo: string }
export const REFER_TIKTOK: ReferTiktok[] = [{"brand": "닥터노바메디 / 듈로", "market": "동남아·태국", "scope": "샵 개설", "size": "미확인", "logo": "/refer/logos/dr-novamedi.png"}, {"brand": "닥터비타", "market": "미확인", "scope": "온보딩 진행 (세부 범위 확인 중)", "size": "미확인", "logo": "/refer/logos/dr-vita.png"}, {"brand": "픽셀퓨어", "market": "미확인", "scope": "온보딩 진행 (세부 범위 확인 중)", "size": "미확인", "logo": "/refer/logos/pixelpure.png"}, {"brand": "더이유", "market": "미확인", "scope": "온보딩 진행 (세부 범위 확인 중)", "size": "미확인", "logo": "/refer/logos/the-yiu.png"}, {"brand": "웰더마 (WellDerma)", "market": "미확인", "scope": "온보딩 진행 (세부 범위 확인 중)", "size": "미확인", "logo": "/refer/logos/wellderma.png"}, {"brand": "파우 (FAU)", "market": "미국", "scope": "샵·GMV 연결 완료 · 통관 진행", "size": "미확인", "logo": "/refer/logos/fau.png"}, {"brand": "JMW / 로아띠", "market": "미확인", "scope": "온보딩 계약 확인", "size": "미확인", "logo": "/refer/logos/jmw-roatti.png"}, {"brand": "리꼼코스메틱", "market": "미국", "scope": "온보딩 진행 (세부 범위 확인 중)", "size": "미확인", "logo": "/refer/logos/licom.png"}, {"brand": "닥터브라이언", "market": "태국", "scope": "온보딩 진행 (세부 범위 확인 중)", "size": "미확인", "logo": "/refer/logos/dr-brian.png"}, {"brand": "베리즈", "market": "태국·베트남", "scope": "샵 개설 · SKU 선정", "size": "미확인", "logo": "/refer/logos/berries.png"}, {"brand": "안나어드바이스랩", "market": "싱가포르", "scope": "샵 개설 · 상품 등록 단계", "size": "미확인", "logo": "/refer/logos/anna-advice-lab.png"}, {"brand": "버모어", "market": "미확인", "scope": "온보딩 진행 (세부 범위 확인 중)", "size": "미확인", "logo": "/refer/logos/vermore.png"}, {"brand": "볼라보", "market": "베트남", "scope": "샵 개설 · 상품 등록 단계", "size": "미확인", "logo": "/refer/logos/volabo.png"}, {"brand": "앱소 (Abso.)", "market": "미국", "scope": "온보딩 계약 진행", "size": "미확인", "logo": "/refer/logos/abso.png"}, {"brand": "허브이오 / 남영통상", "market": "미국", "scope": "온보딩 계약 진행", "size": "미확인", "logo": "/refer/logos/herb-io.png"}, {"brand": "고려공작1392", "market": "미국", "scope": "샵 개설 · 카테고리 승인 단계", "size": "미확인", "logo": "/refer/logos/koryo-1392.png"}, {"brand": "프럼네이처 (FROM NATURE) / 대화씨앤에프", "market": "미국", "scope": "샵·GMV 연결 완료", "size": "미확인", "logo": "/refer/logos/from-nature.png"}, {"brand": "피븐 (PEEVEN)", "market": "미국", "scope": "창고 입고 · 샘플 발송 단계", "size": "미확인", "logo": "/refer/logos/peeven.png"}, {"brand": "부강코스메틱 (회사)", "market": "미국", "scope": "온보딩 진행", "size": "미확인", "logo": "/refer/logos/bukang-cosmetic.svg"}, {"brand": "리터뉴 (RETURNU)", "market": "미확인", "scope": "온보딩 진행 (세부 범위 확인 중)", "size": "미확인", "logo": "/refer/logos/returnu.png"}];

// YouTube — 항목 유형별 탐색. 선금·잔금 중복은 제거된 고유 브랜드 목록. 확인된 영상 URL이 없어 재생 링크는 미제공.
export interface ReferYoutubeCat { category: string; brands: string[] }
export const REFER_YOUTUBE: ReferYoutubeCat[] = [{"category": "PPL·시딩", "brands": ["공드린에프엔비", "데이바이미", "디네이션", "마이유니버스", "세스티끄", "스타일셀러", "스터너스", "액티브스", "엘에프앤비", "엘지생활건강", "오브젝티보 (리카리카)", "온고잉", "유코스토리", "율아 (로라바운스)", "인플롭", "일그램", "조윈", "캐치웰", "케리프", "케이빅스", "트리플러스", "퍼스트메카", "페르소나AI", "페르소나에이아이", "플로우링크", "한국방송공사"]}, {"category": "공동구매·RS", "brands": ["공드린에프엔비", "데이바이미", "스타일셀러", "인플롭", "콘스탄트"]}, {"category": "브랜디드·롱폼", "brands": ["에스비에스엠앤씨", "케이빅스", "케이빅스 *_ 아이리스_씨커트", "플로우링크"]}, {"category": "쇼츠·숏폼", "brands": ["애경산업", "에이아이웹", "트랜드아이", "푸드나무 (랭킹닭컴)", "플로우링크", "피코그램"]}];

// YouTube 콘텐츠 썸네일(실제 작업물 스크린샷) — 조회수·URL은 미확인이라 표기하지 않음.
export const REFER_YT_THUMBS: string[] = [
  "/refer/youtube/yt_0.png", "/refer/youtube/yt_1.png", "/refer/youtube/yt_2.png",
  "/refer/youtube/yt_3.png", "/refer/youtube/yt_4.png", "/refer/youtube/yt_5.png",
];

// 글로벌 콘텐츠 사례(인스타 릴) — 원문에 GENIE 크레딧이 보여 디노의 정확한 역할은 확인 전.
// 특정 역할을 단정하지 않고 크레딧을 유지한 중립 소개. role은 확인 후 채우는 편집 가능 필드.
export const REFER_REEL = {
  url: "https://www.instagram.com/reel/DXanAvrk1OZ/",
  account: "hyp",
  credit: "GENIE",            // 원문에 표기된 제작 크레딧(유지)
  role: "",                    // 디노스튜디오 수행 역할 — 확인 후 입력(편집 가능 필드)
  note: "원문 크레딧을 유지한 중립 소개. 상세 수행 역할은 확인 후 업데이트됩니다.",
};

// 글로벌 콘텐츠 사례(썸네일) — @hyp 채널 콘텐츠. GENIE 크레딧 유지, 특정 역할 단정 없음.
// url·caption·role은 확인 후 채우는 편집 가능 필드(개별 릴 URL이 확인되면 교체).
export interface ReferCase { img: string; url: string; account: string; credit: string; caption: string; role: string }
export const REFER_CASES: ReferCase[] = [
  { img: "/refer/cases/case_0226.webp", url: "https://www.instagram.com/reel/DXanAvrk1OZ/", account: "hyp", credit: "GENIE", caption: "", role: "" },
  { img: "/refer/cases/case_0225.webp", url: "https://www.instagram.com/hyp/", account: "hyp", credit: "GENIE", caption: "", role: "" },
  { img: "/refer/cases/case_0224.webp", url: "https://www.instagram.com/hyp/", account: "hyp", credit: "GENIE", caption: "", role: "" },
];

// '더 많은 사례' 채널 링크(편집 가능)
export const REFER_CASE_MORE = "https://www.instagram.com/hyp/";
