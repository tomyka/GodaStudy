import { yearLabels } from "./calendar.mjs";
import { KINDS, computeRewards } from "./rewards.mjs";

// The money view: what was earned and paid by the end of each month, and the balance.
// A payment counts in the school month its date falls in; a summer payment counts in June, and one
// before the first month with marks counts in that first month. So "balance after" a payment is
// everything earned by the end of its month minus everything paid so far, as the sheet's Likutis.
// Payouts may be in any order (payouts.json can be edited by hand); they are counted in date order.
export function moneyView(months, monthTotals, payouts) {
  const monthOf = (date) => Math.max(0, months.findLastIndex((m) => m <= date.slice(0, 7)));
  let paidTotal = 0;
  const payments = [...payouts].sort((a, b) => a.date.localeCompare(b.date)).map((p) => {
    paidTotal += p.eur;
    return { ...p, month: months.length ? monthOf(p.date) : null, paidTotal };
  });
  let earnedTotal = 0;
  const timeline = months.map((month, i) => {
    earnedTotal += monthTotals[i];
    const paid = payments.filter((p) => p.month !== null && p.month <= i).at(-1)?.paidTotal ?? 0;
    return { month, earned: monthTotals[i], earnedTotal, paidTotal: paid, balance: earnedTotal - paid };
  });
  for (const p of payments) p.balanceAfter = (p.month === null ? 0 : timeline[p.month].earnedTotal) - p.paidTotal;
  return { timeline, payments, earned: earnedTotal, paid: paidTotal, balance: earnedTotal - paidTotal };
}

// Everything the dashboard draws. The page only lays it out.
export function buildReport(config, marks, payouts, updatedAt) {
  const yearOf = yearLabels(config.years);
  const { months, subjects, monthTotals } = computeRewards(marks);
  const money = moneyView(months, monthTotals, payouts);
  return {
    student: config.student,
    repo: config.repo,
    updatedAt,
    kinds: KINDS,
    months: money.timeline.map((t) => ({ ...t, year: yearOf(t.month) })),
    subjects,
    payments: money.payments,
    earned: money.earned,
    paid: money.paid,
    balance: money.balance,
  };
}
