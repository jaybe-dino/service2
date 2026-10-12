export interface RetailCo { c: string; name: string; form: string; items: string; url: string }
// 데이터는 retail.json 에서 로드(번들러 JSON 로더 사용 — 대용량 단일 리터럴 파싱 회피).
import cos from "./retail.json";
export const RETAIL_COS: RetailCo[] = cos as RetailCo[];
