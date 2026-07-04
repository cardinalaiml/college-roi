import type { MetadataRoute } from "next";
import { getSupabaseAnon } from "@/lib/supabase/server";
import { createSlug } from "@/lib/formatters";

const BASE_URL = "https://tasselcost.com";
const PAGE_SIZE = 1000;

// Regenerate at most once a day — the underlying Scorecard data is static
// between annual refreshes.
export const revalidate = 86400;

type Row = { unit_id: number; name: string };

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const home: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];

  let rows: Row[];
  try {
    rows = await fetchAllInstitutions();
  } catch {
    // Supabase down or misconfigured: ship the homepage rather than a 500.
    return home;
  }

  return home.concat(
    rows.map((row) => ({
      url: `${BASE_URL}/college/${row.unit_id}-${createSlug(row.name)}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  );
}

async function fetchAllInstitutions(): Promise<Row[]> {
  const supabase = getSupabaseAnon();
  const rows: Row[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("institutions")
      .select("unit_id, name")
      .order("unit_id")
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...(data as Row[]));
    if (data.length < PAGE_SIZE) break;
  }

  return rows;
}
