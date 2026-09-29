// The school calendar: a school year runs from September to June, and July and August never have marks.
// Months are "YYYY-MM", days "YYYY-MM-DD".

// "2026-06" -> "2026-09": the next school month.
export function nextSchoolMonth(month) {
  let [y, m] = month.split("-").map(Number);
  do {
    m++;
    if (m > 12) { m = 1; y++; }
  } while (m === 7 || m === 8);
  return `${y}-${String(m).padStart(2, "0")}`;
}

// Every school month from the first to the last of `months`, in order.
export function schoolMonthsBetween(months) {
  if (!months.length) return [];
  const sorted = [...months].sort();
  const all = [sorted[0]];
  while (all.at(-1) < sorted.at(-1)) all.push(nextSchoolMonth(all.at(-1)));
  return all;
}

// 1 September of the school year that `day` falls in.
export const schoolYearStart = (day) => `${Number(day.slice(0, 4)) - (day.slice(5, 7) < "09" ? 1 : 0)}-09-01`;

// The last day of the month before `today`. A month is settled once it is over.
export function previousMonthEnd(today) {
  const day = new Date(`${today.slice(0, 7)}-01T00:00:00Z`);
  day.setUTCDate(0);
  return day.toISOString().slice(0, 10);
}

// config.years ([{ from: "YYYY-09", label }], in order) -> a function naming the school year of a month.
// Months before the first configured year get an empty label.
export function yearLabels(years) {
  years.forEach((y, i) => {
    if (!/^\d{4}-09$/.test(y.from)) throw new Error(`A school year starts in September, got "${y.from}" for ${y.label}`);
    if (i && y.from <= years[i - 1].from) throw new Error(`School years must be in order: ${y.label} after ${years[i - 1].label}`);
  });
  return (month) => years.filter((y) => y.from <= month).at(-1)?.label ?? "";
}
