import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { MetricCard } from "@/components/ui/MetricCard";
import { ROICalculator } from "@/components/ROICalculator";
import {
  EXAMPLE_COLLEGES,
  findExampleByUnitId,
  type ExampleCollege,
} from "@/lib/example-colleges";
import { formatCurrency, formatPercent, formatSalaryNull } from "@/lib/formatters";

type Params = { slug: string };

function unitIdFromSlug(slug: string): number | null {
  const head = slug.split("-")[0];
  const n = Number.parseInt(head, 10);
  return Number.isFinite(n) ? n : null;
}

function loadCollege(slug: string): ExampleCollege | null {
  const unitId = unitIdFromSlug(slug);
  if (unitId === null) return null;
  return findExampleByUnitId(unitId);
}

export function generateStaticParams(): Params[] {
  return EXAMPLE_COLLEGES.map((c) => ({
    slug: `${c.unitId}-${c.slug}`,
  }));
}

export function generateMetadata({
  params,
}: {
  params: Params;
}): Metadata {
  const college = loadCollege(params.slug);
  if (!college) {
    return { title: "College not found" };
  }
  const priceLine =
    college.netPrice !== null
      ? `The real cost of ${college.name} is ${formatCurrency(college.netPrice)}/year.`
      : `See the full cost breakdown and salary outcomes for ${college.name}.`;
  const salaryLine =
    college.salary10yr !== null
      ? ` Median salary 10 years after graduation: ${formatCurrency(college.salary10yr)}.`
      : "";
  return {
    title: `${college.name} Cost and ROI`,
    description: `${priceLine}${salaryLine} See if ${college.name} is worth it.`,
    openGraph: {
      title: `${college.name} Cost and ROI | TassleCost`,
      description: `${priceLine}${salaryLine}`,
      type: "website",
    },
    alternates: {
      canonical: `/college/${params.slug}`,
    },
  };
}

export default function CollegePage({ params }: { params: Params }) {
  const college = loadCollege(params.slug);
  if (!college) notFound();

  const salaryDisplay =
    college.salary10yr !== null
      ? { value: formatCurrency(college.salary10yr), message: "" }
      : college.salary6yr !== null
        ? {
            value: formatCurrency(college.salary6yr),
            message: "6-year figure shown; 10-year not reported.",
          }
        : {
            value: null,
            message: formatSalaryNull(college.salaryNullReason),
          };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header>
        <h1 className="text-3xl font-medium text-brand-black">{college.name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-brand-gray-500">
          <span>
            {college.city}, {college.state}
          </span>
          <span aria-hidden className="text-brand-gray-300">
            •
          </span>
          <Badge control={college.control} />
        </div>
      </header>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Net Price Per Year"
          value={
            college.netPrice !== null ? formatCurrency(college.netPrice) : null
          }
          nullMessage="Net price data is not available for this school."
        />
        <MetricCard
          label="Graduation Rate"
          value={
            college.graduationRate !== null
              ? formatPercent(college.graduationRate)
              : null
          }
          nullMessage="Graduation rate not reported."
        />
        <MetricCard
          label="Median Salary, 10 Years Out"
          value={salaryDisplay.value}
          nullMessage={salaryDisplay.message}
        />
        <MetricCard
          label="Estimated Monthly Loan Payment"
          value={
            college.monthlyDebtPayment !== null
              ? `${formatCurrency(college.monthlyDebtPayment)}/mo`
              : null
          }
          nullMessage="Monthly payment estimate not available."
        />
      </section>

      <div className="mt-8">
        <ROICalculator
          defaultCost={college.netPrice}
          defaultSalary={college.salary10yr}
        />
      </div>
    </div>
  );
}
