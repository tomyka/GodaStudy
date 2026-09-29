// The agreement, as in the "Godos mokslo pasiekimai" sheet: every mark pays or costs a fixed
// amount, and a test (kontrolinis, "K") counts about double a regular mark ("A").
// Marks of 5 and below all share the lowest rate.
export const RATES = {
  A: { 10: 5, 9: 3, 8: 0, 7: -5, 6: -10, low: -20 },
  K: { 10: 20, 9: 10, 8: 0, 7: -10, 6: -20, low: -50 },
};

export const KIND_NAMES = { A: "Mark", K: "Test" };

export function markValue(mark, kind) {
  const rates = RATES[kind];
  if (!rates) throw new Error(`Unknown mark kind: ${kind}`);
  if (!Number.isInteger(mark) || mark < 1 || mark > 10) throw new Error(`Mark must be a whole number 1-10, got ${mark}`);
  return mark <= 5 ? rates.low : rates[mark];
}

// "2026-06" -> "2026-09": the next school month; July and August never have marks.
export function nextSchoolMonth(month) {
  let [y, m] = month.split("-").map(Number);
  do {
    m++;
    if (m > 12) { m = 1; y++; }
  } while (m === 7 || m === 8);
  return `${y}-${String(m).padStart(2, "0")}`;
}

// Every school month from the first to the last month that has a mark.
export function schoolMonths(marks) {
  if (!marks.length) return [];
  const sorted = marks.map((m) => m.month).sort();
  const months = [sorted[0]];
  while (months.at(-1) < sorted.at(-1)) months.push(nextSchoolMonth(months.at(-1)));
  return months;
}

// marks: [{ month, subject, mark, kind }] -> per-subject months with the marks given and euros earned.
// Subjects are sorted by name.
export function computeRewards(marks) {
  const months = schoolMonths(marks);
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
