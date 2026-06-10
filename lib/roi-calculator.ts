export type ROIInputs = {
  totalCost: number;
  expectedSalary: number;
  currentSalary: number;
  interestRate: number;
  loanTerm: number;
};

export type ChartPoint = {
  year: number;
  degreeEarnings: number;
  noDegreeEarnings: number;
};

export type ROIResult = {
  monthlyPayment: number;
  totalPaid: number;
  totalInterest: number;
  breakEvenYear: number | null;
  twentyYearGain: number;
  chartData: ChartPoint[];
};

const HORIZON_YEARS = 30;
const CHART_YEARS = 20;
const BREAK_EVEN_SEARCH_YEARS = 30;

export function calculateROI(inputs: ROIInputs): ROIResult {
  const {
    totalCost,
    expectedSalary,
    currentSalary,
    interestRate,
    loanTerm,
  } = inputs;

  const monthlyPayment = amortizedMonthlyPayment(
    totalCost,
    interestRate,
    loanTerm,
  );
  const numPayments = loanTerm * 12;
  const totalPaid = monthlyPayment * numPayments;
  const totalInterest = totalPaid - totalCost;

  const annualLoanCost = monthlyPayment * 12;

  let degreeCumulative = 0;
  let noDegreeCumulative = 0;
  let breakEvenYear: number | null = null;
  const chartData: ChartPoint[] = [];

  for (let year = 1; year <= HORIZON_YEARS; year++) {
    const inRepayment = year <= loanTerm;
    const annualDegree = inRepayment
      ? expectedSalary - annualLoanCost
      : expectedSalary;
    degreeCumulative += annualDegree;
    noDegreeCumulative += currentSalary;

    if (
      breakEvenYear === null &&
      year <= BREAK_EVEN_SEARCH_YEARS &&
      degreeCumulative >= noDegreeCumulative &&
      expectedSalary > 0
    ) {
      breakEvenYear = year;
    }

    if (year <= CHART_YEARS) {
      chartData.push({
        year,
        degreeEarnings: degreeCumulative,
        noDegreeEarnings: noDegreeCumulative,
      });
    }
  }

  const twentyYear = chartData[CHART_YEARS - 1] ?? null;
  const twentyYearGain = twentyYear
    ? twentyYear.degreeEarnings - twentyYear.noDegreeEarnings
    : 0;

  return {
    monthlyPayment,
    totalPaid,
    totalInterest,
    breakEvenYear,
    twentyYearGain,
    chartData,
  };
}

function amortizedMonthlyPayment(
  principal: number,
  annualRatePercent: number,
  termYears: number,
): number {
  if (principal <= 0 || termYears <= 0) return 0;
  const monthlyRate = annualRatePercent / 100 / 12;
  const numPayments = termYears * 12;
  if (monthlyRate === 0) return principal / numPayments;
  const growth = Math.pow(1 + monthlyRate, numPayments);
  return (principal * (monthlyRate * growth)) / (growth - 1);
}
