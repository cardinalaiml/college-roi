import type { Metadata } from "next";
import Link from "next/link";
import { getSupabaseAnon } from "@/lib/supabase/server";
import { STATES } from "@/lib/states";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Browse Colleges by State | Tassel CO$T",
  description:
    "Browse 6,000+ U.S. colleges and universities by state. Compare net price, student debt, graduation outcomes, and ROI using official Department of Education data.",
  alternates: { canonical: "/colleges" },
};

const PAGE_SIZE = 1000;

// One paged sweep over the state column beats 51 count queries. Falls back
// to null (counts hidden) if Supabase is unreachable.
async function countByState(): Promise<Map<string, number> | null> {
  let supabase;
  try {
    supabase = getSupabaseAnon();
  } catch {
    return null;
  }

  const counts = new Map<string, number>();
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("institutions")
      .select("state")
      .order("unit_id")
      .range(from, from + PAGE_SIZE - 1);

    if (error) return null;
    if (!data || data.length === 0) break;
    for (const row of data as { state: string | null }[]) {
      if (!row.state) continue;
      counts.set(row.state, (counts.get(row.state) ?? 0) + 1);
    }
    if (data.length < PAGE_SIZE) break;
  }
  return counts;
}

export default async function CollegesIndexPage() {
  const counts = await countByState();

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 lg:py-10">
      <nav className="text-sm text-brand-gray-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-brand-green-600 hover:underline">
          Home
        </Link>{" "}
        / <span className="text-brand-black">Colleges by state</span>
      </nav>

      <header className="mt-4">
        <h1 className="text-2xl font-bold text-brand-green-700 lg:text-3xl">
          Browse colleges by state
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-brand-gray-500">
          Every U.S. institution in the Department of Education&rsquo;s College
          Scorecard, organized by state. Open a state to see each school&rsquo;s
          net price and median graduate salary, then drill into full cost,
          debt, and ROI numbers.
        </p>
      </header>

      <ul className="mt-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {STATES.map((state) => {
          const count = counts?.get(state.code);
          return (
            <li key={state.code}>
              <Link
                href={`/colleges/${state.slug}`}
                className="flex items-baseline justify-between gap-3 rounded-lg border border-brand-gray-200 bg-white px-4 py-3 text-sm shadow-card transition-colors hover:border-brand-green-300"
              >
                <span className="font-medium text-brand-black">
                  {state.name}
                </span>
                {count !== undefined && (
                  <span className="whitespace-nowrap text-xs text-brand-gray-500">
                    {count} {count === 1 ? "school" : "schools"}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
