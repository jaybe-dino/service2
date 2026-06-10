// 히어로 배경: 9:16 콘텐츠 타일이 위아래로 흐르는 마퀴 (여러 콘텐츠가 흘러가는 느낌)
// 결정론적 hue로 SSR/CSR 일치 (hydration 안전). 순수 CSS 애니메이션.
const COLS = 6;
const TILES = 6;

export default function HeroBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 flex gap-2 px-2 opacity-45">
        {Array.from({ length: COLS }).map((_, c) => {
          const hues = Array.from({ length: TILES }).map((_, i) => (c * 47 + i * 89) % 360);
          const dur = 24 + c * 5;
          const anim = c % 2 === 0 ? "kt-flow-up" : "kt-flow-down";
          return (
            <div key={c} className="min-w-0 flex-1">
              <div className="flex flex-col gap-2" style={{ animation: `${anim} ${dur}s linear infinite` }}>
                {[...hues, ...hues].map((h, k) => (
                  <div
                    key={k}
                    className="relative aspect-[9/16] w-full overflow-hidden rounded-lg shadow-sm"
                    style={{ background: `linear-gradient(160deg, hsl(${h} 68% 56%), hsl(${(h + 45) % 360} 62% 42%))` }}
                  >
                    <span className="absolute bottom-1.5 left-1.5 h-3 w-3 rounded-full bg-white/40" />
                    <span className="absolute right-1.5 top-1.5 h-1.5 w-6 rounded-full bg-white/30" />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {/* 가독성 스크림 */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-white/75 to-white" />
    </div>
  );
}
