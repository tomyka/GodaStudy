import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchWindow, previousMonthEnd, schoolYearStart, selectRole, toMarks, weeks } from "../src/tamo.mjs";

const options = { testTypes: ["kontrolin"], subjects: { "Lietuvių kalba": "Lietuvių k." } };

test("diary items become marks; tests are recognised by their assessment type", () => {
  const { marks, skipped } = toMarks([
    { subject: "Matematika", subjectDate: "2026-09-14", assessmentValue: "10", assessmentType: "Kontrolinis darbas" },
    { subject: "Lietuvių kalba ir literatūra", subjectDate: "2026-09-10T00:00:00", assessmentValue: " 7 ", assessmentType: "Pažymys" },
    { subject: "Fizika", assessmentDateTime: "2026-09-11 08:00:00", assessmentValue: "9" },
  ], options);
  assert.deepEqual(marks, [
    { date: "2026-09-10", month: "2026-09", subject: "Lietuvių k.", mark: 7, kind: "A" },
    { date: "2026-09-11", month: "2026-09", subject: "Fizika", mark: 9, kind: "A" },
    { date: "2026-09-14", month: "2026-09", subject: "Matematika", mark: 10, kind: "K" },
  ]);
  assert.deepEqual(skipped, {});
});

test("attendance, pass/fail and odd values are skipped and counted", () => {
  const { marks, skipped } = toMarks([
    { subject: "Kūno kultūra", subjectDate: "2026-09-14", assessmentValue: "įsk" },
    { subject: "Matematika", subjectDate: "2026-09-14", assessmentValue: "n" },
    { subject: "Matematika", subjectDate: "2026-09-15", assessmentValue: "n" },
    { subject: "Matematika", subjectDate: "2026-09-16", assessmentValue: "11" },
    { subject: "Matematika", subjectDate: "2026-09-16", assessmentValue: "" },
    { subject: "Matematika", assessmentValue: "9" },
  ], options);
  assert.deepEqual(marks, []);
  assert.deepEqual(skipped, { įsk: 1, n: 2, 11: 1, "no date": 1 });
});

test("weeks cover the range Monday to Sunday without overlap", () => {
  assert.deepEqual(weeks("2026-09-01", "2026-09-16"), [
    { dateFrom: "2026-09-01", dateTo: "2026-09-06" },
    { dateFrom: "2026-09-07", dateTo: "2026-09-13" },
    { dateFrom: "2026-09-14", dateTo: "2026-09-16" },
  ]);
  assert.deepEqual(weeks("2026-09-06", "2026-09-06"), [{ dateFrom: "2026-09-06", dateTo: "2026-09-06" }]);
});

test("the school year starts on 1 September", () => {
  assert.equal(schoolYearStart("2026-09-29"), "2026-09-01");
  assert.equal(schoolYearStart("2027-06-10"), "2026-09-01");
  assert.equal(schoolYearStart("2026-08-31"), "2025-09-01");
});

test("the fetch stops at the end of the previous month", () => {
  assert.equal(previousMonthEnd("2026-10-01"), "2026-09-30");
  assert.equal(previousMonthEnd("2026-03-15"), "2026-02-28");
  assert.equal(previousMonthEnd("2027-01-01"), "2026-12-31");
  // A 1 September run re-reads the year just ended, not the empty new one.
  assert.equal(schoolYearStart(previousMonthEnd("2027-09-01")), "2026-09-01");
});

test("the fetch window never reaches back into the imported sheet", () => {
  const tamoFrom = "2026-09-01";
  assert.equal(fetchWindow("2026-09-29", tamoFrom), null); // September 2026 is not over yet
  assert.deepEqual(fetchWindow("2026-10-01", tamoFrom), { from: "2026-09-01", to: "2026-09-30" });
  assert.deepEqual(fetchWindow("2027-07-01", tamoFrom), { from: "2026-09-01", to: "2027-06-30" });
  assert.deepEqual(fetchWindow("2027-09-01", tamoFrom), { from: "2026-09-01", to: "2027-08-31" });
  assert.deepEqual(fetchWindow("2027-11-02", tamoFrom), { from: "2027-09-01", to: "2027-10-31" });
});

test("a role is picked by name, or is the only one", () => {
  const roles = [{ id: "a", title: "Goda Konovalovaitė", subtitle: "8a" }, { id: "b", title: "Paulius", subtitle: "5b" }];
  assert.equal(selectRole(roles, "goda"), "a");
  assert.equal(selectRole([roles[1]], undefined), "b");
  assert.throws(() => selectRole(roles, "Ieva"), /found 0 of 2/);
});
