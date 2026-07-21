"use client";

// 관리자 도구(버튼) — 신규(롤백 가능). 메뉴 비노출, /admin-tools 직접 접근.
// 콘솔 없이 클릭으로 수집/시드/진단 실행. 각 API는 관리자 세션(쿠키)으로 인증됨.
import { useState } from "react";

interface Result { at: string; label: string; ok: boolean; data: unknown }

export default function AdminToolsPage() {
  const [busy, setBusy] = useState<string | null>(null);
  const [log, setLog] = useState<Result[]>([]);

  async function call(label: string, path: string, method: "GET" | "POST", body?: unknown) {
    setBusy(label);
    try {
      const res = await fetch(path, {
        method,
        headers: method === "POST" ? { "Content-Type": "application/json" } : undefined,
        body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      setLog((l) => [{ at: new Date().toLocaleTimeString(), label, ok: res.ok, data }, ...l].slice(0, 20));
    } catch (e) {
      setLog((l) => [{ at: new Date().toLocaleTimeString(), label, ok: false, data: String(e) }, ...l].slice(0, 20));
    }
    setBusy(null);
  }

  const Btn = ({ label, onClick, tone = "default" }: { label: string; onClick: () => void; tone?: "default" | "primary" | "danger" }) => (
    <button onClick={onClick} disabled={busy !== null}
      className={`rounded-lg px-4 py-2.5 text-[13px] font-bold disabled:opacity-40 ${
        tone === "primary" ? "bg-pink-600 text-white" : tone === "danger" ? "border border-rose-300 text-rose-600" : "border border-slate-300 text-slate-700"
      }`}>
      {busy === label ? "실행 중…" : label}
    </button>
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-[20px] font-black">관리자 도구</h1>
      <p className="mb-5 text-[12px] text-slate-500">콘솔 없이 클릭으로 실행. 관리자 로그인 상태에서만 동작합니다.</p>

      <div className="space-y-4">
        <Section title="제품/샵 데이터">
          <Btn label="샵 수집 실행 (collect-shop)" tone="primary" onClick={() => call("샵 수집 실행 (collect-shop)", "/api/admin/collect-shop", "POST")} />
          <Btn label="샘플 시드 (US/TH/VN)" onClick={() => call("샘플 시드 (US/TH/VN)", "/api/admin/seed-products-sample", "POST", {})} />
          <Btn label="샘플 제거" tone="danger" onClick={() => call("샘플 제거", "/api/admin/seed-products-sample", "POST", { clear: true })} />
        </Section>
        <Section title="진단">
          <Btn label="샵 잡 상태 (shop-jobs-debug)" tone="primary" onClick={() => call("샵 잡 상태 (shop-jobs-debug)", "/api/admin/shop-jobs-debug", "GET")} />
          <Btn label="제품 DB 확인 (data-debug)" onClick={() => call("제품 DB 확인 (data-debug)", "/api/admin/data-debug", "GET")} />
          <Btn label="결제 설정 확인 (pay-config)" onClick={() => call("결제 설정 확인 (pay-config)", "/api/admin/pay-config", "GET")} />
        </Section>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[12px] font-bold text-slate-500">실행 결과</div>
          {log.length > 0 && <button onClick={() => setLog([])} className="text-[11px] text-slate-400 underline">지우기</button>}
        </div>
        {log.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-[12px] text-slate-400">버튼을 누르면 결과가 여기에 표시됩니다.</div>
        ) : (
          <div className="space-y-2">
            {log.map((r, i) => (
              <div key={i} className="rounded-lg border border-slate-200 p-3">
                <div className="mb-1 flex items-center gap-2 text-[11px]">
                  <span className="text-slate-400">{r.at}</span>
                  <span className={`rounded px-1.5 py-0.5 font-bold ${r.ok ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>{r.ok ? "OK" : "ERR"}</span>
                  <span className="font-semibold">{r.label}</span>
                </div>
                <pre className="max-h-[200px] overflow-auto rounded bg-slate-900 p-2 text-[11px] text-emerald-200">{JSON.stringify(r.data, null, 2)}</pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <div className="mb-2.5 text-[13px] font-black">{title}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
