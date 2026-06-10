import { calculateROI } from "./roi-calculator";

type Case = {
  name: string;
  run: () => void;
};

const cases: Case[] = [
  {
    name: "$40,000 @ 6.8% over 10 years gives monthly payment between $459 and $463",
    run: () => {
      const { monthlyPayment } = calculateROI({
        totalCost: 40_000,
        expectedSalary: 0,
        currentSalary: 0,
        interestRate: 6.8,
        loanTerm: 10,
      });
      assertBetween("monthlyPayment", monthlyPayment, 459, 463);
    },
  },
  {
    name: "Zero principal gives zero monthly payment and zero total interest",
    run: () => {
      const r = calculateROI({
        totalCost: 0,
        expectedSalary: 50_000,
        currentSalary: 30_000,
        interestRate: 6.8,
        loanTerm: 10,
      });
      assertEqual("monthlyPayment", r.monthlyPayment, 0);
      assertEqual("totalPaid", r.totalPaid, 0);
      assertEqual("totalInterest", r.totalInterest, 0);
    },
  },
  {
    name: "Zero expected salary never breaks even",
    run: () => {
      const r = calculateROI({
        totalCost: 40_000,
        expectedSalary: 0,
        currentSalary: 30_000,
        interestRate: 6.8,
        loanTerm: 10,
      });
      assertEqual("breakEvenYear", r.breakEvenYear, null);
    },
  },
  {
    name: "Free degree to a $60k job vs $0 current salary breaks even in year 1",
    run: () => {
      const r = calculateROI({
        totalCost: 0,
        expectedSalary: 60_000,
        currentSalary: 0,
        interestRate: 6.8,
        loanTerm: 10,
      });
      assertEqual("breakEvenYear", r.breakEvenYear, 1);
    },
  },
  {
    name: "Chart has exactly 20 data points",
    run: () => {
      const r = calculateROI({
        totalCost: 80_000,
        expectedSalary: 70_000,
        currentSalary: 35_000,
        interestRate: 6.8,
        loanTerm: 10,
      });
      assertEqual("chartData.length", r.chartData.length, 20);
      assertEqual("chartData[0].year", r.chartData[0].year, 1);
      assertEqual("chartData[19].year", r.chartData[19].year, 20);
    },
  },
  {
    name: "Loan payments stop after the loan term (degree path slope increases)",
    run: () => {
      const r = calculateROI({
        totalCost: 40_000,
        expectedSalary: 60_000,
        currentSalary: 30_000,
        interestRate: 6.8,
        loanTerm: 10,
      });
      const year10 = r.chartData[9].degreeEarnings;
      const year11 = r.chartData[10].degreeEarnings;
      const year12 = r.chartData[11].degreeEarnings;
      const duringRepayment = r.chartData[9].degreeEarnings - r.chartData[8].degreeEarnings;
      const afterRepayment = year12 - year11;
      // After repayment the annual delta should be the full expectedSalary
      assertBetween("post-repayment annual delta", afterRepayment, 59_999, 60_001);
      // During repayment the annual delta should be expectedSalary - annual loan cost
      assertBetween("in-repayment annual delta", year10 - r.chartData[8].degreeEarnings, duringRepayment - 0.01, duringRepayment + 0.01);
    },
  },
];

function assertEqual<T>(label: string, actual: T, expected: T): void {
  if (actual !== expected) {
    throw new Error(`${label} expected ${String(expected)}, got ${String(actual)}`);
  }
}

function assertBetween(label: string, actual: number, lo: number, hi: number): void {
  if (actual < lo || actual > hi) {
    throw new Error(`${label} expected in [${lo}, ${hi}], got ${actual}`);
  }
}

let failures = 0;
for (const c of cases) {
  try {
    c.run();
    console.log(`  ok  ${c.name}`);
  } catch (e) {
    failures++;
    console.log(`  fail ${c.name}\n       ${(e as Error).message}`);
  }
}

if (failures > 0) {
  console.log(`\n${failures} test(s) failed`);
  process.exit(1);
}
console.log(`\n${cases.length} test(s) passed`);
