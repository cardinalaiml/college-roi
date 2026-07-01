import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getSupabaseAnon } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  collegeIds?: unknown;
  calcInputs?: unknown;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!Array.isArray(body.collegeIds)) {
    return NextResponse.json(
      { error: "collegeIds must be an array of integers." },
      { status: 400 },
    );
  }

  const collegeIds = body.collegeIds
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n) && n > 0);

  if (collegeIds.length < 1 || collegeIds.length > 3) {
    return NextResponse.json(
      { error: "collegeIds must contain between 1 and 3 valid unit_id integers." },
      { status: 400 },
    );
  }

  // Dedupe while preserving order
  const seen = new Set<number>();
  const unique: number[] = [];
  for (const id of collegeIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    unique.push(id);
  }

  let supabase;
  try {
    supabase = getSupabaseAnon();
  } catch {
    return NextResponse.json(
      { error: "Comparison service unavailable." },
      { status: 503 },
    );
  }

  const shortId = nanoid(8);
  const { error } = await supabase
    .from("comparisons")
    .insert({
      short_id: shortId,
      college_ids: unique,
      calc_inputs: body.calcInputs ?? null,
    })
    .select("short_id")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to save comparison.", code: error.code },
      { status: 500 },
    );
  }

  return NextResponse.json({ shortId });
}
