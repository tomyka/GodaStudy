import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildReport, moneyView } from "../src/report.mjs";

const fixture = (name) => JSON.parse(readFileSync(new URL(`fixtures/${name}`, import.meta.url), "utf8"));
const config = { student: { name: "Goda" }, repo: "tomyka/GodaStudy", years: [{ from: "2025-09", label: "7th grade" }, { from: "2026-09", label: "8th grade" }] };

test("the 7th grade's balance follows the sheet's Likutis month by month", () => {
  const report = buildReport(config, fixture("marks-7-klase.json"), fixture("payouts-7-klase.json"), "2026-09-29");
  assert.deepEqual(report.months.map((m) => m.balance), [1, 0, 3, -1, 13, 0, -10, -20, 10, 0]);
  assert.deepEqual(report.payments.map((p) => p.balanceAfter), [0, 3, 13, 0, -10, -20, 10, 0]);
  assert.deepEqual([report.earned, report.paid, report.balance], [279, 279, 0]);
  assert.equal(report.months[0].year, "7th grade");
});

test("a payment counts in the school month its date falls in", () => {
  const months = ["2026-05", "2026-06", "2026-09"];
  const { timeline, payments } = moneyView(months, [10, 20, 30], [
    { date: "2026-04-20", eur: 5 }, // before the first month with marks: counts in May
    { date: "2026-06-03", eur: 10 }, // early June: counts against everything earned by the end of June
    { date: "2026-07-15", eur: 5 }, // summer: counts in June
  ]);
  assert.deepEqual(payments.map((p) => [p.month, p.paidTotal, p.balanceAfter]), [[0, 5, 5], [1, 15, 15], [1, 20, 10]]);
  assert.deepEqual(timeline.map((t) => [t.earnedTotal, t.paidTotal, t.balance]), [[10, 5, 5], [30, 20, 10], [60, 20, 40]]);
});

test("payments without any marks yet still count", () => {
  const { timeline, payments, balance } = moneyView([], [], [{ date: "2026-09-10", eur: 20 }]);
  assert.deepEqual(timeline, []);
  assert.deepEqual(payments, [{ date: "2026-09-10", eur: 20, month: null, paidTotal: 20, balanceAfter: -20 }]);
  assert.equal(balance, -20);
});

test("the report names each month's school year and carries the mark kinds", () => {
  const report = buildReport(config, [{ date: "2026-09-14", month: "2026-09", subject: "Matematika", mark: 10, kind: "K" }], [], "2026-10-01");
  assert.deepEqual(report.months, [{ month: "2026-09", year: "8th grade", earned: 20, earnedTotal: 20, paidTotal: 0, balance: 20 }]);
  assert.equal(report.kinds.K.tag, "K");
  assert.equal(report.updatedAt, "2026-10-01");
});
