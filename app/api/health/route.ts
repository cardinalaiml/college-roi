import { NextResponse } from "next/server";
import { getSupabaseAnon } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Uptime-monitor endpoint: 200 when the app and database both respond,
// 503 when the database is unreachable (the process itself still being
// up is visible from the response existing at all).
export async function GET() {
  let dbOk = false;
  try {
    const supabase = getSupabaseAnon();
    const { error } = await supabase
      .from("institutions")
      .select("unit_id")
      .limit(1);
    dbOk = !error;
  } catch {
    dbOk = false;
  }

  return NextResponse.json(
    { status: dbOk ? "ok" : "degraded", db: dbOk },
    { status: dbOk ? 200 : 503 },
  );
}
