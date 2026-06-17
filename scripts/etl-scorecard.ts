/**
 * Scorecard ETL.
 *
 *   1. Download "Most Recent Data" from https://collegescorecard.ed.gov/data/
 *   2. Unzip → take MERGED<year>_<year>_PP.csv → save as data/scorecard.csv
 *   3. npm run etl
 *
 * Idempotent: upserts on unit_id, safe to re-run.
 */
import fs from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import csv from "csv-parser";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

const CSV_PATH = path.resolve("data/scorecard.csv");
const BATCH_SIZE = 500;

type Row = Record<string, string>;

type College = {
  unit_id: number;
  name: string;
  city: string | null;
  state: string | null;
  control: number | null;
  net_price: number | null;
  cost_of_attendance: number | null;
  tuition_in_state: number | null;
  tuition_out_state: number | null;
  median_debt: number | null;
  monthly_payment: number | null;
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

function num(value: string | undefined): number | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  if (
    trimmed === "" ||
    trimmed === "NULL" ||
    trimmed === "PrivacySuppressed"
  ) {
    return null;
  }
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
  if (trimmed === "" || trimmed === "NULL") return null;
  return trimmed;
}

function netPriceFrom(row: Row): number | null {
  return int(row.NPT4_PUB) ?? int(row.NPT4_PRIV) ?? int(row.NPT4_PROG);
}

function salaryNullReason(value: string | undefined): string | null {
  if (value === "PrivacySuppressed") return "suppressed";
  if (value === undefined || value === null) return "not_reported";
  const trimmed = value.trim();
  if (trimmed === "" || trimmed === "NULL") return "not_reported";
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
    control: int(row.CONTROL),
    net_price: netPriceFrom(row),
    cost_of_attendance: int(row.COSTT4_A) ?? int(row.COSTT4_P),
    tuition_in_state: int(row.TUITIONFEE_IN),
    tuition_out_state: int(row.TUITIONFEE_OUT),
    median_debt: int(row.GRAD_DEBT_MDN),
    monthly_payment:
      int(row.GRAD_DEBT_MDN10YR_SUPP) ?? int(row.GRAD_DEBT_MDN10YR),
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

async function run(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "Missing env vars. Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.",
    );
    process.exit(1);
  }

  if (!fs.existsSync(CSV_PATH)) {
    console.error(`Scorecard CSV not found at ${CSV_PATH}.`);
    console.error(
      'Download "Most Recent Data" from https://collegescorecard.ed.gov/data/, unzip, and place MERGEDxxxx_xx_PP.csv at data/scorecard.csv.',
    );
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let read = 0;
  let kept = 0;
  let uploaded = 0;
  let buffer: College[] = [];

  const stream = fs.createReadStream(CSV_PATH).pipe(csv());

  async function flush(): Promise<void> {
    if (buffer.length === 0) return;
    const batch = buffer;
    buffer = [];
    await upsertBatch(supabase, batch);
    uploaded += batch.length;
    process.stdout.write(
      `\r  read ${read.toLocaleString()} • kept ${kept.toLocaleString()} • uploaded ${uploaded.toLocaleString()}`,
    );
  }

  console.log(`Reading ${CSV_PATH}...`);
  await new Promise<void>((resolve, reject) => {
    stream.on("data", (row: Row) => {
      read++;
      const college = transform(row);
      if (!college) return;
      kept++;
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

  process.stdout.write("\n");
  console.log(
    `Done. Read ${read.toLocaleString()} rows, uploaded ${uploaded.toLocaleString()}.`,
  );
}

run().catch((err) => {
  console.error("\nETL failed:", err);
  process.exit(1);
});
