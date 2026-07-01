"use client";

import { useEffect, useRef, useState } from "react";

const TIMEOUT_MS = 12000;
// Wait this long after the last input change before asking Claude, so the
// user typing "$40,000" doesn't fan out to 6 requests.
const DEBOUNCE_MS = 600;

type Props = {
  collegeId: number;
  collegeName: string;
  calcInputs: {
    totalCost: number;
    expectedSalary: number;
    currentSalary: number;
    interestRate: number;
    loanTerm: number;
    monthlyPayment: number;
    breakEvenYear: number | null;
    twentyYearGain: number;
  };
};

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; summary: string; cached: boolean }
  | { status: "error" };

export function AISummary({ collegeId, collegeName, calcInputs }: Props) {
  const [state, setState] = useState<State>({ status: "idle" });
  const seq = useRef(0);

  // The dependency array uses primitives only so React's shallow compare works
  const {
    totalCost,
    expectedSalary,
    currentSalary,
    interestRate,
    loanTerm,
    monthlyPayment,
    breakEvenYear,
    twentyYearGain,
  } = calcInputs;

  const insufficient = totalCost <= 0 || expectedSalary <= 0;

  useEffect(() => {
    if (insufficient) {
      setState({ status: "idle" });
      return;
    }

    setState({ status: "loading" });
    const requestId = ++seq.current;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const debounce = setTimeout(async () => {
      try {
        const res = await fetch("/api/ai-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            collegeId,
            collegeName,
            calcInputs: {
              totalCost,
              expectedSalary,
              currentSalary,
              interestRate,
              loanTerm,
              monthlyPayment,
              breakEvenYear,
              twentyYearGain,
            },
          }),
          signal: controller.signal,
        });
        if (requestId !== seq.current) return;
        if (!res.ok) {
          setState({ status: "error" });
          return;
        }
        const body = (await res.json()) as { summary?: string; cached?: boolean };
        if (!body.summary) {
          setState({ status: "error" });
          return;
        }
        setState({
          status: "success",
          summary: body.summary,
          cached: Boolean(body.cached),
        });
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        if (requestId !== seq.current) return;
        setState({ status: "error" });
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(debounce);
      clearTimeout(timeout);
      controller.abort();
    };
  }, [
    collegeId,
    collegeName,
    totalCost,
    expectedSalary,
    currentSalary,
    interestRate,
    loanTerm,
    monthlyPayment,
    breakEvenYear,
    twentyYearGain,
    insufficient,
  ]);

  if (state.status === "idle" || state.status === "error") return null;

  return (
    <section
      aria-live="polite"
      className="mt-6 rounded-xl border border-brand-green-100 bg-brand-gray-50 p-5"
    >
      <div className="mb-3 flex items-center gap-2">
        <span
          aria-hidden
          className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-green-600 text-xs font-bold text-white"
        >
          AI
        </span>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-green-700">
          What this means for you
        </h3>
      </div>
      {state.status === "loading" ? (
        <div className="space-y-2" aria-hidden>
          <div className="h-3 w-11/12 animate-pulse rounded bg-brand-gray-200" />
          <div className="h-3 w-10/12 animate-pulse rounded bg-brand-gray-200" />
          <div className="h-3 w-9/12 animate-pulse rounded bg-brand-gray-200" />
        </div>
      ) : (
        <p className="text-sm leading-6 text-brand-gray-700">{state.summary}</p>
      )}
    </section>
  );
}
