export type FourYearInput = {
  tuition_in_state?: number | null;
  tuition_out_state?: number | null;
  books_supplies?: number | null;
  room_board_on_campus?: number | null;
  room_board_off_campus?: number | null;
  other_expense_on_campus?: number | null;
  other_expense_off_campus?: number | null;
};

// Sum tuition + books + housing + other into an annual, then × 4.
// Prefers on-campus housing; falls back to off-campus. Returns null
// if the tuition side is missing (without it the total is meaningless).
export function fourYearTotal(
  costs: FourYearInput | null | undefined,
  which: "in" | "out",
): number | null {
  if (!costs) return null;
  const tuition = which === "in" ? costs.tuition_in_state : costs.tuition_out_state;
  if (tuition == null) return null;

  const roomBoard =
    costs.room_board_on_campus ?? costs.room_board_off_campus ?? 0;
  const otherExpense =
    costs.other_expense_on_campus ?? costs.other_expense_off_campus ?? 0;
  const books = costs.books_supplies ?? 0;

  const annual = tuition + books + roomBoard + otherExpense;
  return annual * 4;
}
