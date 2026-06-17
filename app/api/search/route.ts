import { NextResponse } from "next/server";
import { getSupabaseAnon } from "@/lib/supabase/server";
import { createSlug } from "@/lib/formatters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLUMNS =
  "id, unit_id, name, city, state, control, net_price, salary_10yr, salary_null_reason";

const MAX_RESULTS = 8;

type CollegeRow = {
  id: number;
  unit_id: number;
  name: string;
  city: string | null;
  state: string | null;
  control: 1 | 2 | 3 | null;
  net_price: number | null;
  salary_10yr: number | null;
  salary_null_reason: string | null;
};

type SearchHit = CollegeRow & { slug: string };

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
    .from("colleges")
    .select(COLUMNS)
    .textSearch("search_vector", q, { type: "websearch", config: "english" })
    .limit(MAX_RESULTS);

  if (fts.error && !isMissingTable(fts.error)) {
    return NextResponse.json(
      { error: "Search is unavailable right now. Try again in a moment." },
      { status: 502 },
    );
  }

  for (const row of (fts.data ?? []) as CollegeRow[]) {
    if (seen.has(row.unit_id)) continue;
    seen.add(row.unit_id);
    hits.push({ ...row, slug: createSlug(row.name) });
    if (hits.length >= MAX_RESULTS) break;
  }

  if (hits.length < MAX_RESULTS) {
    const safe = q.replace(/[%_]/g, (m) => `\\${m}`);
    const fallback = await supabase
      .from("colleges")
      .select(COLUMNS)
      .ilike("name", `%${safe}%`)
      .limit(MAX_RESULTS);

    if (fallback.error && !isMissingTable(fallback.error)) {
      return NextResponse.json(
        { error: "Search is unavailable right now. Try again in a moment." },
        { status: 502 },
      );
    }

    for (const row of (fallback.data ?? []) as CollegeRow[]) {
      if (seen.has(row.unit_id)) continue;
      seen.add(row.unit_id);
      hits.push({ ...row, slug: createSlug(row.name) });
      if (hits.length >= MAX_RESULTS) break;
    }
  }

  return NextResponse.json({ results: hits });
}

function isMissingTable(err: { code?: string; message?: string }): boolean {
  // PGRST205 = table not in schema cache; 42P01 = undefined_table
  return err.code === "PGRST205" || err.code === "42P01";
}
