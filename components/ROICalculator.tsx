"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { calculateROI } from "@/lib/roi-calculator";
import { formatCurrency } from "@/lib/formatters";

type Props = {
  defaultCost: number | null;
  defaultSalary: number | null;
};

const LOAN_TERMS = [
  { value: 10, label: "10 years" },
  { value: 20, label: "20 years" },
  { value: 25, label: "25 years" },
];

export function ROICalculator({ defaultCost, defaultSalary }: Props) {
  const [totalCost, setTotalCost] = useState<number>(
    defaultCost !== null ? defaultCost * 4 : 0,
  );
  const [expectedSalary, setExpectedSalary] = useState<number>(
    defaultSalary ?? 0,
  );
  const [currentSalary, setCurrentSalary] = useState<number>(0);
  const [interestRate, setInterestRate] = useState<number>(6.8);
  const [loanTerm, setLoanTerm] = useState<number>(10);

  const result = useMemo(
    () =>
      calculateROI({
        totalCost,
        expectedSalary,
        currentSalary,
        interestRate,
        loanTerm,
      }),
    [totalCost, expectedSalary, currentSalary, interestRate, loanTerm],
  );

  const allZero = totalCost === 0 && expectedSalary === 0;
  const noBreakEven = !allZero && result.breakEvenYear === null;
  const gainIsPositive = result.twentyYearGain >= 0;
  const breakEvenInChart =
    result.breakEvenYear !== null && result.breakEvenYear <= 20;

  return (
    <section className="rounded-xl border border-brand-gray-200 bg-white p-6 shadow-card">
      <h2 className="text-2xl font-medium text-brand-black">
        Your ROI Calculator
      </h2>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <NumberField
          label="Total degree cost ($)"
          value={totalCost}
          onChange={setTotalCost}
        />
        <NumberField
          label="Expected salary after graduation ($/year)"
          value={expectedSalary}
          onChange={setExpectedSalary}
        />
        <NumberField
          label="Current salary without degree ($/year)"
          value={currentSalary}
          onChange={setCurrentSalary}
        />
        <NumberField
          label="Loan interest rate (%)"
          value={interestRate}
          onChange={setInterestRate}
          step={0.1}
        />
        <SelectField
          label="Loan repayment term"
          value={loanTerm}
          options={LOAN_TERMS}
          onChange={setLoanTerm}
        />
      </div>

      {allZero ? (
        <p className="mt-6 rounded-md bg-brand-gray-50 p-4 text-sm text-brand-gray-500">
          Enter a degree cost and expected salary to calculate your ROI.
        </p>
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Output
              label="Monthly loan payment"
              value={formatCurrency(result.monthlyPayment)}
              size="lg"
            />
            <Output
              label="Total paid over loan term"
              value={formatCurrency(result.totalPaid)}
            />
            <Output
              label="Total interest paid"
              value={formatCurrency(result.totalInterest)}
            />
            <Output
              label="Break-even year"
              value={
                result.breakEvenYear === null
                  ? "—"
                  : `Year ${result.breakEvenYear}`
              }
              hint={
                noBreakEven
                  ? "At these salary figures, the degree does not produce a positive return within 30 years."
                  : undefined
              }
            />
            <Output
              label="20-year net gain vs no degree"
              value={formatCurrency(result.twentyYearGain)}
              tone={gainIsPositive ? "positive" : "negative"}
            />
          </div>

          <div className="mt-6">
            <ChartLegend />
            <div className="mt-2 h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={result.chartData}
                  margin={{ top: 8, right: 16, bottom: 4, left: 8 }}
                >
                  <CartesianGrid stroke="transparent" />
                  <XAxis
                    dataKey="year"
                    stroke="#9A9690"
                    tick={{ fontSize: 12, fill: "#9A9690" }}
                    axisLine={{ stroke: "#E1DFD9" }}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#9A9690"
                    tick={{ fontSize: 12, fill: "#9A9690" }}
                    axisLine={{ stroke: "#E1DFD9" }}
                    tickLine={false}
                    tickFormatter={formatAxisDollars}
                    width={60}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#ffffff",
                      border: "1px solid #E1DFD9",
                      borderRadius: 6,
                      fontSize: 14,
                    }}
                    formatter={(value, name) => [
                      formatCurrency(typeof value === "number" ? value : Number(value)),
                      name === "degreeEarnings" ? "With degree" : "Without degree",
                    ]}
                    labelFormatter={(year) => `Year ${year}`}
                  />
                  {breakEvenInChart && (
                    <ReferenceLine
                      x={result.breakEvenYear ?? undefined}
                      stroke="#9A9690"
                      strokeDasharray="3 3"
                      label={{
                        value: "Break-even",
                        position: "top",
                        fill: "#6B6762",
                        fontSize: 11,
                      }}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="degreeEarnings"
                    stroke="#2563EB"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="noDegreeEarnings"
                    stroke="#9A9690"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function NumberField({
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
      <span className="text-xs uppercase tracking-wide text-brand-gray-400">
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
        className="h-10 rounded-md border border-brand-gray-200 bg-white px-3 text-right text-base text-brand-black focus:border-brand-blue-600 focus:outline-none"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: number;
  options: { value: number; label: string }[];
  onChange: (n: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs uppercase tracking-wide text-brand-gray-400">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-10 rounded-md border border-brand-gray-200 bg-white px-3 text-base text-brand-black focus:border-brand-blue-600 focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Output({
  label,
  value,
  hint,
  tone,
  size = "md",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "positive" | "negative";
  size?: "md" | "lg";
}) {
  const toneClass =
    tone === "positive"
      ? "text-brand-green-600"
      : tone === "negative"
        ? "text-brand-red-600"
        : "text-brand-black";
  const sizeClass = size === "lg" ? "text-3xl" : "text-2xl";
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-brand-gray-400">
        {label}
      </div>
      <div className={`mt-1 font-medium ${sizeClass} ${toneClass}`}>{value}</div>
      {hint && (
        <div className="mt-1 text-xs text-brand-gray-500">{hint}</div>
      )}
    </div>
  );
}

function ChartLegend() {
  return (
    <div className="flex items-center gap-4 text-xs text-brand-gray-500">
      <span className="inline-flex items-center gap-2">
        <span
          className="inline-block h-0.5 w-4"
          style={{ background: "#2563EB" }}
        />
        With degree
      </span>
      <span className="inline-flex items-center gap-2">
        <span
          className="inline-block h-0.5 w-4 border-t border-dashed"
          style={{ borderColor: "#9A9690" }}
        />
        Without degree
      </span>
    </div>
  );
}

function formatAxisDollars(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `$${Math.round(value / 1_000)}k`;
  return `$${Math.round(value)}`;
}
