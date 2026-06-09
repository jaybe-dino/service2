// 브랜드/크리에이터 이니셜 아바타 (정적 placeholder)
function hueFromString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}

export default function BrandAvatar({
  name,
  size = 22,
}: {
  name: string;
  size?: number;
}) {
  const hue = hueFromString(name);
  const initials = name
    .replace(/[^a-zA-Z가-힣\s]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: `linear-gradient(135deg, hsl(${hue} 70% 55%), hsl(${(hue + 40) % 360} 70% 45%))`,
      }}
      className="inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white"
    >
      {initials || "K"}
    </span>
  );
}
