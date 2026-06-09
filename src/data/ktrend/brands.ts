// 110+ 글로벌 K-뷰티 핵심 브랜드 데이터베이스 (v6.0)
import type { CategoryId, CountryCode } from "./meta";

export interface Brand {
  id: string; // slug
  nameKo: string;
  nameEn: string;
  az: string; // A-Z 퀵 탭 키 (영문명 첫 글자)
  popular: boolean; // Basic 플랜 노출 상위 브랜드
  primaryCategory: CategoryId;
  topMarkets: CountryCode[];
  // featured 브랜드만 채워지는 상세 소구점
  pitch?: string;
}

// [국문, 영문] 쌍 — 영문 첫 글자로 A-Z 퀵 탭 자동 분류
const RAW: [string, string][] = [
  ["아누아", "Anua"],
  ["조선미녀", "Beauty of Joseon"],
  ["스킨1004", "Skin1004"],
  ["코스알엑스", "COSRX"],
  ["티르티르", "Tirtir"],
  ["믹순", "Mixsoon"],
  ["라네즈", "Laneige"],
  ["메디힐", "Mediheal"],
  ["센텔리안24", "Centellian24"],
  ["라운드랩", "Round Lab"],
  ["에뛰드", "Etude"],
  ["이니스프리", "Innisfree"],
  ["클리오", "Clio"],
  ["페리페라", "Peripera"],
  ["롬앤", "Romand"],
  ["힌스", "Hince"],
  ["아비브", "Abib"],
  ["달바", "dAlba"],
  ["가히", "Kahi"],
  ["메디큐브", "Medicube"],
  ["바닐라코", "Banila Co"],
  ["넘버즈인", "Numbuzin"],
  ["구달", "Goodal"],
  ["파파레서피", "Papa Recipe"],
  ["토리든", "Torriden"],
  ["일리윤", "Illiyoon"],
  ["한율", "Hanyul"],
  ["헤라", "Hera"],
  ["설화수", "Sulwhasoo"],
  ["후", "Whoo"],
  ["오휘", "Ohui"],
  ["숨37", "Sum37"],
  ["더페이스샵", "The Face Shop"],
  ["토니모리", "Tony Moly"],
  ["홀리카홀리카", "Holika Holika"],
  ["네이처리퍼블릭", "Nature Republic"],
  ["미샤", "Missha"],
  ["어퓨", "Apieu"],
  ["스킨푸드", "Skinfood"],
  ["셀리맥스", "Cellimax"],
  ["비플레인", "Beplain"],
  ["에스트라", "Aestura"],
  ["프리메라", "Primera"],
  ["아이오페", "IOPE"],
  ["한스킨", "Hanskin"],
  ["셀퓨전씨", "Cellfusion C"],
  ["차앤박", "CNP"],
  ["닥터지", "Dr.G"],
  ["이지듀", "Easydew"],
  ["리쥬란", "Rejuran"],
  ["마녀공장", "Manyo Factory"],
  ["아이소이", "Isoi"],
  ["네오젠", "Neogen"],
  ["웰라쥬", "Wellage"],
  ["닥터자르트", "Dr.Jart+"],
  ["아떼", "Athe"],
  ["에스쁘아", "Espoir"],
  ["쓰리씨이", "3CE"],
  ["투쿨포스쿨", "Too Cool For School"],
  ["릴리바이레드", "Lilybyred"],
  ["웨이크메이크", "Wakemake"],
  ["네이밍", "Naming"],
  ["데이지크", "Dasique"],
  ["에이프릴스킨", "April Skin"],
  ["포렌코즈", "Forencos"],
  ["머지", "Merzy"],
  ["삐아", "Bbia"],
  ["블랙루즈", "Black Rouge"],
  ["어뮤즈", "Amuse"],
  ["피치씨", "Peach C"],
  ["라카", "Laka"],
  ["퓌", "fwee"],
  ["네이처비", "Nature Bee"],
  ["아이미", "Aimi"],
  ["비디비치", "VDIVOV"],
  ["에이지투웨니스", "Age20s"],
  ["루나", "Luna"],
  ["케이트", "Kate"],
  ["뷰티플렉스", "Beautiplex"],
  ["참존", "Charmzone"],
  ["소망화장품", "Somang"],
  ["과일나라", "Fruit Nara"],
  ["꽃을든남자", "Flowermen"],
  ["하늘호수", "Sky Lake"],
  ["코코스타", "Cocostar"],
  ["퓨어힐스", "Pure Hills"],
  ["라곰", "Lagom"],
  ["셀퓨라", "Cellpura"],
  ["에이바이봄", "A by Bom"],
  ["원더브로우", "Wonder Brow"],
  ["프레시안", "Freshian"],
  ["더툴랩", "The Tool Lab"],
  ["블리블리", "Blithe"],
  ["휴이트", "Huxley"],
  ["퍼플", "Purplle"],
  ["스킨미소", "Skinmiso"],
  ["메이크프렘", "Make Prem"],
  ["라이크와이즈", "Likewise"],
  ["엔젤루카", "Angeluca"],
  ["코스노리", "Cosnori"],
  ["하루하루원더", "Haruharu Wonder"],
  ["라보에이치", "Labo-H"],
  ["바이오힐보", "Bio Heal BOH"],
  ["셀퓨전씨로레티노", "Roretinol"],
  ["슈에무라", "Shu Uemura"],
  ["프롬네이처", "From Nature"],
  ["스킨캐주얼", "Skin Casual"],
  ["더샘", "The Saem"],
  ["코지마", "Cojima"],
  ["메디안서", "Medianswer"],
  ["바이오던스", "Biodance"],
];

const FEATURED: Record<string, { category: CategoryId; markets: CountryCode[]; pitch: string }> = {
  Anua: {
    category: "skincare",
    markets: ["US", "TH", "VN"],
    pitch: "어성초 토너의 모공 정화 비포&애프터 챌린지로 미국·동남아 1020 타깃 라이프스타일 스킷 성공.",
  },
  "Beauty of Joseon": {
    category: "suncare",
    markets: ["US", "PH", "SG"],
    pitch: "맑은 쌀 선크림의 미국 틱톡 대바이럴. 모던 한방 성분과 미니멀 패키지 디자인 강조.",
  },
  Skin1004: {
    category: "suncare",
    markets: ["VN", "TH", "MY"],
    pitch: "센텔라 선 세럼의 백탁 없는 유기자차 강점. 동남아 고온다습 기후용 가벼운 제형 리뷰 집중.",
  },
  COSRX: {
    category: "skincare",
    markets: ["US", "SG", "PH"],
    pitch: "스네일 뮤신 에센스의 제형 ASMR·슬라임 챌린지 바이럴. 피부과 전문의 협업 마케팅.",
  },
  Tirtir: {
    category: "makeup",
    markets: ["US", "PH", "TH"],
    pitch: "레드 쿠션의 압도적 커버력 시연과 30+ 톤 쉐이드 매칭 챌린지. 유색인종 뷰티 인플루언서 중심.",
  },
};

function slugify(en: string): string {
  return en
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function azKey(en: string): string {
  const first = en.trim()[0].toUpperCase();
  return /[A-Z]/.test(first) ? first : "#";
}

const FALLBACK_CATEGORIES: CategoryId[] = ["skincare", "suncare", "makeup", "mask", "trouble", "lipcare"];
const FALLBACK_MARKETS: CountryCode[][] = [
  ["US", "TH"],
  ["US", "VN", "PH"],
  ["TH", "MY", "SG"],
  ["VN", "PH"],
  ["US", "SG"],
  ["MY", "TH", "VN"],
];

export const BRANDS: Brand[] = RAW.map(([nameKo, nameEn], i) => {
  const featured = FEATURED[nameEn];
  return {
    id: slugify(nameEn),
    nameKo,
    nameEn,
    az: azKey(nameEn),
    popular: i < 12,
    primaryCategory: featured?.category ?? FALLBACK_CATEGORIES[i % FALLBACK_CATEGORIES.length],
    topMarkets: featured?.markets ?? FALLBACK_MARKETS[i % FALLBACK_MARKETS.length],
    pitch: featured?.pitch,
  };
});

export const BRAND_MAP: Record<string, Brand> = Object.fromEntries(
  BRANDS.map((b) => [b.id, b]),
);

// A-Z 퀵 탭에 노출할 키 목록 (실제 데이터가 있는 글자만)
export const BRAND_AZ_KEYS: string[] = Array.from(
  new Set(BRANDS.map((b) => b.az)),
).sort((a, b) => (a === "#" ? 1 : b === "#" ? -1 : a.localeCompare(b)));

export const FEATURED_BRAND_IDS = Object.keys(FEATURED).map(slugify);
