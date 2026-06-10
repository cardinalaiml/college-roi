import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
};

const BASE =
  "inline-flex h-10 items-center justify-center rounded-md px-5 text-sm font-medium transition-colors active:scale-[0.98] disabled:cursor-not-allowed";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brand-black text-white hover:bg-brand-gray-800 disabled:bg-brand-gray-200 disabled:text-brand-gray-400",
  secondary:
    "border border-brand-gray-200 bg-white text-brand-black hover:bg-brand-gray-50 disabled:bg-brand-gray-100 disabled:text-brand-gray-400",
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...rest
}: Props) {
  return (
    <button className={`${BASE} ${VARIANTS[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}
