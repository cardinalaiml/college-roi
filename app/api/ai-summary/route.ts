import Anthropic from "@anthropic-ai/sdk";
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

// Sonnet 4.6 is the current mid-tier — the right level for a 3-sentence
// verdict without paying Opus rates.
const MODEL = "claude-sonnet-4-6";
const MAX_OUTPUT_TOKENS = 250;

const SYSTEM_PROMPT = `You are a financial advisor helping a student decide whether a college degree is worth the cost. You give direct, honest verdicts.

Rules:
- Write EXACTLY 3 sentences. No lists, no headers.
- Plain English at a 10th-grade reading level. No jargon. No "furthermore" or "in conclusion".
- Sentence 1: state the verdict (worth it / not worth it / borderline) with the single strongest reason.
- Sentence 2: reference the most important number the student should weigh.
- Sentence 3: name one specific action they should take next (e.g. negotiate aid, consider in-state, revisit expected salary).
- Never fabricate numbers. Use only the figures given in the prompt.`;

type Body = {
  collegeId?: unknown;
  collegeName?: unknown;
  calcInputs?: {
    totalCost?: number;
    expectedSalary?: number;
    currentSalary?: number;
    interestRate?: number;
    loanTerm?: number;
    monthlyPayment?: number;
    breakEvenYear?: number | null;
    twentyYearGain?: number;
  };
};

function fmtDollar(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "not specified";
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function buildUserPrompt(collegeName: string, calc: NonNullable<Body["calcInputs"]>): string {
  return [
    `The student is considering ${collegeName}.`,
    `Total degree cost: ${fmtDollar(calc.totalCost)}.`,
    `Expected salary after graduation: ${fmtDollar(calc.expectedSalary)}/year.`,
    `Current salary without the degree: ${fmtDollar(calc.currentSalary)}/year.`,
    `Monthly loan payment: ${fmtDollar(calc.monthlyPayment)}.`,
    `Break-even year: ${calc.breakEvenYear ?? "no break-even within 30 years"}.`,
    `20-year net gain vs no degree: ${fmtDollar(calc.twentyYearGain)}.`,
    "",
    "Write the 3-sentence verdict now.",
  ].join(" ");
}

// 10 requests per IP per minute — this route is the only one that spends
// money per call, so it gets the tightest limit.
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

export async function POST(request: Request) {
  const limited = rateLimit(clientIp(request), RATE_LIMIT, RATE_WINDOW_MS);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a minute." },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const collegeId = Number(body.collegeId);
  const collegeName = typeof body.collegeName === "string" ? body.collegeName.trim() : "";
  const calc = body.calcInputs;
  if (!Number.isInteger(collegeId) || collegeId <= 0 || !collegeName || !calc) {
    return NextResponse.json({ error: "Missing collegeId, collegeName or calcInputs." }, { status: 400 });
  }
  if (!calc.totalCost || !calc.expectedSalary) {
    return NextResponse.json(
      { error: "Not enough inputs — need at least a total cost and expected salary." },
      { status: 400 },
    );
  }

  // Deterministic hash: same college + same calc inputs → same cache row.
  // We hash only the parameters that affect the verdict.
  const inputHash = createHash("sha256")
    .update(
      JSON.stringify({
        c: collegeId,
        tc: calc.totalCost,
        es: calc.expectedSalary,
        cs: calc.currentSalary ?? 0,
        ir: calc.interestRate ?? 6.8,
        lt: calc.loanTerm ?? 10,
        mp: Math.round(calc.monthlyPayment ?? 0),
        be: calc.breakEvenYear ?? null,
        tyg: Math.round(calc.twentyYearGain ?? 0),
      }),
    )
    .digest("hex");

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return NextResponse.json(
      { error: "Summary service is not configured." },
      { status: 503 },
    );
  }

  // Cache lookup — roi_cache is server-only (no anon RLS policy)
  const { data: cached } = await supabase
    .from("roi_cache")
    .select("summary")
    .eq("college_id", collegeId)
    .eq("input_hash", inputHash)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (cached?.summary) {
    return NextResponse.json({ summary: cached.summary, cached: true });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI summary is not configured (missing ANTHROPIC_API_KEY)." },
      { status: 503 },
    );
  }

  const client = new Anthropic({ apiKey });
  let summary = "";
  let promptTokens = 0;
  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      // system prompt is stable across every call — cache it so we only
      // pay full prompt tokens once every ~5 minutes.
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        { role: "user", content: buildUserPrompt(collegeName, calc) },
      ],
    });

    const first = message.content[0];
    if (first?.type === "text") summary = first.text.trim();
    promptTokens =
      (message.usage.input_tokens ?? 0) +
      (message.usage.cache_read_input_tokens ?? 0) +
      (message.usage.cache_creation_input_tokens ?? 0);
  } catch (err) {
    console.error("Claude call failed:", err);
    return NextResponse.json(
      { error: "Couldn’t generate a summary right now. Try again in a moment." },
      { status: 502 },
    );
  }

  if (!summary) {
    return NextResponse.json({ error: "Empty summary from model." }, { status: 502 });
  }

  // Fire-and-forget cache insert. If it fails we still return the summary.
  supabase
    .from("roi_cache")
    .insert({
      college_id: collegeId,
      input_hash: inputHash,
      summary,
      model: MODEL,
      prompt_tokens: promptTokens,
    })
    .then(() => {}, (e) => console.error("roi_cache insert failed:", e));

  return NextResponse.json({ summary, cached: false });
}
