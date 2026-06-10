import type { CollegeCardProps } from "@/components/CollegeCard";

export type ExampleCollege = CollegeCardProps & {
  graduationRate: number | null;
  retentionRate: number | null;
  monthlyDebtPayment: number | null;
  salary6yr: number | null;
  costOfAttendance: number | null;
  medianDebt: number | null;
  undergradSize: number | null;
};

export const EXAMPLE_COLLEGES: ExampleCollege[] = [
  {
    name: "Massachusetts Institute of Technology",
    city: "Cambridge",
    state: "MA",
    control: 2,
    netPrice: 22230,
    salary10yr: 124200,
    salary6yr: 104680,
    salaryNullReason: null,
    unitId: 166683,
    slug: "massachusetts-institute-of-technology",
    graduationRate: 0.96,
    retentionRate: 0.99,
    monthlyDebtPayment: 247,
    costOfAttendance: 78676,
    medianDebt: 14728,
    undergradSize: 4657,
  },
  {
    name: "University of California-Los Angeles",
    city: "Los Angeles",
    state: "CA",
    control: 1,
    netPrice: 14760,
    salary10yr: 74700,
    salary6yr: 64600,
    salaryNullReason: null,
    unitId: 110662,
    slug: "university-of-california-los-angeles",
    graduationRate: 0.91,
    retentionRate: 0.97,
    monthlyDebtPayment: 211,
    costOfAttendance: 39563,
    medianDebt: 17500,
    undergradSize: 31636,
  },
  {
    name: "Northern Virginia Community College",
    city: "Annandale",
    state: "VA",
    control: 1,
    netPrice: 8930,
    salary10yr: 41600,
    salary6yr: 38400,
    salaryNullReason: null,
    unitId: 232867,
    slug: "northern-virginia-community-college",
    graduationRate: 0.27,
    retentionRate: 0.61,
    monthlyDebtPayment: 121,
    costOfAttendance: 15390,
    medianDebt: 9500,
    undergradSize: 49232,
  },
];

export function findExampleByUnitId(unitId: number): ExampleCollege | null {
  return EXAMPLE_COLLEGES.find((c) => c.unitId === unitId) ?? null;
}
