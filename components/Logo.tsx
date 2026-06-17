import Link from "next/link";

type Props = {
  size?: "header" | "footer";
};

const SIZE: Record<NonNullable<Props["size"]>, { tile: string; cap: string; coin: string; text: string }> = {
  header: {
    tile: "h-10 w-10 rounded-lg",
    cap: "text-[24px]",
    coin: "h-[18px] w-[18px] -bottom-1 -right-1 text-[12px]",
    text: "text-xl",
  },
  footer: {
    tile: "h-8 w-8 rounded-md",
    cap: "text-[20px]",
    coin: "h-[14px] w-[14px] -bottom-1 -right-1 text-[10px]",
    text: "text-base",
  },
};

export function Logo({ size = "header" }: Props) {
  const s = SIZE[size];
  return (
    <Link href="/" className="inline-flex items-center gap-3 text-brand-black no-underline">
      <span className={`relative inline-flex items-center justify-center bg-brand-green-600 ${s.tile}`}>
        <span className={`${s.cap} leading-none`} aria-hidden>
          🎓
        </span>
        <span
          className={`absolute inline-flex items-center justify-center rounded-full bg-brand-gold-500 font-bold text-brand-green-600 shadow-sm ${s.coin}`}
          aria-hidden
        >
          $
        </span>
      </span>
      <span className={`${s.text} font-bold tracking-tight`}>
        <span className="text-brand-green-700">Tassel</span>{" "}
        <span className="text-brand-black">CO</span>
        <span className="text-brand-gold-500">$</span>
        <span className="text-brand-black">T</span>
      </span>
    </Link>
  );
}
