/**
 * Scorecard ETL.
 *
 * Primary source: Most-Recent-Cohorts-Institution.csv
 *   - Department of Ed composites the latest reported value for each metric
 *     across cohort years. Lowest null rate (see
 *     docs/scorecard-profiling-report.md).
 *   - File lives in the Scorecard raw-data download next to the
 *     MERGED<year>_PP.csv files.
 *
 * Usage:
 *   # Dry-run (no DB writes — prints populated counts per field)
 *   npm run etl -- --dry-run
 *
 *   # Real load
 *   npm run etl
 *
 *   # Custom path
 *   SCORECARD_CSV=/path/to/file.csv npm run etl
 *
 * Idempotent on unit_id; safe to re-run.
 */
import fs from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import csv from "csv-parser";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

const BATCH_SIZE = 500;
const DRY_RUN = process.argv.includes("--dry-run");

// Look in these locations in order. First file that exists wins.
const CANDIDATE_PATHS = [
  process.env.SCORECARD_CSV,
  "data/Most-Recent-Cohorts-Institution.csv",
  path.resolve(
    process.env.HOME ?? "",
    "Desktop/College_Scorecard_Raw_Data_03232026/Most-Recent-Cohorts-Institution.csv",
  ),
  "data/scorecard.csv",
].filter((p): p is string => Boolean(p));

type Row = Record<string, string>;

type College = {
  unit_id: number;
  name: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  control: number | null;
  net_price: number | null;
  cost_of_attendance: number | null;
  tuition_in_state: number | null;
  tuition_out_state: number | null;
  books_supplies: number | null;
  room_board_on: number | null;
  room_board_off: number | null;
  other_expense_on: number | null;
  other_expense_off: number | null;
  other_expense_fam: number | null;
  median_debt: number | null;
  monthly_payment: number | null;
  pct_with_loan: number | null;
  salary_6yr: number | null;
  salary_10yr: number | null;
  salary_null_reason: string | null;
  graduation_rate: number | null;
  retention_rate: number | null;
  undergrad_size: number | null;
  pred_degree: number | null;
  accreditor: string | null;
  url: string | null;
};

// Scorecard sentinel tokens that mean "no value".
// Profiling report calls these out — without all four, NA and PS rows
// would slip through as the literal strings and fail integer coercion.
const NULL_TOKENS = new Set(["", "NULL", "PrivacySuppressed", "NA", "PS"]);

function num(value: string | undefined): number | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  if (NULL_TOKENS.has(trimmed)) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function int(value: string | undefined): number | null {
  const n = num(value);
  return n === null ? null : Math.round(n);
}

function str(value: string | undefined): string | null {
  if (value === undefined) return null;
  const trimmed = value.trim();
  if (NULL_TOKENS.has(trimmed)) return null;
  return trimmed;
}

function netPriceFrom(row: Row): number | null {
  return int(row.NPT4_PUB) ?? int(row.NPT4_PRIV) ?? int(row.NPT4_PROG);
}

function salaryNullReason(value: string | undefined): string | null {
  if (value === undefined || value === null) return "not_reported";
  const trimmed = value.trim();
  if (trimmed === "PrivacySuppressed" || trimmed === "PS") return "suppressed";
  if (NULL_TOKENS.has(trimmed)) return "not_reported";
  return null;
}

function transform(row: Row): College | null {
  const unitId = int(row.UNITID);
  const name = str(row.INSTNM);
  if (unitId === null || name === null) return null;
  return {
    unit_id: unitId,
    name,
    city: str(row.CITY),
    state: str(row.STABBR),
    zip: str(row.ZIP),
    control: int(row.CONTROL),
    net_price: netPriceFrom(row),
    cost_of_attendance: int(row.COSTT4_A) ?? int(row.COSTT4_P),
    tuition_in_state: int(row.TUITIONFEE_IN),
    tuition_out_state: int(row.TUITIONFEE_OUT),
    books_supplies: int(row.BOOKSUPPLY),
    room_board_on: int(row.ROOMBOARD_ON),
    room_board_off: int(row.ROOMBOARD_OFF),
    other_expense_on: int(row.OTHEREXPENSE_ON),
    other_expense_off: int(row.OTHEREXPENSE_OFF),
    other_expense_fam: int(row.OTHEREXPENSE_FAM),
    median_debt: int(row.GRAD_DEBT_MDN),
    monthly_payment:
      int(row.GRAD_DEBT_MDN10YR_SUPP) ?? int(row.GRAD_DEBT_MDN10YR),
    pct_with_loan: num(row.PCTFLOAN),
    salary_6yr: int(row.MD_EARN_WNE_P6),
    salary_10yr: int(row.MD_EARN_WNE_P10),
    salary_null_reason: salaryNullReason(row.MD_EARN_WNE_P10),
    graduation_rate: num(row.C150_4) ?? num(row.C150_L4),
    retention_rate: num(row.RET_FT4) ?? num(row.RET_FTL4),
    undergrad_size: int(row.UGDS),
    pred_degree: int(row.PREDDEG),
    accreditor: str(row.ACCREDAGENCY),
    url: str(row.INSTURL),
  };
}

async function upsertBatch(
  supabase: SupabaseClient,
  batch: College[],
): Promise<void> {
  if (batch.length === 0) return;
  const { error } = await supabase
    .from("colleges")
    .upsert(batch, { onConflict: "unit_id" });
  if (error) {
    throw new Error(`Upsert failed (${batch.length} rows): ${error.message}`);
  }
}

function resolveCsvPath(): string {
  for (const p of CANDIDATE_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  console.error("Scorecard CSV not found. Looked in:");
  for (const p of CANDIDATE_PATHS) console.error(`  • ${p}`);
  console.error(
    '\nDownload "Most Recent Data" from https://collegescorecard.ed.gov/data/',
  );
  console.error(
    "and either place Most-Recent-Cohorts-Institution.csv at data/ or",
  );
  console.error("set SCORECARD_CSV=/absolute/path/to/file.csv");
  process.exit(1);
}

async function run(): Promise<void> {
  const csvPath = resolveCsvPath();
  console.log(`Source: ${csvPath}`);
  console.log(DRY_RUN ? "Mode: DRY RUN (no DB writes)\n" : "Mode: LIVE LOAD\n");

  let supabase: SupabaseClient | null = null;
  if (!DRY_RUN) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      console.error(
        "Missing env vars. Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.\n" +
          "(Use --dry-run to profile without env vars.)",
      );
      process.exit(1);
    }
    supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  let read = 0;
  let kept = 0;
  let uploaded = 0;
  let buffer: College[] = [];

  // Track how many records have each field populated, for the dry-run report.
  const populated: Record<keyof College, number> = Object.create(null);

  const stream = fs.createReadStream(csvPath).pipe(csv());

  async function flush(): Promise<void> {
    if (buffer.length === 0) return;
    const batch = buffer;
    buffer = [];
    if (supabase) {
      await upsertBatch(supabase, batch);
      uploaded += batch.length;
    }
    process.stdout.write(
      `\r  read ${read.toLocaleString()} • kept ${kept.toLocaleString()}` +
        (supabase ? ` • uploaded ${uploaded.toLocaleString()}` : ""),
    );
  }

  await new Promise<void>((resolve, reject) => {
    stream.on("data", (row: Row) => {
      read++;
      const college = transform(row);
      if (!college) return;
      kept++;
      for (const key of Object.keys(college) as (keyof College)[]) {
        if (college[key] !== null) populated[key] = (populated[key] ?? 0) + 1;
      }
      buffer.push(college);

      if (buffer.length >= BATCH_SIZE) {
        stream.pause();
        flush()
          .then(() => stream.resume())
          .catch(reject);
      }
    });
    stream.on("end", () => {
      flush().then(resolve).catch(reject);
    });
    stream.on("error", reject);
  });

  process.stdout.write("\n\n");
  console.log(
    `Read ${read.toLocaleString()} rows. Kept ${kept.toLocaleString()} after transform.`,
  );
  if (supabase) {
    console.log(`Uploaded ${uploaded.toLocaleString()} to Supabase.`);
  }

  // Populated-counts report
  console.log("\nPopulated counts per field:");
  console.log("─".repeat(56));
  const denominator = kept || 1;
  const rows = Object.entries(populated)
    .map(([field, count]) => ({
      field,
      count,
      pct: (count / denominator) * 100,
    }))
    .sort((a, b) => b.pct - a.pct);

  const fieldWidth = Math.max(...rows.map((r) => r.field.length));
  for (const r of rows) {
    const bar = "█".repeat(Math.round(r.pct / 5));
    console.log(
      `  ${r.field.padEnd(fieldWidth)}  ${r.pct.toFixed(1).padStart(5)}%  ${r.count.toLocaleString().padStart(6)} / ${kept.toLocaleString()}  ${bar}`,
    );
  }

  // Per-field gaps surface anything dropped during transform
  const missing = (
    [
      "unit_id",
      "name",
      "city",
      "state",
    ] as (keyof College)[]
  ).filter((k) => (populated[k] ?? 0) < kept);
  if (missing.length > 0) {
    console.log(
      `\n  Warning — these required-ish fields had nulls in some rows: ${missing.join(", ")}`,
    );
  }
}

run().catch((err) => {
  console.error("\nETL failed:", err);
  process.exit(1);
});
