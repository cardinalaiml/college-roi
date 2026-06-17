import Link from "next/link";
import { Badge } from "./ui/Badge";
import { formatCurrency } from "@/lib/formatters";

export type CollegeCardProps = {
  name: string;
  city: string;
  state: string;
  control: 1 | 2 | 3;
  netPrice: number | null;
  salary10yr: number | null;
  salaryNullReason?: string | null;
  unitId: number;
  slug: string;
};

export function CollegeCard({
  name,
  city,
  state,
  control,
  netPrice,
  salary10yr,
  unitId,
  slug,
}: CollegeCardProps) {
  return (
    <Link
      href={`/college/${unitId}-${slug}`}
      className="group block rounded-xl border border-brand-gray-200 bg-white p-4 shadow-card transition-[border-color,box-shadow] duration-150 ease-out hover:border-brand-green-300 hover:shadow-card-hover"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-medium text-brand-black">{name}</h3>
        <Badge control={control} />
      </div>
      <p className="mt-1 text-sm text-brand-gray-500">
        {city}, {state}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-brand-gray-500">
        <span>
          Net Price:{" "}
          {netPrice === null ? (
            <span className="text-brand-gray-400">not available</span>
          ) : (
            <span className="font-medium text-brand-black">
              {formatCurrency(netPrice)}/yr
            </span>
          )}
        </span>
        <span className="text-brand-gray-300" aria-hidden>
          •
        </span>
        <span>
          Median salary (10yr):{" "}
          {salary10yr === null ? (
            <span className="text-brand-gray-400">suppressed</span>
          ) : (
            <span className="font-medium text-brand-black">
              {formatCurrency(salary10yr)}
            </span>
          )}
        </span>
      </div>
    </Link>
  );
}
