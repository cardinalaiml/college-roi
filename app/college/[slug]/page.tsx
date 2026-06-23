import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { MetricCard } from "@/components/ui/MetricCard";
import { ROICalculator } from "@/components/ROICalculator";
import { getSupabaseAnon } from "@/lib/supabase/server";
import { formatCurrency, formatPercent } from "@/lib/formatters";

type Params = { slug: string };

export const dynamic = "force-dynamic";

// Embedded PostgREST join: institutions ← costs, debt (both 1:1 on unit_id)
const SELECT = `
  unit_id, name, city, state, control, accreditor, url, undergrad_size,
  predominant_degree, institution_level,
  costs (
    net_price_public, net_price_private,
    cost_of_attendance_academic_year, cost_of_attendance_program_year,
    tuition_in_state, tuition_out_state,
    books_supplies, room_board_on_campus, room_board_off_campus
  ),
  debt (
    median_debt_completers, monthly_payment_completers_10yr,
    pct_with_federal_loan
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
};

type DebtRow = {
  median_debt_completers: number | null;
  monthly_payment_completers_10yr: number | null;
  pct_with_federal_loan: number | null;
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

function costOfAttendance(row: CollegeRow): number | null {
  const c = oneOrFirst(row.costs);
  return (
    c?.cost_of_attendance_academic_year ??
    c?.cost_of_attendance_program_year ??
    null
  );
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
  const np = netPrice(college);
  const coa = costOfAttendance(college);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header>
        <h1 className="text-3xl font-bold text-brand-green-700">
          {college.name}
        </h1>
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
          label="Cost of Attendance"
          value={coa !== null ? formatCurrency(coa) : null}
          nullMessage="Cost of attendance not reported."
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
        </section>
      )}

      <div className="mt-8">
        <ROICalculator defaultCost={np} defaultSalary={null} />
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
