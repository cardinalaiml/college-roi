import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CollegeCard } from "@/components/CollegeCard";
import { getSupabaseAnon } from "@/lib/supabase/server";
import { createSlug } from "@/lib/formatters";
import { stateFromSlug } from "@/lib/states";

type Params = { state: string };

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: Params }): Metadata {
  const state = stateFromSlug(params.state);
  if (!state) return {};
  return {
    title: `Colleges in ${state.name} — Costs, Debt & ROI | Tassel CO$T`,
    description: `Every college and university in ${state.name} with net price, median graduate salary, student debt, and ROI from official Department of Education data.`,
    alternates: { canonical: `/colleges/${state.slug}` },
  };
}

const PAGE_SIZE = 1000;

const COLUMNS =
  "unit_id, name, city, control, " +
  "costs(net_price_public, net_price_private), " +
  "outcomes(median_earnings_10yr, earnings_null_reason)";

type CostsRow = {
  net_price_public: number | null;
  net_price_private: number | null;
};

type OutcomesRow = {
  median_earnings_10yr: number | null;
  earnings_null_reason: string | null;
};

type Row = {
  unit_id: number;
  name: string;
  city: string | null;
  control: 1 | 2 | 3 | null;
  costs: CostsRow | CostsRow[] | null;
  outcomes: OutcomesRow | OutcomesRow[] | null;
};

function oneOrFirst<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

// null = Supabase unreachable (show the error state, not "no colleges")
async function loadColleges(code: string): Promise<Row[] | null> {
  let supabase;
  try {
    supabase = getSupabaseAnon();
  } catch {
    return null;
  }

  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("institutions")
      .select(COLUMNS)
      .eq("state", code)
      .order("name")
      .range(from, from + PAGE_SIZE - 1);

    if (error) return null;
    if (!data || data.length === 0) break;
    rows.push(...(data as unknown as Row[]));
    if (data.length < PAGE_SIZE) break;
  }
  return rows;
}

export default async function StatePage({ params }: { params: Params }) {
  const state = stateFromSlug(params.state);
  if (!state) notFound();

  const rows = await loadColleges(state.code);

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 lg:py-10">
      <nav className="text-sm text-brand-gray-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-brand-green-600 hover:underline">
          Home
        </Link>{" "}
        /{" "}
        <Link
          href="/colleges"
          className="hover:text-brand-green-600 hover:underline"
        >
          Colleges by state
        </Link>{" "}
        / <span className="text-brand-black">{state.name}</span>
      </nav>

      <header className="mt-4">
        <h1 className="text-2xl font-bold text-brand-green-700 lg:text-3xl">
          Colleges in {state.name}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-brand-gray-500">
          {rows && rows.length > 0 && (
            <>{rows.length} institutions in the College Scorecard. </>
          )}
          Net price is the average annual cost after grants and scholarships;
          salary is the median 10 years after entry. Open a school for full
          cost, debt, and ROI details.
        </p>
      </header>

      <div className="mt-8">
        {rows === null ? (
          <p
            role="alert"
            className="rounded-lg border border-brand-red-100 bg-brand-red-50 p-4 text-sm text-brand-red-600"
          >
            College data is unavailable right now. Try again in a moment.
          </p>
        ) : rows.length === 0 ? (
          <p className="rounded-lg border border-brand-gray-200 bg-white p-4 text-sm text-brand-gray-500">
            No institutions in {state.name} are listed in the current College
            Scorecard data.
          </p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {rows.map((row) => {
              const costs = oneOrFirst(row.costs);
              const outcomes = oneOrFirst(row.outcomes);
              return (
                <li key={row.unit_id}>
                  <CollegeCard
                    name={row.name}
                    city={row.city ?? ""}
                    state={state.code}
                    control={(row.control ?? 2) as 1 | 2 | 3}
                    netPrice={
                      costs?.net_price_public ??
                      costs?.net_price_private ??
                      null
                    }
                    salary10yr={outcomes?.median_earnings_10yr ?? null}
                    salaryNullReason={outcomes?.earnings_null_reason ?? null}
                    unitId={row.unit_id}
                    slug={createSlug(row.name)}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
