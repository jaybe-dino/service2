// K-Trend Analytics — 110개 K-Beauty 브랜드 데이터베이스 (A–Y)
// 실시간으로 해외 틱톡에서 추적되는 한국 대표 뷰티 브랜드.

import type { CategoryKey } from "./meta";

export interface Brand {
  id: string;
  name: string;
  nameKo: string;
  /** 정렬/필터용 첫 알파벳 (대문자) */
  letter: string;
  categories: CategoryKey[];
}

function b(name: string, nameKo: string, categories: CategoryKey[]): Brand {
  const letter = name[0].toUpperCase();
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return { id, name, nameKo, letter, categories };
}

export const BRANDS: Brand[] = [
  // A
  b("Anua", "아누아", ["skincare"]),
  b("Abib", "아비브", ["skincare", "mask"]),
  b("AXIS-Y", "악시스와이", ["skincare"]),
  b("Aromatica", "아로마티카", ["skincare"]),
  b("APLB", "에이플비", ["skincare"]),
  b("Aestura", "에스트라", ["skincare"]),
  b("Ample:N", "앰플엔", ["skincare", "mask"]),
  b("Acwell", "악웰", ["skincare"]),
  // B
  b("Beauty of Joseon", "조선미녀", ["skincare", "suncare"]),
  b("Banila Co", "바닐라코", ["makeup", "skincare"]),
  b("Benton", "벤튼", ["skincare"]),
  b("Bring Green", "브링그린", ["skincare"]),
  b("Beplain", "비플레인", ["skincare"]),
  b("Belif", "빌리프", ["skincare"]),
  b("By Wishtrend", "바이위시트렌드", ["skincare"]),
  b("Biodance", "바이오던스", ["mask", "skincare"]),
  // C
  b("COSRX", "코스알엑스", ["skincare", "suncare"]),
  b("Centellian24", "센텔리안24", ["skincare"]),
  b("Celimax", "셀리맥스", ["skincare"]),
  b("Cell Fusion C", "셀퓨전씨", ["suncare", "skincare"]),
  b("Cosnori", "코스노리", ["makeup"]),
  b("Coreana", "코리아나", ["skincare"]),
  b("Charmzone", "참존", ["skincare"]),
  // D
  b("Dr.Jart+", "닥터자르트", ["skincare", "mask"]),
  b("Dr.G", "닥터지", ["skincare", "suncare"]),
  b("Dasique", "데이지크", ["makeup"]),
  b("d'Alba", "달바", ["skincare", "suncare"]),
  b("Derma Factory", "더마팩토리", ["skincare"]),
  b("Dewytree", "듀이트리", ["mask", "skincare"]),
  // E
  b("Etude", "에뛰드", ["makeup", "lipcare"]),
  b("Espoir", "에스쁘아", ["makeup"]),
  b("Eyenlip", "아이엔립", ["makeup", "lipcare"]),
  b("Enough", "이너프", ["mask", "skincare"]),
  b("Elizavecca", "엘리자벡카", ["skincare", "mask"]),
  // F
  b("FWEE", "퓌", ["makeup", "lipcare"]),
  b("Frudia", "프루다", ["skincare", "lipcare"]),
  b("Forencos", "포렌코스", ["mask"]),
  b("Fmgt", "에프엠지티", ["makeup"]),
  // G
  b("Goodal", "구달", ["skincare"]),
  b("Glow Recipe", "글로우레시피", ["skincare"]),
  b("Graymelin", "그레이멜린", ["skincare"]),
  b("Gowoonsesang", "고운세상", ["skincare"]),
  // H
  b("Heimish", "헤이미쉬", ["skincare", "makeup"]),
  b("Holika Holika", "홀리카홀리카", ["makeup", "skincare"]),
  b("Haruharu Wonder", "하루하루원더", ["skincare", "suncare"]),
  b("Hince", "힌스", ["makeup", "lipcare"]),
  b("Huxley", "헉슬리", ["skincare"]),
  // I
  b("Isntree", "이즈앤트리", ["skincare", "suncare"]),
  b("I'm From", "아임프롬", ["skincare", "mask"]),
  b("Innisfree", "이니스프리", ["skincare", "suncare"]),
  b("Illiyoon", "일리윤", ["skincare"]),
  b("Iope", "아이오페", ["skincare", "suncare"]),
  // J
  b("Jumiso", "주미소", ["skincare"]),
  b("Jung Saem Mool", "정샘물", ["makeup"]),
  b("JM Solution", "제이엠솔루션", ["mask", "skincare"]),
  b("Jayjun", "제이준", ["mask", "skincare"]),
  // K
  b("Klairs", "클레어스", ["skincare"]),
  b("Kahi", "가히", ["skincare", "lipcare"]),
  b("Krave Beauty", "크레이브뷰티", ["skincare"]),
  b("Keep Cool", "킵쿨", ["skincare", "suncare"]),
  // L
  b("Laneige", "라네즈", ["skincare", "lipcare"]),
  b("Lador", "라도르", ["skincare"]),
  b("LJH", "엘제이에이치", ["skincare"]),
  b("Lapcos", "랩코스", ["mask", "skincare"]),
  // M
  b("Mediheal", "메디힐", ["mask", "skincare"]),
  b("Mixsoon", "믹순", ["skincare"]),
  b("Manyo Factory", "마녀공장", ["skincare"]),
  b("Missha", "미샤", ["skincare", "makeup"]),
  b("Mary & May", "메리앤메이", ["skincare", "mask"]),
  b("Mamonde", "마몽드", ["skincare", "lipcare"]),
  b("Medicube", "메디큐브", ["skincare"]),
  b("Make Prem", "메이크프렘", ["skincare", "suncare"]),
  // N
  b("Nature Republic", "네이처리퍼블릭", ["skincare", "suncare"]),
  b("Numbuzin", "넘버즈인", ["skincare"]),
  b("Neogen", "네오젠", ["skincare", "suncare"]),
  b("Nacific", "나시픽", ["skincare"]),
  b("Naruko", "나루코", ["skincare", "mask"]),
  // O
  b("One Thing", "원씽", ["skincare"]),
  b("Ongredients", "온그리디언츠", ["skincare"]),
  b("Olivarrier", "올리바리어", ["skincare"]),
  b("Ox516", "옥스516", ["skincare"]),
  // P
  b("Purito", "퓨리토", ["skincare", "suncare"]),
  b("Pyunkang Yul", "편강율", ["skincare"]),
  b("Peripera", "페리페라", ["makeup", "lipcare"]),
  b("Petitfee", "페티페", ["mask"]),
  b("Primera", "프리메라", ["skincare"]),
  // R
  b("Round Lab", "라운드랩", ["skincare", "suncare"]),
  b("Romand", "롬앤", ["makeup", "lipcare"]),
  b("Rovectin", "로벡틴", ["skincare", "suncare"]),
  b("Re:p", "레프", ["skincare", "mask"]),
  b("Rom&nd Han All", "롬앤한올", ["makeup"]),
  // S
  b("SKIN1004", "스킨1004", ["skincare", "suncare"]),
  b("Some By Mi", "썸바이미", ["skincare", "suncare"]),
  b("Sulwhasoo", "설화수", ["skincare"]),
  b("Skinfood", "스킨푸드", ["skincare", "makeup"]),
  b("Sidmool", "시드물", ["skincare"]),
  b("Skin&Lab", "스킨앤랩", ["skincare"]),
  b("Saturday Skin", "새러데이스킨", ["skincare"]),
  b("Sungboon Editor", "성분에디터", ["skincare"]),
  b("Sioris", "시오리스", ["skincare"]),
  // T
  b("TIRTIR", "티르티르", ["makeup", "skincare"]),
  b("Torriden", "토리든", ["skincare", "suncare"]),
  b("TonyMoly", "토니모리", ["makeup", "skincare"]),
  b("The Face Shop", "더페이스샵", ["skincare", "makeup"]),
  b("Then I Met You", "덴아이멧유", ["skincare"]),
  b("Tocobo", "토코보", ["skincare", "suncare"]),
  b("Tia'm", "티아무", ["skincare"]),
  // U
  b("Unleashia", "언리시아", ["makeup"]),
  b("UIQ", "유아이큐", ["skincare"]),
  // V
  b("VT Cosmetics", "브이티", ["skincare", "mask"]),
  b("Vant 36.5", "반트36.5", ["suncare", "skincare"]),
  b("Village 11 Factory", "빌리지일레븐팩토리", ["skincare", "mask"]),
  // W
  b("Whamisa", "화미사", ["skincare"]),
  b("Wakemake", "웨이크메이크", ["makeup", "lipcare"]),
  // Y
  b("Yadah", "야다", ["skincare", "makeup"]),
];

/** 알파벳별 카운트 (A-Z 퀵 필터용) */
export function letterCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const brand of BRANDS) {
    counts[brand.letter] = (counts[brand.letter] || 0) + 1;
  }
  return counts;
}

export const BRAND_BY_ID: Record<string, Brand> = Object.fromEntries(
  BRANDS.map((brand) => [brand.id, brand]),
);

export const TOTAL_BRANDS = BRANDS.length;
