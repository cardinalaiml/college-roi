export function formatCurrency(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "Not available";
  const rounded = Math.round(n);
  const sign = rounded < 0 ? "-" : "";
  return `${sign}$${Math.abs(rounded).toLocaleString("en-US")}`;
}

export function formatPercent(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "Not available";
  const pct = n <= 1 ? n * 100 : n;
  return `${Math.round(pct)}%`;
}

const SALARY_NULL_MESSAGES: Record<string, string> = {
  suppressed:
    "Salary data for this school is not published. The graduate group is too small to report without identifying individuals.",
  not_reported:
    "This school has not reported salary outcomes to the Department of Education.",
};

export function formatSalaryNull(reason: string | null | undefined): string {
  if (!reason) return SALARY_NULL_MESSAGES.not_reported;
  return SALARY_NULL_MESSAGES[reason] ?? SALARY_NULL_MESSAGES.not_reported;
}

export function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
