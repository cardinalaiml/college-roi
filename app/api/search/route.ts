import { NextResponse } from "next/server";
import { getSupabaseAnon } from "@/lib/supabase/server";
import { createSlug } from "@/lib/formatters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PostgREST embedded join: institutions → costs + outcomes by unit_id PK.
// The costs join flips to !inner when a price filter is active so rows
// without cost data are excluded instead of matching everything.
function columnsFor(priceFiltered: boolean): string {
  return (
    "unit_id, name, city, state, control, " +
    `costs${priceFiltered ? "!inner" : ""}(net_price_public, net_price_private), ` +
    "outcomes(median_earnings_10yr, earnings_null_reason)"
  );
}

const MAX_RESULTS = 8;

const CONTROL_BY_TYPE: Record<string, 1 | 2 | 3> = {
  public: 1,
  private: 2,
  forprofit: 3,
};

// Net price is coalesce(net_price_public, net_price_private), so each bucket
// matches either the public figure or, when that is null, the private one.
const PRICE_BUCKETS: Record<string, { min: number | null; max: number | null }> = {
  under10: { min: null, max: 10000 },
  "10to20": { min: 10000, max: 20000 },
  "20to30": { min: 20000, max: 30000 },
  over30: { min: 30000, max: null },
};

type Filters = {
  state: string | null;
  control: 1 | 2 | 3 | null;
  priceOr: string | null;
};

function parseFilters(searchParams: URLSearchParams): Filters {
  const rawState = (searchParams.get("state") ?? "").trim().toUpperCase();
  const state = /^[A-Z]{2}$/.test(rawState) ? rawState : null;

  const control = CONTROL_BY_TYPE[searchParams.get("type") ?? ""] ?? null;

  const bucket = PRICE_BUCKETS[searchParams.get("price") ?? ""];
  let priceOr: string | null = null;
  if (bucket) {
    const pub: string[] = [];
    const priv: string[] = ["net_price_public.is.null"];
    if (bucket.min !== null) {
      pub.push(`net_price_public.gte.${bucket.min}`);
      priv.push(`net_price_private.gte.${bucket.min}`);
    }
    if (bucket.max !== null) {
      pub.push(`net_price_public.lt.${bucket.max}`);
      priv.push(`net_price_private.lt.${bucket.max}`);
    }
    priceOr = `and(${pub.join(",")}),and(${priv.join(",")})`;
  }

  return { state, control, priceOr };
}

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

  const filters = parseFilters(searchParams);
  const columns = columnsFor(filters.priceOr !== null);

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

  const fts = await applyFilters(
    supabase
      .from("institutions")
      .select(columns)
      .textSearch("search_vector", q, { type: "websearch", config: "english" }),
    filters,
  ).limit(MAX_RESULTS);

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
    const fallback = await applyFilters(
      supabase
        .from("institutions")
        .select(columns)
        .ilike("name", `%${safe}%`),
      filters,
    ).limit(MAX_RESULTS);

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

// Structurally typed so both the textSearch and ilike builders pass through
// without threading PostgrestFilterBuilder's generics.
function applyFilters<
  T extends {
    eq(column: string, value: unknown): T;
    or(filters: string, options?: { referencedTable?: string }): T;
  },
>(query: T, filters: Filters): T {
  let out = query;
  if (filters.state) out = out.eq("state", filters.state);
  if (filters.control) out = out.eq("control", filters.control);
  if (filters.priceOr) {
    out = out.or(filters.priceOr, { referencedTable: "costs" });
  }
  return out;
}

function isMissingTable(err: { code?: string; message?: string }): boolean {
  // PGRST205 = table not in schema cache; 42P01 = undefined_table
  return err.code === "PGRST205" || err.code === "42P01";
}
