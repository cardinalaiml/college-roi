import { NextResponse } from "next/server";
import { getSupabaseAnon } from "@/lib/supabase/server";
import { createSlug } from "@/lib/formatters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PostgREST embedded join: institutions → costs + outcomes by unit_id PK
const COLUMNS =
  "unit_id, name, city, state, control, " +
  "costs(net_price_public, net_price_private), " +
  "outcomes(median_earnings_10yr, earnings_null_reason)";

const MAX_RESULTS = 8;

type CostsRow = {
  net_price_public: number | null;
  net_price_private: number | null;
};

type OutcomesRow = {
  median_earnings_10yr: number | null;
  earnings_null_reason: string | null;
};

type InstitutionRow = {
  unit_id: number;
  name: string;
  city: string | null;
  state: string | null;
  control: 1 | 2 | 3 | null;
  costs: CostsRow | CostsRow[] | null;
  outcomes: OutcomesRow | OutcomesRow[] | null;
};

type SearchHit = {
  unit_id: number;
  name: string;
  city: string | null;
  state: string | null;
  control: 1 | 2 | 3 | null;
  net_price: number | null;
  salary_10yr: number | null;
  salary_null_reason: string | null;
  slug: string;
};

function toHit(row: InstitutionRow): SearchHit {
  // Embedded one-to-one joins can come back as either {} or [{}] depending on
  // how PostgREST infers cardinality — handle both shapes.
  const costs = Array.isArray(row.costs) ? row.costs[0] : row.costs;
  const outcomes = Array.isArray(row.outcomes) ? row.outcomes[0] : row.outcomes;
  const netPrice =
    costs?.net_price_public ?? costs?.net_price_private ?? null;
  return {
    unit_id: row.unit_id,
    name: row.name,
    city: row.city,
    state: row.state,
    control: row.control,
    net_price: netPrice,
    salary_10yr: outcomes?.median_earnings_10yr ?? null,
    salary_null_reason: outcomes?.earnings_null_reason ?? null,
    slug: createSlug(row.name),
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (!q) {
    return NextResponse.json({ results: [] });
  }

  let supabase;
  try {
    supabase = getSupabaseAnon();
  } catch {
    return NextResponse.json(
      { error: "Search is unavailable right now. Try again in a moment." },
      { status: 503 },
    );
  }

  const seen = new Set<number>();
  const hits: SearchHit[] = [];

  const fts = await supabase
    .from("institutions")
    .select(COLUMNS)
    .textSearch("search_vector", q, { type: "websearch", config: "english" })
    .limit(MAX_RESULTS);

  if (fts.error && !isMissingTable(fts.error)) {
    return NextResponse.json(
      { error: "Search is unavailable right now. Try again in a moment." },
      { status: 502 },
    );
  }

  for (const row of (fts.data ?? []) as unknown as InstitutionRow[]) {
    if (seen.has(row.unit_id)) continue;
    seen.add(row.unit_id);
    hits.push(toHit(row));
    if (hits.length >= MAX_RESULTS) break;
  }

  if (hits.length < MAX_RESULTS) {
    const safe = q.replace(/[%_]/g, (m) => `\\${m}`);
    const fallback = await supabase
      .from("institutions")
      .select(COLUMNS)
      .ilike("name", `%${safe}%`)
      .limit(MAX_RESULTS);

    if (fallback.error && !isMissingTable(fallback.error)) {
      return NextResponse.json(
        { error: "Search is unavailable right now. Try again in a moment." },
        { status: 502 },
      );
    }

    for (const row of (fallback.data ?? []) as unknown as InstitutionRow[]) {
      if (seen.has(row.unit_id)) continue;
      seen.add(row.unit_id);
      hits.push(toHit(row));
      if (hits.length >= MAX_RESULTS) break;
    }
  }

  return NextResponse.json({ results: hits });
}

function isMissingTable(err: { code?: string; message?: string }): boolean {
  // PGRST205 = table not in schema cache; 42P01 = undefined_table
  return err.code === "PGRST205" || err.code === "42P01";
}
