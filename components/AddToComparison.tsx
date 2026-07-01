"use client";

import { useComparison } from "@/lib/comparison";

type Props = {
  unitId: number;
  name: string;
  slug: string;
  variant?: "icon" | "block";
  className?: string;
};

export function AddToComparison({
  unitId,
  name,
  slug,
  variant = "block",
  className = "",
}: Props) {
  const { has, add, remove, isFull, count, max } = useComparison();
  const inComparison = has(unitId);

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (inComparison) {
      remove(unitId);
      return;
    }
    if (isFull) return;
    add({ unitId, name, slug });
  };

  const disabled = !inComparison && isFull;

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={
          inComparison ? `Remove ${name} from comparison` : `Add ${name} to comparison`
        }
        aria-pressed={inComparison}
        className={`inline-flex h-7 w-7 items-center justify-center rounded-full border text-sm transition-colors ${
          inComparison
            ? "border-brand-green-600 bg-brand-green-600 text-white hover:bg-brand-green-700"
            : disabled
              ? "cursor-not-allowed border-brand-gray-200 text-brand-gray-300"
              : "border-brand-gray-200 bg-white text-brand-green-700 hover:border-brand-green-300 hover:bg-brand-green-50"
        } ${className}`}
        title={
          inComparison
            ? "Added to comparison — click to remove"
            : disabled
              ? `Comparison full (${count} of ${max})`
              : "Add to comparison"
        }
      >
        {inComparison ? "✓" : "+"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={inComparison}
      className={`inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
        inComparison
          ? "border-brand-green-600 bg-brand-green-600 text-white hover:bg-brand-green-700"
          : disabled
            ? "cursor-not-allowed border-brand-gray-200 bg-brand-gray-100 text-brand-gray-400"
            : "border-brand-green-600 bg-white text-brand-green-700 hover:bg-brand-green-50"
      } ${className}`}
    >
      {inComparison ? "✓ In comparison" : disabled ? `Comparison full (${count}/${max})` : "+ Add to comparison"}
    </button>
  );
}
