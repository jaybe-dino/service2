// 디노스튜디오 레퍼런스(/refer) 공개 데이터 — 내부 청구·Slack·연락처·계산서 등은 제외한 공개 안전 필드만.
// 규모 분류는 홈페이지 진열용 잠정값이며 '미확인/확인필요'는 임의 재분류하지 않는다.
// 자료 출처: 2024 디노스튜디오 회사소개서 클라이언트 표기 + 내부 조사(2026-09).

export type LogoSize = "대형" | "중형" | "소형" | "확인필요" | "미확인";

export interface ReferLogo { brand: string; size: LogoSize; logo: string; isCompany: boolean }
export const REFER_LOGOS: ReferLogo[] = [{"brand": "유한양행", "size": "대형", "logo": "/refer/logos/yuhan-official.png", "isCompany": false}, {"brand": "클리오", "size": "대형", "logo": "/refer/logos/clio-official.svg", "isCompany": false}, {"brand": "톤28", "size": "대형", "logo": "/refer/logos/toun28-official.svg", "isCompany": false}, {"brand": "블리블리", "size": "대형", "logo": "/refer/logos/velyvely-official.png", "isCompany": false}, {"brand": "코오롱스포츠", "size": "대형", "logo": "/refer/logos/kolon-sport.png", "isCompany": false}, {"brand": "신원", "size": "중형", "logo": "/refer/logos/shinwon.png", "isCompany": false}, {"brand": "동국", "size": "중형", "logo": "/refer/logos/dongkook.png", "isCompany": false}, {"brand": "동화약품", "size": "중형", "logo": "/refer/logos/dongwha.png", "isCompany": false}, {"brand": "LG생활건강", "size": "대형", "logo": "/refer/logos/lg-hnh.png", "isCompany": false}, {"brand": "애경", "size": "대형", "logo": "/refer/logos/aekyung.png", "isCompany": false}, {"brand": "농협", "size": "대형", "logo": "/refer/logos/nonghyup.png", "isCompany": false}, {"brand": "CJ제일제당", "size": "대형", "logo": "/refer/logos/cj-cheiljedang.png", "isCompany": false}, {"brand": "동아오츠카", "size": "중형", "logo": "/refer/logos/donga-otsuka.png", "isCompany": false}, {"brand": "모두투어", "size": "중형", "logo": "/refer/logos/modetour.png", "isCompany": false}, {"brand": "파우", "size": "미확인", "logo": "/refer/logos/fau.png", "isCompany": false}, {"brand": "픽셀퓨어", "size": "미확인", "logo": "/refer/logos/pixelpure.png", "isCompany": false}, {"brand": "웰더마", "size": "미확인", "logo": "/refer/logos/wellderma.png", "isCompany": false}, {"brand": "베리즈", "size": "미확인", "logo": "/refer/logos/berries.png", "isCompany": false}, {"brand": "닥터브라이언", "size": "미확인", "logo": "/refer/logos/dr-brian.png", "isCompany": false}, {"brand": "버모어", "size": "미확인", "logo": "/refer/logos/vermore.png", "isCompany": false}, {"brand": "JMW / 로아띠", "size": "미확인", "logo": "/refer/logos/jmw-roatti.png", "isCompany": true}, {"brand": "리꼼", "size": "미확인", "logo": "/refer/logos/licom.png", "isCompany": false}, {"brand": "볼라보", "size": "미확인", "logo": "/refer/logos/volabo.png", "isCompany": false}, {"brand": "닥터노바메디", "size": "미확인", "logo": "/refer/logos/dr-novamedi.png", "isCompany": false}, {"brand": "피븐", "size": "미확인", "logo": "/refer/logos/peeven.png", "isCompany": false}, {"brand": "앱소", "size": "미확인", "logo": "/refer/logos/abso.png", "isCompany": false}, {"brand": "리터뉴", "size": "미확인", "logo": "/refer/logos/returnu.png", "isCompany": false}, {"brand": "프럼네이처", "size": "미확인", "logo": "/refer/logos/from-nature.png", "isCompany": false}, {"brand": "닥터비타", "size": "미확인", "logo": "/refer/logos/dr-vita.png", "isCompany": false}, {"brand": "부강코스메틱", "size": "미확인", "logo": "/refer/logos/bukang-cosmetic.svg", "isCompany": true}, {"brand": "허브이오", "size": "미확인", "logo": "/refer/logos/herb-io.png", "isCompany": false}, {"brand": "더이유", "size": "미확인", "logo": "/refer/logos/the-yiu.png", "isCompany": false}, {"brand": "고려공작1392", "size": "미확인", "logo": "/refer/logos/koryo-1392.png", "isCompany": false}, {"brand": "보딩패스", "size": "미확인", "logo": "/refer/logos/boardingpass-official.jpg", "isCompany": false}];

// 규모 표시 순서(미확인·확인필요를 소형에 편입하지 않음 — 별도 유지)
export const SIZE_ORDER: LogoSize[] = ["대형", "중형", "소형", "확인필요", "미확인"];
export const SIZE_LABEL: Record<LogoSize, string> = {
  "대형": "대형", "중형": "중형", "소형": "소형", "확인필요": "분류 확인 중", "미확인": "규모 미확인",
};

// TikTok Shop — 일반 유튜브 콘텐츠와 별개. 확인된 수행 범위(온보딩·샵 개설·운영)만. 청구/계약을 실적으로 과장하지 않음.
export interface ReferTiktok { brand: string; market: string; scope: string; size: LogoSize; logo: string }
export const REFER_TIKTOK: ReferTiktok[] = [{"brand": "닥터노바메디 / 듈로", "market": "동남아·태국", "scope": "샵 개설", "size": "미확인", "logo": "/refer/logos/dr-novamedi.png"}, {"brand": "닥터비타", "market": "미확인", "scope": "온보딩 진행", "size": "미확인", "logo": "/refer/logos/dr-vita.png"}, {"brand": "픽셀퓨어", "market": "미확인", "scope": "온보딩 진행", "size": "미확인", "logo": "/refer/logos/pixelpure.png"}, {"brand": "더이유", "market": "미확인", "scope": "온보딩 진행", "size": "미확인", "logo": "/refer/logos/the-yiu.png"}, {"brand": "웰더마 (WellDerma)", "market": "미확인", "scope": "온보딩 진행", "size": "미확인", "logo": "/refer/logos/wellderma.png"}, {"brand": "파우 (FAU)", "market": "미국", "scope": "샵·GMV 연결 완료 · 통관 진행", "size": "미확인", "logo": "/refer/logos/fau.png"}, {"brand": "JMW / 로아띠", "market": "미확인", "scope": "온보딩 계약 확인", "size": "미확인", "logo": "/refer/logos/jmw-roatti.png"}, {"brand": "리꼼코스메틱", "market": "미국", "scope": "온보딩 진행", "size": "미확인", "logo": "/refer/logos/licom.png"}, {"brand": "닥터브라이언", "market": "태국", "scope": "온보딩 진행", "size": "미확인", "logo": "/refer/logos/dr-brian.png"}, {"brand": "베리즈", "market": "태국·베트남", "scope": "샵 개설 · SKU 선정", "size": "미확인", "logo": "/refer/logos/berries.png"}, {"brand": "버모어", "market": "미확인", "scope": "온보딩 진행", "size": "미확인", "logo": "/refer/logos/vermore.png"}, {"brand": "볼라보", "market": "베트남", "scope": "샵 개설 · 상품 등록 단계", "size": "미확인", "logo": "/refer/logos/volabo.png"}, {"brand": "앱소 (Abso.)", "market": "미국", "scope": "온보딩 계약 진행", "size": "미확인", "logo": "/refer/logos/abso.png"}, {"brand": "허브이오 / 남영통상", "market": "미국", "scope": "온보딩 계약 진행", "size": "미확인", "logo": "/refer/logos/herb-io.png"}, {"brand": "고려공작1392", "market": "미국", "scope": "샵 개설 · 카테고리 승인 단계", "size": "미확인", "logo": "/refer/logos/koryo-1392.png"}, {"brand": "프럼네이처 (FROM NATURE) / 대화씨앤에프", "market": "미국", "scope": "샵·GMV 연결 완료", "size": "미확인", "logo": "/refer/logos/from-nature.png"}, {"brand": "피븐 (PEEVEN)", "market": "미국", "scope": "창고 입고 · 샘플 발송 단계", "size": "미확인", "logo": "/refer/logos/peeven.png"}, {"brand": "부강코스메틱 (회사)", "market": "미국", "scope": "온보딩 진행", "size": "미확인", "logo": "/refer/logos/bukang-cosmetic.svg"}, {"brand": "리터뉴 (RETURNU)", "market": "미확인", "scope": "온보딩 진행", "size": "미확인", "logo": "/refer/logos/returnu.png"}];

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

// 사용자 제공 실제 레퍼런스(UGC) — "Previous UGC Examples" 문서에서 추출한 16건 원본 링크.
// 스킨케어·헤어케어 등 카테고리의 협업 네트워크 제작 사례. 개별 수행역할/수치/권한은 근거 없이 확대하지 않는다.
// handle: URL에서 확인되는 크리에이터만(단축/릴 URL은 null). thumb: 로컬 캡처 자산(public/refer/ugc/<id>.jpg) — 미확보 시 null.
export type UgcPlatform = "tiktok" | "instagram" | "drive";
// thumb: 사용자 제공 실제 캡처(public/refer/ugc/<file>.jpg). 확보된 5건만 채우고 나머지는 원본 링크만 노출.
// caption/handle: 사용자가 확인해 제공한 값만. 미확인 항목은 null로 두고 지어내지 않는다.
export interface ReferUgc { id: string; url: string; platform: UgcPlatform; handle: string | null; thumb: string | null; caption: string | null }
export const REFER_UGC: ReferUgc[] = [
  { id: "tt-alim-7469", url: "https://www.tiktok.com/@alim_kh0/video/7469115334029495574", platform: "tiktok", handle: "alim_kh0", thumb: null, caption: null },
  { id: "tt-priest-7675", url: "https://www.tiktok.com/@blessedbythepriest/video/7675806356716162317", platform: "tiktok", handle: "blessedbythepriest", thumb: null, caption: null },
  { id: "tt-elijah-7639", url: "https://www.tiktok.com/@elijah_forcier/video/7639406779801160981", platform: "tiktok", handle: "elijah_forcier", thumb: null, caption: null },
  { id: "tt-nath-7674", url: "https://www.tiktok.com/@nath__ev/video/7674220279182167303", platform: "tiktok", handle: "nath__ev", thumb: null, caption: null },
  { id: "ig-DcuiOs9ukYM", url: "https://www.instagram.com/reel/DcuiOs9ukYM/", platform: "instagram", handle: "janelle.lives", thumb: "/refer/ugc/ugc-instagram-DcuiOs9ukYM.jpg", caption: "Not Just Sundays 카드게임 · 대화형 리뷰" },
  { id: "ig-DYS9i-WvQra", url: "https://www.instagram.com/reel/DYS9i-WvQra/", platform: "instagram", handle: "kali.patterson_", thumb: "/refer/ugc/ugc-instagram-DYS9i-WvQra.jpg", caption: "Not Just Sundays · 친구들과 제품 사용" },
  { id: "ig-DbE2YD4Ox1N", url: "https://www.instagram.com/reel/DbE2YD4Ox1N/", platform: "instagram", handle: "katyj813", thumb: "/refer/ugc/ugc-instagram-DbE2YD4Ox1N.jpg", caption: "Not Just Sundays · 가족 사용 장면" },
  { id: "tt-alim-7497", url: "https://www.tiktok.com/@alim_kh0/video/7497335502539066647", platform: "tiktok", handle: "alim_kh0", thumb: null, caption: null },
  { id: "drive-1DgX", url: "https://drive.google.com/file/d/1DgXNSnB08iiSbtzBNgTEijTxjyc1KqMd/view", platform: "drive", handle: null, thumb: "/refer/ugc/ugc-drive-1.jpg", caption: "등교 전 헤어 스타일링" },
  { id: "drive-17GU", url: "https://drive.google.com/file/d/17GUctiXoZRL39T9Z3pzA76JjDLpkVNvF/view", platform: "drive", handle: null, thumb: "/refer/ugc/ugc-drive-2.jpg", caption: "Based Texture Powder 제품 시연" },
  { id: "tt-ZP86bJc33", url: "https://www.tiktok.com/t/ZP86bJc33/", platform: "tiktok", handle: null, thumb: null, caption: null },
  { id: "tt-ZP86qcT94", url: "https://www.tiktok.com/t/ZP86qcT94/", platform: "tiktok", handle: null, thumb: null, caption: null },
  { id: "tt-ZTjaJP4t6", url: "https://www.tiktok.com/t/ZTjaJP4t6/", platform: "tiktok", handle: null, thumb: null, caption: null },
  { id: "tt-ZTjaJu69a", url: "https://www.tiktok.com/t/ZTjaJu69a/", platform: "tiktok", handle: null, thumb: null, caption: null },
  { id: "tt-ZTjaJyG7s", url: "https://www.tiktok.com/t/ZTjaJyG7s/", platform: "tiktok", handle: null, thumb: null, caption: null },
  { id: "tt-ZP861cxDM", url: "https://www.tiktok.com/t/ZP861cxDM/", platform: "tiktok", handle: null, thumb: null, caption: null },
];
// 히어로에 우선 노출할 대표 캡처(제품이 보이는 헤어 시연 + 카드게임 일상 사용으로 시각적 다양성 확보)
export const REFER_UGC_HERO = ["drive-17GU", "ig-DbE2YD4Ox1N", "drive-1DgX"];

// 공개 노출용 고정 선별 10건 — Glovek 수록 공개 콘텐츠 중 선별(외부 크리에이터 콘텐츠 참고 사례, 자체 제작 실적 아님).
// 포스터는 로컬 정적 자산(public/refer/curated/ref-<videoId>.jpg, 원본 540×960 보존). 카드 표시 필드만 보관(서명 CDN URL·원문 캡션·내부 메모 제외).
// 출처/검토일 기록은 docs/refer-curated10-sources.md(내부).
export interface ReferCurated { id: string; brand: string; brandKo: string; handle: string; format: string; title: string; note: string; url: string; thumb: string }
export const REFER_CURATED: ReferCurated[] = [
  { id: "7535138164298599702", brand: "TirTir", brandKo: "티르티르", handle: "nadina_ioana", format: "메이크업 ASMR", title: "컬러 대비가 돋보이는 쿠션 ASMR", note: "패키지와 사용 장면을 소리·클로즈업으로 연결한 메이크업 콘텐츠.", url: "https://www.tiktok.com/@nadina_ioana/video/7535138164298599702", thumb: "/refer/curated/ref-7535138164298599702.jpg" },
  { id: "7538888790954315038", brand: "Fwee", brandKo: "퓌", handle: "nats_tutorials", format: "립 발색·사용법", title: "립 제품을 가까이 보여주는 발색 리뷰", note: "제품 클로즈업과 바르는 방식을 함께 보여주는 립 메이크업 리뷰.", url: "https://www.tiktok.com/@nats_tutorials/video/7538888790954315038", thumb: "/refer/curated/ref-7538888790954315038.jpg" },
  { id: "7576679218600365334", brand: "SKIN1004", brandKo: "스킨1004", handle: "jasminnlily_", format: "스킨케어 루틴", title: "포어마이징 4단계 사용 루틴", note: "클렌징·마스크·앰플·크림을 하나의 사용 순서로 구성.", url: "https://www.tiktok.com/@jasminnlily_/video/7576679218600365334", thumb: "/refer/curated/ref-7576679218600365334.jpg" },
  { id: "7528307119016168712", brand: "Anua", brandKo: "아누아", handle: "_skincareby.a.0", format: "클렌징 시연", title: "일상 세안 장면으로 보여주는 이중 세안", note: "직접 세안하는 장면으로 제품을 사용하는 루틴을 전달.", url: "https://www.tiktok.com/@_skincareby.a.0/video/7528307119016168712", thumb: "/refer/curated/ref-7528307119016168712.jpg" },
  { id: "7569964954363645195", brand: "Rom&nd", brandKo: "롬앤", handle: "louiserozzz", format: "립 메이크업", title: "플럼 코크로 완성하는 체리 콜라 립", note: "하나의 립 컬러를 구체적인 메이크업 룩으로 연결한 튜토리얼.", url: "https://www.tiktok.com/@louiserozzz/video/7569964954363645195", thumb: "/refer/curated/ref-7569964954363645195.jpg" },
  { id: "7573080707619130655", brand: "Medicube", brandKo: "메디큐브", handle: "kaycstash", format: "제품 리뷰", title: "마스크팩 실사용에서 구매 혜택까지", note: "실제 착용 장면과 구매 혜택 메시지를 결합한 커머스형 리뷰.", url: "https://www.tiktok.com/@kaycstash/video/7573080707619130655", thumb: "/refer/curated/ref-7573080707619130655.jpg" },
  { id: "7646439170751204626", brand: "Celimax", brandKo: "셀리맥스", handle: "noran.hm", format: "제품 사용법", title: "레티날 소개와 직접 바르는 사용법", note: "질문형 설명과 제품을 직접 바르는 장면으로 사용법을 전달.", url: "https://www.tiktok.com/@noran.hm/video/7646439170751204626", thumb: "/refer/curated/ref-7646439170751204626.jpg" },
  { id: "7577087315995020574", brand: "Biodance", brandKo: "바이오던스", handle: "ahnestkitchen", format: "생활 속 루틴", title: "엄마의 겨울 보습 루틴", note: "세대와 계절에 맞춘 이야기 속에서 패드·세럼·마스크를 소개.", url: "https://www.tiktok.com/@ahnestkitchen/video/7577087315995020574", thumb: "/refer/curated/ref-7577087315995020574.jpg" },
  { id: "7661683037863791903", brand: "LANEIGE", brandKo: "라네즈", handle: "darcymcqueenyyy", format: "매장 체험", title: "서울 라네즈 매장에서 만난 립 마스크", note: "크리에이터의 시선으로 매장 방문과 제품 경험을 전하는 브이로그.", url: "https://www.tiktok.com/@darcymcqueenyyy/video/7661683037863791903", thumb: "/refer/curated/ref-7661683037863791903.jpg" },
  { id: "7649075165657140494", brand: "Torriden", brandKo: "토리든", handle: "vykpnguyen", format: "행사·체험", title: "댈러스 크리에이터 행사 현장", note: "브랜드 행사장의 체험 장면과 방문 경험을 담은 현장형 콘텐츠.", url: "https://www.tiktok.com/@vykpnguyen/video/7649075165657140494", thumb: "/refer/curated/ref-7649075165657140494.jpg" },
  { id: "7648965161792949522", brand: "3CE", brandKo: "쓰리씨이", handle: "naa._.aru", format: "립 발색 리뷰", title: "광택과 컬러를 가까이 보여주는 틴트", note: "제품을 든 장면과 입술 클로즈업으로 틴트의 발색·광택을 소개.", url: "https://www.tiktok.com/@naa._.aru/video/7648965161792949522", thumb: "/refer/curated/ref-7648965161792949522.jpg" },
  { id: "7591769489012837645", brand: "Clio", brandKo: "클리오", handle: "ninapark", format: "셀럽 메이크업", title: "시상식 메이크업과 사용 제품 리스트", note: "메이크업 아티스트가 완성한 룩과 부위별 사용 제품을 함께 소개.", url: "https://www.tiktok.com/@ninapark/video/7591769489012837645", thumb: "/refer/curated/ref-7591769489012837645.jpg" },
  { id: "7521335940057419015", brand: "Mediheal", brandKo: "메디힐", handle: "jessicafentisa", format: "제품 추천", title: "재구매한 토너패드를 한눈에 소개", note: "여러 토너패드를 직접 보여주며 평소 사용 경험과 구매처를 전달.", url: "https://www.tiktok.com/@jessicafentisa/video/7521335940057419015", thumb: "/refer/curated/ref-7521335940057419015.jpg" },
  { id: "7626580551280938261", brand: "VT Cosmetics", brandKo: "브이티", handle: "koreangrandma", format: "세대별 루틴", title: "70세 크리에이터의 3단계 스킨케어", note: "크리에이터 자신의 나이와 사용 순서를 이야기로 연결한 루틴.", url: "https://www.tiktok.com/@koreangrandma/video/7626580551280938261", thumb: "/refer/curated/ref-7626580551280938261.jpg" },
  { id: "7671377861575576854", brand: "Aromatica", brandKo: "아로마티카", handle: "ailimee__", format: "헤어케어 시연", title: "두피에 직접 사용하는 헤어 세럼", note: "가르마를 따라 제품을 사용하는 장면으로 헤어케어 방법을 소개.", url: "https://www.tiktok.com/@ailimee__/video/7671377861575576854", thumb: "/refer/curated/ref-7671377861575576854.jpg" },
  { id: "7662048897132432673", brand: "Haruharu Wonder", brandKo: "하루하루원더", handle: "by.fannys", format: "나이트 루틴", title: "밤 루틴 속 로즈 스킨케어 소개", note: "생활 속 밤 루틴에 제품 소개와 오프라인 구매처 메시지를 결합.", url: "https://www.tiktok.com/@by.fannys/video/7662048897132432673", thumb: "/refer/curated/ref-7662048897132432673.jpg" },
  { id: "7597063575559015687", brand: "Fwee", brandKo: "퓌", handle: "westclau_", format: "립 조합 튜토리얼", title: "초콜릿 톤 립 라이너와 글로스 조합", note: "립 라이너와 글로스 두 제품을 하나의 컬러 조합으로 제안.", url: "https://www.tiktok.com/@westclau_/video/7597063575559015687", thumb: "/refer/curated/ref-7597063575559015687.jpg" },
  { id: "7637495706105777426", brand: "SKIN1004", brandKo: "스킨1004", handle: "tatiencorea", format: "제품 비교", title: "다섯 가지 선케어를 비교하는 설명형 콘텐츠", note: "같은 브랜드의 여러 선케어 제품을 보여주며 선택 기준을 설명.", url: "https://www.tiktok.com/@tatiencorea/video/7637495706105777426", thumb: "/refer/curated/ref-7637495706105777426.jpg" },
  { id: "7554463875261926674", brand: "Rom&nd", brandKo: "롬앤", handle: "missdarcei", format: "제품 첫인상", title: "입소문 난 립 키트를 직접 소개", note: "패키지를 먼저 보여주고 제품을 시도하는 첫인상형 콘텐츠.", url: "https://www.tiktok.com/@missdarcei/video/7554463875261926674", thumb: "/refer/curated/ref-7554463875261926674.jpg" },
  { id: "7665035439610383638", brand: "Beauty of Joseon", brandKo: "조선미녀", handle: "kaynatt.m", format: "메이크업 전 루틴", title: "메이크업 전 세럼 사용 장면", note: "파운데이션 전 피부 준비라는 일상 고민에서 세럼 사용으로 연결.", url: "https://www.tiktok.com/@kaynatt.m/video/7665035439610383638", thumb: "/refer/curated/ref-7665035439610383638.jpg" },
];
