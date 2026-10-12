import { GATE_PAGES, EMPTY_UTM, type Utm } from "@/lib/leadgate";

// 공용 리드 게이트 화면 — 가이드북 게이트와 동일 스타일(모바일 스크롤 가능). 콘텐츠는 상위 서버 컴포넌트가 미렌더(withhold).
export default function LeadGate({ kind, semKo, utm = EMPTY_UTM, err = false }: { kind: string; semKo: string; utm?: Utm; err?: boolean }) {
  const page = GATE_PAGES[kind];
  const hidden = (["source", "medium", "campaign", "content"] as const).filter((k) => utm[k]);
  return (
    <div className="lg-ov">
      <style dangerouslySetInnerHTML={{ __html: `
        .lg-ov{position:fixed;inset:0;z-index:50;overflow-y:auto;-webkit-overflow-scrolling:touch;display:flex;justify-content:center;align-items:flex-start;padding:18px 14px;background:linear-gradient(160deg,#1e1b4b,#1a56db);font-family:'Apple SD Gothic Neo','Malgun Gothic',system-ui,sans-serif}
        .lg-card{background:#fff;border-radius:18px;padding:26px 22px;max-width:400px;width:100%;box-shadow:0 24px 70px rgba(0,0,0,.4);color:#0f172a}
        .lg-card h1{font-size:20px;margin:0 0 5px;letter-spacing:-.5px;line-height:1.25;font-weight:900}
        .lg-card p{font-size:12.5px;color:#64748b;line-height:1.5;margin:0 0 10px}
        .lg-card label{display:block;font-size:12px;font-weight:700;margin:10px 0 4px;color:#334155}
        .lg-card input{width:100%;box-sizing:border-box;border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;font-size:14px;outline:none;font-family:inherit;background:#fff;color:#0f172a}
        .lg-card input:focus{border-color:#7c3aed}
        .lg-card button{width:100%;margin-top:16px;background:#0f172a;color:#fff;border:0;border-radius:10px;padding:13px;font-size:14px;font-weight:800;cursor:pointer}
        .lg-err{margin-top:9px;font-size:12px;color:#e11d48;font-weight:700}
        .lg-ft{margin-top:12px;font-size:10px;color:#94a3b8;line-height:1.5}
        .lg-agree{display:flex;gap:7px;align-items:flex-start;margin-top:12px;font-size:11px;color:#64748b;line-height:1.45;cursor:pointer}
        .lg-agree input{width:auto;margin-top:2px;accent-color:#7c3aed}
        .lg-hp{position:absolute;left:-9999px}
      ` }} />
      <form className="lg-card" method="POST" action={`/api/leadgate?kind=${kind}`} autoComplete="on">
        <h1 dangerouslySetInnerHTML={{ __html: page.title }} />
        <p>{page.subtitle}</p>
        <label>회사명 (브랜드명)</label>
        <input name="company" required maxLength={80} placeholder="예: 디노코스메틱" />
        <label>업무용 이메일</label>
        <input name="email" type="text" required maxLength={120} placeholder="name@company.com" />
        <label>전화번호</label>
        <input name="phone" type="tel" required maxLength={40} placeholder="010-0000-0000" />
        <label>브랜드 웹사이트 <span style={{ color: "#94a3b8", fontWeight: 400 }}>(선택)</span></label>
        <input name="brand_url" type="text" maxLength={200} placeholder="예: brand.co.kr" />
        <input className="lg-hp" type="text" name="website" tabIndex={-1} autoComplete="off" />
        {hidden.map((k) => <input key={k} type="hidden" name={`utm_${k}`} value={utm[k]} />)}
        <label className="lg-agree"><input type="checkbox" name="agree" defaultChecked required /> <span><b>[필수]</b> 개인정보 수집·이용에 동의합니다.</span></label>
        <label className="lg-agree"><input type="checkbox" name="seminar" defaultChecked /> <span><b>[선택]</b> {semKo} 무료 세미나 신청</span></label>
        {err && <div className="lg-err">입력값을 확인해 주세요. (회사명·이메일·전화번호·동의 필수)</div>}
        <button type="submit">전체 자료 열람하기</button>
        <div className="lg-ft">본 자료는 비공개 자료이며 무단 복제·배포가 금지됩니다.</div>
      </form>
    </div>
  );
}
