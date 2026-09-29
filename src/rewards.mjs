import { schoolMonthsBetween } from "./calendar.mjs";

// The agreement, as in the "Godos mokslo pasiekimai" sheet: every mark pays or costs a fixed
// amount, and a test (kontrolinis) counts about double a regular mark.
// Marks of 5 and below all share the lowest rate. `tag` is how a mark of that kind is labelled ("K9").
export const KINDS = {
  A: { name: "Mark", tag: "", rates: { 10: 5, 9: 3, 8: 0, 7: -5, 6: -10, low: -20 } },
  K: { name: "Test", tag: "K", rates: { 10: 20, 9: 10, 8: 0, 7: -10, 6: -20, low: -50 } },
};
export const REGULAR = "A";
export const TEST = "K";

export function markValue(mark, kind) {
  const rates = KINDS[kind]?.rates;
  if (!rates) throw new Error(`Unknown mark kind: ${kind}`);
  if (!Number.isInteger(mark) || mark < 1 || mark > 10) throw new Error(`Mark must be a whole number 1-10, got ${mark}`);
  return mark <= 5 ? rates.low : rates[mark];
}

// marks: [{ month, subject, mark, kind, date? }] -> per-subject months with the marks given and euros earned.
// Months run over every school month from the first mark to the last. Subjects are sorted by name.
export function computeRewards(marks) {
  const months = schoolMonthsBetween(marks.map((m) => m.month));
  const names = [...new Set(marks.map((m) => m.subject))].sort((a, b) => a.localeCompare(b, "lt"));
  const subjects = names.map((name) => {
    let total = 0;
    const rows = months.map((month) => {
      const given = marks
        .filter((m) => m.subject === name && m.month === month)
        .map((m) => ({ ...(m.date && { date: m.date }), mark: m.mark, kind: m.kind, eur: markValue(m.mark, m.kind) }));
      const earned = given.reduce((sum, m) => sum + m.eur, 0);
      total += earned;
      return { month, marks: given, earned, total };
    });
    return { name, months: rows, total };
  });
  const monthTotals = months.map((month, i) => subjects.reduce((sum, s) => sum + s.months[i].earned, 0));
  return { months, subjects, monthTotals, total: subjects.reduce((sum, s) => sum + s.total, 0) };
}
