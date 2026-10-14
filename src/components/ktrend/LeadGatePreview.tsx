"use client";

import { useState, type ReactNode } from "react";
import { GATE_PAGES, EMPTY_UTM, type Utm } from "@/lib/leadgate-shared";

// 블러 실루엣 티저 + "정보 입력하고 전체 보기" 버튼 → 클릭 시 입력 모달. 제출은 /api/leadgate (네이티브 POST).
export default function LeadGatePreview({ kind, semKo, utm = EMPTY_UTM, err = false, children }:
  { kind: string; semKo: string; utm?: Utm; err?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(err); // 제출 검증 실패(gerr)로 돌아오면 폼을 바로 연다
  const page = GATE_PAGES[kind];
  const hidden = (["source", "medium", "campaign", "content"] as const).filter((k) => utm[k]);
  const titlePlain = page.title.replace(/<br\s*\/?>/gi, " ");

  return (
    <div className="lgp-root">
      <style dangerouslySetInnerHTML={{ __html: `
        .lgp-root{position:relative;min-height:100vh;overflow:hidden;background:var(--bg)}
        .lgp-blur{filter:blur(5px) saturate(.92);transform:scale(1.03);pointer-events:none;user-select:none;-webkit-user-select:none}
        .lgp-ov{position:fixed;inset:0;z-index:50;overflow-y:auto;-webkit-overflow-scrolling:touch;display:flex;justify-content:center;align-items:center;padding:20px 16px;background:rgba(241,245,249,.32);font-family:'Apple SD Gothic Neo','Malgun Gothic',system-ui,sans-serif}
        .lgp-cta{text-align:center;color:#0f172a;max-width:360px;width:100%;background:rgba(255,255,255,.8);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.65);border-radius:22px;padding:30px 26px;box-shadow:0 24px 70px rgba(15,23,42,.3)}
        .lgp-badge{display:inline-flex;align-items:center;gap:6px;border-radius:999px;background:var(--accent-light);color:var(--accent-deep);padding:6px 13px;font-size:11px;font-weight:800;letter-spacing:.2px}
        .lgp-h{margin:14px 0 6px;font-size:22px;font-weight:900;line-height:1.3;letter-spacing:-.5px;color:#0f172a}
        .lgp-sub{margin:0 0 20px;font-size:13px;line-height:1.6;color:#64748b}
        .lgp-btn{width:100%;border:0;border-radius:12px;background:var(--accent);color:#fff;padding:15px;font-size:15px;font-weight:900;cursor:pointer;box-shadow:0 12px 34px rgba(236,72,153,.4);transition:transform .12s,background .12s}
        .lgp-btn:hover{transform:translateY(-1px);background:var(--accent-deep)}
        .lgp-ft{margin-top:13px;font-size:10.5px;color:#94a3b8}
        /* 입력 모달(열렸을 때) */
        .lg-card{background:#fff;border-radius:18px;padding:24px 22px;max-width:400px;width:100%;box-shadow:0 24px 70px rgba(0,0,0,.45);color:#0f172a}
        .lg-card h1{font-size:19px;margin:0 0 5px;letter-spacing:-.5px;line-height:1.25;font-weight:900}
        .lg-card p{font-size:12.5px;color:#64748b;line-height:1.5;margin:0 0 10px}
        .lg-card label{display:block;font-size:12px;font-weight:700;margin:10px 0 4px;color:#334155}
        .lg-card input{width:100%;box-sizing:border-box;border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;font-size:14px;outline:none;font-family:inherit;background:#fff;color:#0f172a}
        .lg-card input:focus{border-color:#7c3aed}
        .lg-card .lg-submit{width:100%;margin-top:16px;background:#0f172a;color:#fff;border:0;border-radius:10px;padding:13px;font-size:14px;font-weight:800;cursor:pointer}
        .lg-err{margin-top:9px;font-size:12px;color:#e11d48;font-weight:700}
        .lg-agree{display:flex;gap:7px;align-items:flex-start;margin-top:12px;font-size:11px;color:#64748b;line-height:1.45;cursor:pointer}
        .lg-agree input{width:auto;margin-top:2px;accent-color:#7c3aed}
        .lg-seminar{background:#fdf2f8;border:1px solid #f9a8d4;border-radius:11px;padding:11px 12px;font-size:11.5px}
        .lg-seminar .lg-semt{display:block;color:#db2777;font-weight:800;margin-bottom:2px}
        .lg-hp{position:absolute;left:-9999px}
      ` }} />

      <div className="lgp-blur" aria-hidden>{children}</div>

      <div className="lgp-ov">
        {!open ? (
          <div className="lgp-cta">
            <span className="lgp-badge">🔒 비공개 리서치 자료</span>
            <h2 className="lgp-h">{titlePlain}</h2>
            <p className="lgp-sub">{page.subtitle}</p>
            <button type="button" className="lgp-btn" onClick={() => setOpen(true)}>정보 입력하고 전체 보기</button>
            <div className="lgp-ft">본 자료는 비공개 자료이며 무단 복제·배포가 금지됩니다.</div>
          </div>
        ) : (
          <form className="lg-card" method="POST" action={`/api/leadgate?kind=${kind}`} autoComplete="on">
            <h1 dangerouslySetInnerHTML={{ __html: page.title }} />
            <p>아래 정보를 입력하면 전체 자료를 바로 열람할 수 있습니다.</p>
            <label>회사명 (브랜드명)</label>
            <input name="company" required maxLength={80} placeholder="예: 디노코스메틱" />
            <label>업무용 이메일</label>
            <input name="email" type="text" required maxLength={120} placeholder="name@company.com" />
            <label>전화번호</label>
            <input name="phone" type="tel" required maxLength={40} placeholder="010-0000-0000" />
            <label>브랜드 웹사이트</label>
            <input name="brand_url" type="text" required maxLength={200} placeholder="예: brand.co.kr (형식 무관)" />
            <input className="lg-hp" type="text" name="website" tabIndex={-1} autoComplete="off" />
            {hidden.map((k) => <input key={k} type="hidden" name={`utm_${k}`} value={utm[k]} />)}
            <label className="lg-agree"><input type="checkbox" name="agree" defaultChecked required /> <span><b>[필수]</b> 개인정보 수집·이용에 동의합니다.</span></label>
            <label className="lg-agree lg-seminar"><input type="checkbox" name="seminar" defaultChecked /> <span><b className="lg-semt">[선택] 한국 법인으로 “틱톡샵” 온보딩&운영 세미나</b>{semKo} (zoom) 무료세미나 신청</span></label>
            {err && <div className="lg-err">입력값을 확인해 주세요. (회사명·이메일·전화번호·동의 필수)</div>}
            <button type="submit" className="lg-submit">전체 자료 열람하기</button>
          </form>
        )}
      </div>
    </div>
  );
}
