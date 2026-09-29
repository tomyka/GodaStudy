import { test } from "node:test";
import assert from "node:assert/strict";
import { schoolYearStart, selectRole, toMarks, weeks } from "../src/tamo.mjs";
import { mergeMarks } from "../src/report.mjs";

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
  assert.deepEqual(skipped, { įsk: 1, n: 2, 11: 1, 9: 1 });
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

test("a role is picked by name, or is the only one", () => {
  const roles = [{ id: "a", title: "Goda Konovalovaitė", subtitle: "8a" }, { id: "b", title: "Paulius", subtitle: "5b" }];
  assert.equal(selectRole(roles, "goda"), "a");
  assert.equal(selectRole([roles[1]], undefined), "b");
  assert.throws(() => selectRole(roles, "Ieva"), /found 0 of 2/);
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
