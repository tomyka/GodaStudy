import { test } from "node:test";
import assert from "node:assert/strict";
import { buildReport, mergeMarks } from "../src/report.mjs";

test("the report carries the config, the rates and the rewards", () => {
  const config = { student: { name: "Goda" }, repo: "tomyka/GodaStudy", years: [{ from: "2026-09", label: "8th grade" }] };
  const report = buildReport(config, [{ date: "2026-09-14", month: "2026-09", subject: "Matematika", mark: 10, kind: "K" }], "2026-10-01");
  assert.deepEqual(report.student, config.student);
  assert.deepEqual(report.years, config.years);
  assert.equal(report.updatedAt, "2026-10-01");
  assert.equal(report.rates.K[10], 20);
  assert.deepEqual(report.months, ["2026-09"]);
  assert.equal(report.total, 20);
});

test("a fetch replaces this year's marks and keeps older ones", () => {
  const sheet = { month: "2026-05", subject: "Fizika", mark: 10, kind: "A" };
  const old = { date: "2026-09-10", month: "2026-09", subject: "Fizika", mark: 8, kind: "A" };
  const fresh = [{ ...old, mark: 9 }, { ...old, date: "2026-09-20" }];
  assert.deepEqual(mergeMarks([sheet, old], fresh, "2026-09-01"), [sheet, ...fresh]);
});

test("a fetch with fewer marks than stored is refused unless accepted", () => {
  const stored = [
    { date: "2026-09-10", month: "2026-09", subject: "Fizika", mark: 8, kind: "A" },
    { date: "2026-09-11", month: "2026-09", subject: "Fizika", mark: 9, kind: "A" },
  ];
  assert.throws(() => mergeMarks(stored, [], "2026-09-01"), /0 marks since 2026-09-01, fewer than the 2/);
  assert.deepEqual(mergeMarks(stored, [stored[0]], "2026-09-01", { acceptFewer: true }), [stored[0]]);
});
