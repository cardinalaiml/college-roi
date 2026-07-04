import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AddToComparison } from "@/components/AddToComparison";
import { Badge } from "@/components/ui/Badge";
import { MetricCard } from "@/components/ui/MetricCard";
import { ROICalculator } from "@/components/ROICalculator";
import { fourYearTotal } from "@/lib/costs";
import { getSupabaseAnon } from "@/lib/supabase/server";
import { createSlug, formatCurrency, formatPercent, formatSalaryNull } from "@/lib/formatters";

type Params = { slug: string };

export const dynamic = "force-dynamic";

// Embedded PostgREST join: institutions ← costs, debt, outcomes
// (all 1:1 on unit_id)
const SELECT = `
  unit_id, name, city, state, control, accreditor, url, undergrad_size,
  predominant_degree, institution_level,
  costs (
    net_price_public, net_price_private,
    cost_of_attendance_academic_year, cost_of_attendance_program_year,
    tuition_in_state, tuition_out_state,
    books_supplies,
    room_board_on_campus, room_board_off_campus,
    other_expense_on_campus, other_expense_off_campus
  ),
  debt (
    median_debt_completers, monthly_payment_completers_10yr,
    pct_with_federal_loan
  ),
  outcomes (
    median_earnings_6yr, median_earnings_10yr,
    earnings_pct25_10yr, earnings_pct75_10yr,
    pct_earning_above_25k_10yr, earnings_null_reason
  )
`;

type CostsRow = {
  net_price_public: number | null;
  net_price_private: number | null;
  cost_of_attendance_academic_year: number | null;
  cost_of_attendance_program_year: number | null;
  tuition_in_state: number | null;
  tuition_out_state: number | null;
  books_supplies: number | null;
  room_board_on_campus: number | null;
  room_board_off_campus: number | null;
  other_expense_on_campus: number | null;
  other_expense_off_campus: number | null;
};

type DebtRow = {
  median_debt_completers: number | null;
  monthly_payment_completers_10yr: number | null;
  pct_with_federal_loan: number | null;
};

type OutcomesRow = {
  median_earnings_6yr: number | null;
  median_earnings_10yr: number | null;
  earnings_pct25_10yr: number | null;
  earnings_pct75_10yr: number | null;
  pct_earning_above_25k_10yr: number | null;
  earnings_null_reason: string | null;
};

type CollegeRow = {
  unit_id: number;
  name: string;
  city: string | null;
  state: string | null;
  control: 1 | 2 | 3 | null;
  accreditor: string | null;
  url: string | null;
  undergrad_size: number | null;
  predominant_degree: number | null;
  institution_level: number | null;
  costs: CostsRow | CostsRow[] | null;
  debt: DebtRow | DebtRow[] | null;
  outcomes: OutcomesRow | OutcomesRow[] | null;
};

function unitIdFromSlug(slug: string): number | null {
  const head = slug.split("-")[0];
  const n = Number.parseInt(head, 10);
  return Number.isFinite(n) ? n : null;
}

function oneOrFirst<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

async function loadCollege(slug: string): Promise<CollegeRow | null> {
  const unitId = unitIdFromSlug(slug);
  if (unitId === null) return null;

  let supabase;
  try {
    supabase = getSupabaseAnon();
  } catch {
    return null;
  }

  const { data, error } = await supabase
    .from("institutions")
    .select(SELECT)
    .eq("unit_id", unitId)
    .maybeSingle();

  if (error || !data) return null;
  return data as CollegeRow;
}

function netPrice(row: CollegeRow): number | null {
  const c = oneOrFirst(row.costs);
  return c?.net_price_public ?? c?.net_price_private ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const college = await loadCollege(params.slug);
  if (!college) return { title: "College not found" };

  const np = netPrice(college);
  const priceLine =
    np !== null
      ? `The real cost of ${college.name} is ${formatCurrency(np)}/year.`
      : `See the full cost breakdown for ${college.name}.`;

  return {
    title: `${college.name} Cost and ROI`,
    description: `${priceLine} See if ${college.name} is worth it.`,
    openGraph: {
      title: `${college.name} Cost and ROI | Tassel CO$T`,
      description: priceLine,
      type: "website",
    },
    alternates: { canonical: `/college/${params.slug}` },
  };
}

export default async function CollegePage({ params }: { params: Params }) {
  const college = await loadCollege(params.slug);
  if (!college) notFound();

  const costs = oneOrFirst(college.costs);
  const debt = oneOrFirst(college.debt);
  const outcomes = oneOrFirst(college.outcomes);
  const np = netPrice(college);

  // Salary display: prefer 10-year median; fall back to 6-year; otherwise
  // surface a suppression / not-reported message and keep the calculator
  // unfilled.
  const salaryValue =
    outcomes?.median_earnings_10yr ?? outcomes?.median_earnings_6yr ?? null;
  const salaryIsTenYear = outcomes?.median_earnings_10yr != null;
  const salaryNullMessage =
    salaryValue !== null
      ? salaryIsTenYear
        ? ""
        : "Showing 6-year median; 10-year salary not yet reported."
      : formatSalaryNull(outcomes?.earnings_null_reason ?? null);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 pb-32">
      <header>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-3xl font-bold text-brand-green-700">
            {college.name}
          </h1>
          <AddToComparison
            unitId={college.unit_id}
            name={college.name}
            slug={createSlug(college.name)}
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-brand-gray-500">
          {college.city && college.state && (
            <>
              <span>
                {college.city}, {college.state}
              </span>
              <span aria-hidden className="text-brand-gray-300">
                •
              </span>
            </>
          )}
          {college.control != null && (
            <Badge control={college.control as 1 | 2 | 3} />
          )}
          {college.accreditor && (
            <>
              <span aria-hidden className="text-brand-gray-300">
                •
              </span>
              <span className="text-xs text-brand-gray-500">
                Accredited by {college.accreditor}
              </span>
            </>
          )}
        </div>
      </header>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Net Price Per Year"
          value={np !== null ? formatCurrency(np) : null}
          nullMessage="Net price data is not available for this school."
        />
        <MetricCard
          label={salaryIsTenYear ? "Median Salary, 10 Years Out" : "Median Salary, 6 Years Out"}
          value={salaryValue !== null ? formatCurrency(salaryValue) : null}
          nullMessage={salaryNullMessage}
        />
        <MetricCard
          label="Median Debt at Graduation"
          value={
            debt?.median_debt_completers != null
              ? formatCurrency(debt.median_debt_completers)
              : null
          }
          nullMessage="Median debt not reported."
        />
        <MetricCard
          label="Est. Monthly Loan Payment"
          value={
            debt?.monthly_payment_completers_10yr != null
              ? `${formatCurrency(debt.monthly_payment_completers_10yr)}/mo`
              : null
          }
          nullMessage="Monthly payment estimate not available."
        />
      </section>

      {(costs?.tuition_in_state ||
        costs?.tuition_out_state ||
        costs?.books_supplies ||
        costs?.room_board_on_campus ||
        costs?.room_board_off_campus) && (
        <section className="mt-6 rounded-2xl border border-brand-green-100 bg-white p-6 shadow-card">
          <h2 className="text-lg font-bold text-brand-green-700">
            Cost breakdown (per year)
          </h2>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
            <CostRow label="Tuition (in-state)" value={costs?.tuition_in_state} />
            <CostRow label="Tuition (out-of-state)" value={costs?.tuition_out_state} />
            <CostRow label="Books & supplies" value={costs?.books_supplies} />
            <CostRow label="Room & board (on-campus)" value={costs?.room_board_on_campus} />
            <CostRow label="Room & board (off-campus)" value={costs?.room_board_off_campus} />
            {debt?.pct_with_federal_loan != null && (
              <div>
                <dt className="text-xs uppercase tracking-wide text-brand-gray-500">
                  Students with federal loan
                </dt>
                <dd className="mt-0.5 text-base font-semibold text-brand-black">
                  {formatPercent(debt.pct_with_federal_loan)}
                </dd>
              </div>
            )}
          </dl>

          {(() => {
            const inStateFour = fourYearTotal(costs, "in");
            const outStateFour = fourYearTotal(costs, "out");
            if (inStateFour == null && outStateFour == null) return null;
            return (
              <div className="mt-5 grid gap-3 border-t border-brand-green-100 pt-5 sm:grid-cols-2">
                <FourYearTotal
                  label="In-state 4-year total"
                  value={inStateFour}
                />
                <FourYearTotal
                  label="Out-of-state 4-year total"
                  value={outStateFour}
                />
              </div>
            );
          })()}
          <p className="mt-3 text-xs italic text-brand-gray-500">
            4-year totals sum tuition, books, room &amp; board, and other
            expenses over four consecutive years. Actual costs rise ~3–5%/year.
          </p>
        </section>
      )}

      <div className="mt-8">
        <ROICalculator
          defaultCost={np}
          defaultSalary={salaryValue}
          college={{ unitId: college.unit_id, name: college.name }}
        />
      </div>
    </div>
  );
}

function CostRow({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-brand-gray-500">
        {label}
      </dt>
      <dd className="mt-0.5 text-base font-semibold text-brand-black">
        {value != null ? formatCurrency(value) : (
          <span className="text-sm font-normal italic text-brand-gray-400">
            Not reported
          </span>
        )}
      </dd>
    </div>
  );
}

function FourYearTotal({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  return (
    <div className="rounded-lg bg-brand-green-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-brand-green-700">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold text-brand-green-700">
        {value !== null ? formatCurrency(value) : (
          <span className="text-sm font-normal italic text-brand-gray-500">
            Tuition not reported
          </span>
        )}
      </div>
    </div>
  );
}
