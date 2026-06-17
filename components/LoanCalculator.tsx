"use client";

import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/formatters";

const LOAN_TERMS = [
  { value: 10, label: "10 Years (Standard)" },
  { value: 15, label: "15 Years" },
  { value: 20, label: "20 Years" },
  { value: 25, label: "25 Years" },
];

const DEFAULTS = {
  amount: 50_000,
  rate: 5.5,
  term: 10,
  income: 55_000,
};

function amortizedMonthly(principal: number, ratePct: number, years: number): number {
  if (principal <= 0 || years <= 0) return 0;
  const r = ratePct / 100 / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  const g = Math.pow(1 + r, n);
  return (principal * (r * g)) / (g - 1);
}

export function LoanCalculator() {
  const [amount, setAmount] = useState<number>(DEFAULTS.amount);
  const [rate, setRate] = useState<number>(DEFAULTS.rate);
  const [term, setTerm] = useState<number>(DEFAULTS.term);
  const [income, setIncome] = useState<number>(DEFAULTS.income);

  const { monthly, totalPaid, totalInterest, paymentToIncome } = useMemo(() => {
    const m = amortizedMonthly(amount, rate, term);
    const tp = m * term * 12;
    const ti = tp - amount;
    const pti = income > 0 ? (m * 12) / income : 0;
    return { monthly: m, totalPaid: tp, totalInterest: ti, paymentToIncome: pti };
  }, [amount, rate, term, income]);

  function reset() {
    setAmount(DEFAULTS.amount);
    setRate(DEFAULTS.rate);
    setTerm(DEFAULTS.term);
    setIncome(DEFAULTS.income);
  }

  return (
    <section
      id="calculator"
      className="rounded-2xl border border-brand-green-100 bg-white p-6 shadow-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-brand-green-700">
          💰 Student Loan Calculator
        </h2>
        <button
          type="button"
          onClick={reset}
          className="rounded-md border border-brand-green-600 px-4 py-1.5 text-sm font-medium text-brand-green-700 transition-colors hover:bg-brand-green-50"
        >
          Reset
        </button>
      </div>
      <p className="mt-1 text-sm text-brand-gray-500">
        Quick monthly payment estimate. Adjust any value to see it update live.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field
          label="Total Loan Amount ($)"
          value={amount}
          onChange={setAmount}
        />
        <Field
          label="Interest Rate (%)"
          value={rate}
          step={0.1}
          onChange={setRate}
        />
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-brand-gray-500">
            Loan Term (Years)
          </span>
          <select
            value={term}
            onChange={(e) => setTerm(Number(e.target.value))}
            className="h-11 rounded-md border border-brand-gray-200 bg-white px-3 text-base focus:border-brand-green-600 focus:outline-none focus:ring-2 focus:ring-brand-green-100"
          >
            {LOAN_TERMS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <Field
          label="Expected Annual Income ($)"
          value={income}
          onChange={setIncome}
        />
      </div>

      <div className="mt-6 rounded-xl bg-brand-green-50 p-5">
        <h3 className="mb-4 text-base font-semibold text-brand-green-700">
          Your Loan Summary
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <Result label="Monthly Payment" value={formatCurrency(monthly)} highlight />
          <Result label="Total Interest" value={formatCurrency(totalInterest)} />
          <Result label="Total Amount Paid" value={formatCurrency(totalPaid)} />
        </div>
        {income > 0 && monthly > 0 && (
          <p className="mt-4 text-sm text-brand-gray-600">
            That payment is{" "}
            <strong
              className={
                paymentToIncome > 0.15
                  ? "text-brand-red-600"
                  : "text-brand-green-700"
              }
            >
              {Math.round(paymentToIncome * 100)}%
            </strong>{" "}
            of your expected gross annual income. Standard guidance keeps total
            student-loan payments under 10–15%.
          </p>
        )}
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-brand-gray-500">
        {label}
      </span>
      <input
        type="number"
        inputMode="decimal"
        value={Number.isFinite(value) ? value : 0}
        step={step}
        min={0}
        onChange={(e) => {
          const n = Number(e.target.value);
          onChange(Number.isFinite(n) ? n : 0);
        }}
        className="h-11 rounded-md border border-brand-gray-200 bg-white px-3 text-base focus:border-brand-green-600 focus:outline-none focus:ring-2 focus:ring-brand-green-100"
      />
    </label>
  );
}

function Result({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg bg-white p-4 text-center shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-brand-gray-500">
        {label}
      </div>
      <div
        className={`mt-1 font-bold ${
          highlight ? "text-3xl text-brand-green-700" : "text-2xl text-brand-black"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
