import { test } from "node:test";
import assert from "node:assert/strict";
import { nextSchoolMonth, previousMonthEnd, schoolMonthsBetween, schoolYearStart, yearLabels } from "../src/calendar.mjs";

test("school months skip the summer", () => {
  assert.equal(nextSchoolMonth("2025-12"), "2026-01");
  assert.equal(nextSchoolMonth("2026-06"), "2026-09");
  assert.deepEqual(schoolMonthsBetween(["2026-09", "2026-05"]), ["2026-05", "2026-06", "2026-09"]);
  assert.deepEqual(schoolMonthsBetween([]), []);
});

test("the school year starts on 1 September", () => {
  assert.equal(schoolYearStart("2026-09-29"), "2026-09-01");
  assert.equal(schoolYearStart("2027-06-10"), "2026-09-01");
  assert.equal(schoolYearStart("2026-08-31"), "2025-09-01");
});

test("the previous month ends on its last day", () => {
  assert.equal(previousMonthEnd("2026-10-01"), "2026-09-30");
  assert.equal(previousMonthEnd("2026-03-15"), "2026-02-28");
  assert.equal(previousMonthEnd("2027-01-01"), "2026-12-31");
});

test("months are named by their school year", () => {
  const yearOf = yearLabels([{ from: "2025-09", label: "7th grade" }, { from: "2026-09", label: "8th grade" }]);
  assert.deepEqual(["2025-08", "2025-09", "2026-06", "2026-09", "2027-03"].map(yearOf), ["", "7th grade", "7th grade", "8th grade", "8th grade"]);
});

test("school years must start in September and be in order", () => {
  assert.throws(() => yearLabels([{ from: "2026-08", label: "8th grade" }]), /starts in September/);
  assert.throws(() => yearLabels([{ from: "2026-09", label: "8th" }, { from: "2025-09", label: "7th" }]), /in order/);
});
