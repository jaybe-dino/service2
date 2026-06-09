import { gradientFor } from "@/data/ktrend/meta";

export default function BrandAvatar({
  name,
  index,
  size = 40,
  rounded = "rounded-xl",
}: {
  name: string;
  index: number;
  size?: number;
  rounded?: string;
}) {
  const [from, to] = gradientFor(index);
  const initials = name
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      className={`flex shrink-0 items-center justify-center font-bold text-white ${rounded}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        backgroundImage: `linear-gradient(135deg, ${from}, ${to})`,
      }}
    >
      {initials}
    </span>
  );
}
