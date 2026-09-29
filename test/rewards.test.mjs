import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { markValue, nextSchoolMonth, schoolMonths, computeRewards } from "../src/rewards.mjs";

test("regular marks and tests pay the sheet's rates", () => {
  assert.deepEqual([10, 9, 8, 7, 6, 5, 4, 1].map((m) => markValue(m, "A")), [5, 3, 0, -5, -10, -20, -20, -20]);
  assert.deepEqual([10, 9, 8, 7, 6, 5, 4, 1].map((m) => markValue(m, "K")), [20, 10, 0, -10, -20, -50, -50, -50]);
});

test("marks outside 1-10 and unknown kinds are rejected", () => {
  assert.throws(() => markValue(11, "A"), /1-10/);
  assert.throws(() => markValue(8.5, "A"), /1-10/);
  assert.throws(() => markValue(9, "X"), /Unknown mark kind/);
});

test("school months skip the summer", () => {
  assert.equal(nextSchoolMonth("2025-12"), "2026-01");
  assert.equal(nextSchoolMonth("2026-06"), "2026-09");
  assert.deepEqual(schoolMonths([{ month: "2026-09" }, { month: "2026-05" }]), ["2026-05", "2026-06", "2026-09"]);
  assert.deepEqual(schoolMonths([]), []);
});

test("each subject sums its marks per month and keeps a running total", () => {
  const { months, subjects, monthTotals, total } = computeRewards([
    { month: "2026-09", subject: "Matematika", mark: 10, kind: "K" },
    { month: "2026-09", subject: "Matematika", mark: 7, kind: "A" },
    { month: "2026-11", subject: "Matematika", mark: 9, kind: "A" },
    { month: "2026-10", subject: "Biologija", mark: 6, kind: "A", date: "2026-10-05" },
  ]);
  assert.deepEqual(months, ["2026-09", "2026-10", "2026-11"]);
  assert.deepEqual(subjects.map((s) => s.name), ["Biologija", "Matematika"]);
  assert.deepEqual(subjects[1].months.map((m) => [m.earned, m.total]), [[15, 15], [0, 15], [3, 18]]);
  assert.deepEqual(subjects[0].months[1].marks, [{ date: "2026-10-05", mark: 6, kind: "A", eur: -10 }]);
  assert.deepEqual(monthTotals, [15, -10, 3]);
  assert.equal(total, 8);
});

test("the imported 7th grade reproduces the sheet's totals", () => {
  // The sheet's "7 klasė" tab as imported into site/marks.json, frozen here.
  const marks = JSON.parse(readFileSync(new URL("fixtures/marks-7-klase.json", import.meta.url), "utf8"));
  const { subjects, monthTotals, total } = computeRewards(marks);
  assert.deepEqual(Object.fromEntries(subjects.map((s) => [s.name, s.total])), {
    "Anglų k.": 80, Biologija: 7, Fizika: -39, Geografija: 38, Informatika: 8,
    Istorija: 36, "Lietuvių k.": 17, Matematika: 86, "Prancūzų k.": 46,
  });
  assert.deepEqual(monthTotals, [1, 57, 16, -4, 39, 43, 13, 43, 55, 16]);
  assert.equal(total, 279);
});
