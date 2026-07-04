import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { fourYearTotal } from "@/lib/costs";
import { getSupabaseAnon } from "@/lib/supabase/server";
import {
  createSlug,
  formatCurrency,
  formatPercent,
} from "@/lib/formatters";

type Params = { shortId: string };

export const dynamic = "force-dynamic";

const COLLEGE_SELECT = `
  unit_id, name, city, state, control,
  costs ( net_price_public, net_price_private,
          cost_of_attendance_academic_year,
          tuition_in_state, tuition_out_state,
          books_supplies, room_board_on_campus, room_board_off_campus,
          other_expense_on_campus, other_expense_off_campus ),
  debt  ( median_debt_completers, monthly_payment_completers_10yr,
          pct_with_federal_loan ),
  outcomes ( median_earnings_6yr, median_earnings_10yr,
             pct_earning_above_25k_10yr, earnings_null_reason )
`;

type CollegeRow = {
  unit_id: number;
  name: string;
  city: string | null;
  state: string | null;
  control: 1 | 2 | 3 | null;
  costs:
    | {
        net_price_public: number | null;
        net_price_private: number | null;
        cost_of_attendance_academic_year: number | null;
        tuition_in_state: number | null;
        tuition_out_state: number | null;
        books_supplies: number | null;
        room_board_on_campus: number | null;
        room_board_off_campus: number | null;
        other_expense_on_campus: number | null;
        other_expense_off_campus: number | null;
      }
    | null;
  debt:
    | {
        median_debt_completers: number | null;
        monthly_payment_completers_10yr: number | null;
        pct_with_federal_loan: number | null;
      }
    | null;
  outcomes:
    | {
        median_earnings_6yr: number | null;
        median_earnings_10yr: number | null;
        pct_earning_above_25k_10yr: number | null;
        earnings_null_reason: string | null;
      }
    | null;
};

type ComparisonRecord = {
  short_id: string;
  college_ids: number[];
  view_count: number;
};

function oneOrFirst<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

async function loadComparison(
  shortId: string,
): Promise<{ record: ComparisonRecord; colleges: CollegeRow[] } | null> {
  const supabase = getSupabaseAnon();

  const { data: record, error: cmpErr } = await supabase
    .from("comparisons")
    .select("short_id, college_ids, view_count")
    .eq("short_id", shortId)
    .maybeSingle<ComparisonRecord>();

  if (cmpErr || !record) return null;

  const { data: rows, error: collegeErr } = await supabase
    .from("institutions")
    .select(COLLEGE_SELECT)
    .in("unit_id", record.college_ids);

  if (collegeErr) return null;

  const colleges = (rows ?? []) as unknown as CollegeRow[];
  // preserve the order from college_ids
  const byId = new Map(colleges.map((c) => [c.unit_id, c]));
  const ordered = record.college_ids
    .map((id) => byId.get(id))
    .filter((c): c is CollegeRow => Boolean(c));

  // Fire-and-forget view_count bump — don't block render on it
  supabase
    .from("comparisons")
    .update({ view_count: record.view_count + 1 })
    .eq("short_id", shortId)
    .then(() => {}, () => {});

  return { record, colleges: ordered };
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const loaded = await loadComparison(params.shortId);
  if (!loaded) return { title: "Comparison not found" };
  const names = loaded.colleges.map((c) => c.name).join(" vs ");
  return {
    title: `Comparing ${names}`,
    description: `Side-by-side cost, debt, and salary outcomes for ${names}.`,
    alternates: { canonical: `/compare/${params.shortId}` },
  };
}

function netPrice(c: CollegeRow): number | null {
  return (
    oneOrFirst(c.costs)?.net_price_public ??
    oneOrFirst(c.costs)?.net_price_private ??
    null
  );
}

function salary(c: CollegeRow): number | null {
  const o = oneOrFirst(c.outcomes);
  return o?.median_earnings_10yr ?? o?.median_earnings_6yr ?? null;
}

type RowConfig = {
  label: string;
  // Best = lowest value
  lowerIsBetter?: boolean;
  // Best = highest value
  higherIsBetter?: boolean;
  // Returns the raw numeric value (or null) and the rendered string
  pull: (c: CollegeRow) => { value: number | null; display: string };
};

const ROWS: RowConfig[] = [
  {
    label: "Net Price / yr",
    lowerIsBetter: true,
    pull: (c) => {
      const v = netPrice(c);
      return { value: v, display: v != null ? formatCurrency(v) : "—" };
    },
  },
  {
    label: "Cost of Attendance",
    lowerIsBetter: true,
    pull: (c) => {
      const v = oneOrFirst(c.costs)?.cost_of_attendance_academic_year ?? null;
      return { value: v, display: v != null ? formatCurrency(v) : "—" };
    },
  },
  {
    label: "Tuition (in-state)",
    lowerIsBetter: true,
    pull: (c) => {
      const v = oneOrFirst(c.costs)?.tuition_in_state ?? null;
      return { value: v, display: v != null ? formatCurrency(v) : "—" };
    },
  },
  {
    label: "Tuition (out-of-state)",
    lowerIsBetter: true,
    pull: (c) => {
      const v = oneOrFirst(c.costs)?.tuition_out_state ?? null;
      return { value: v, display: v != null ? formatCurrency(v) : "—" };
    },
  },
  {
    label: "In-state 4-year total",
    lowerIsBetter: true,
    pull: (c) => {
      const v = fourYearTotal(oneOrFirst(c.costs), "in");
      return { value: v, display: v != null ? formatCurrency(v) : "—" };
    },
  },
  {
    label: "Out-of-state 4-year total",
    lowerIsBetter: true,
    pull: (c) => {
      const v = fourYearTotal(oneOrFirst(c.costs), "out");
      return { value: v, display: v != null ? formatCurrency(v) : "—" };
    },
  },
  {
    label: "Median Salary, 10 yrs",
    higherIsBetter: true,
    pull: (c) => {
      const v = salary(c);
      return { value: v, display: v != null ? formatCurrency(v) : "—" };
    },
  },
  {
    label: "% earning > $25k @ 10yr",
    higherIsBetter: true,
    pull: (c) => {
      const v = oneOrFirst(c.outcomes)?.pct_earning_above_25k_10yr ?? null;
      return { value: v, display: v != null ? formatPercent(v) : "—" };
    },
  },
  {
    label: "Median Debt at Graduation",
    lowerIsBetter: true,
    pull: (c) => {
      const v = oneOrFirst(c.debt)?.median_debt_completers ?? null;
      return { value: v, display: v != null ? formatCurrency(v) : "—" };
    },
  },
  {
    label: "Est. Monthly Loan Payment",
    lowerIsBetter: true,
    pull: (c) => {
      const v = oneOrFirst(c.debt)?.monthly_payment_completers_10yr ?? null;
      return {
        value: v,
        display: v != null ? `${formatCurrency(v)}/mo` : "—",
      };
    },
  },
  {
    label: "% with federal loans",
    lowerIsBetter: true,
    pull: (c) => {
      const v = oneOrFirst(c.debt)?.pct_with_federal_loan ?? null;
      return { value: v, display: v != null ? formatPercent(v) : "—" };
    },
  },
];

function bestIndex(values: (number | null)[], higherBetter: boolean): number | null {
  let best: number | null = null;
  let bestIdx: number | null = null;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v == null) continue;
    if (best === null) {
      best = v;
      bestIdx = i;
      continue;
    }
    const isBetter = higherBetter ? v > best : v < best;
    if (isBetter) {
      best = v;
      bestIdx = i;
    } else if (v === best) {
      // tie — no single best
      bestIdx = null;
    }
  }
  return bestIdx;
}

export default async function ComparisonPage({ params }: { params: Params }) {
  const loaded = await loadComparison(params.shortId);
  if (!loaded) notFound();

  const { colleges } = loaded;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 pb-32">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-wide text-brand-gray-500">
          Comparison
        </p>
        <h1 className="mt-1 text-2xl font-bold text-brand-green-700 sm:text-3xl">
          {colleges.map((c) => c.name).join(" · ")}
        </h1>
        <p className="mt-1 text-sm text-brand-gray-500">
          Best value in each row highlighted in green. Share this URL — it
          reproduces the same comparison on any device.
        </p>
      </header>

      <div className="overflow-x-auto rounded-2xl border border-brand-green-100 bg-white shadow-card">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-brand-green-50 text-left">
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-brand-gray-600 w-48">
                Metric
              </th>
              {colleges.map((c) => (
                <th key={c.unit_id} className="px-4 py-3 align-top">
                  <Link
                    href={`/college/${c.unit_id}-${createSlug(c.name)}`}
                    className="block text-sm font-semibold text-brand-black hover:text-brand-green-700"
                  >
                    {c.name}
                  </Link>
                  <div className="mt-1 flex items-center gap-2 text-xs text-brand-gray-500">
                    {c.city && c.state && (
                      <span>
                        {c.city}, {c.state}
                      </span>
                    )}
                    {c.control != null && (
                      <Badge control={c.control as 1 | 2 | 3} />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, ri) => {
              const cells = colleges.map((c) => row.pull(c));
              const winner = row.higherIsBetter
                ? bestIndex(
                    cells.map((c) => c.value),
                    true,
                  )
                : row.lowerIsBetter
                  ? bestIndex(
                      cells.map((c) => c.value),
                      false,
                    )
                  : null;
              return (
                <tr
                  key={row.label}
                  className={ri % 2 === 0 ? "bg-white" : "bg-brand-gray-50"}
                >
                  <td className="px-4 py-3 text-xs font-medium text-brand-gray-600">
                    {row.label}
                  </td>
                  {cells.map((cell, ci) => (
                    <td
                      key={ci}
                      className={`px-4 py-3 text-sm font-medium ${
                        ci === winner
                          ? "bg-brand-green-50 text-brand-green-700"
                          : cell.value == null
                            ? "text-brand-gray-300"
                            : "text-brand-black"
                      }`}
                    >
                      {cell.display}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
