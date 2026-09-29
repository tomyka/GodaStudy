import { test } from "node:test";
import assert from "node:assert/strict";
import { selectRole, toMarks, weeks } from "../src/tamo.mjs";

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

test("only paying subjects count; the rest are skipped by name", () => {
  const { marks, skipped } = toMarks([
    { subject: "Užsienio kalba (pirmoji, anglų)", subjectDate: "2026-09-28", assessmentValue: "10", assessmentType: "Testas" },
    { subject: "Dailė", subjectDate: "2026-09-09", assessmentValue: "10", assessmentType: "Klasės darbas" },
    { subject: "Dailė", subjectDate: "2026-09-16", assessmentValue: "10", assessmentType: "Klasės darbas" },
  ], { ...options, subjects: { "Užsienio kalba (pirmoji, anglų)": "Anglų k." }, paying: ["Anglų k."] });
  assert.deepEqual(marks, [{ date: "2026-09-28", month: "2026-09", subject: "Anglų k.", mark: 10, kind: "A" }]);
  assert.deepEqual(skipped, { "Dailė (not paying)": 2 });
});

test("weeks cover the range Monday to Sunday without overlap", () => {
  assert.deepEqual(weeks("2026-09-01", "2026-09-16"), [
    { dateFrom: "2026-09-01", dateTo: "2026-09-06" },
    { dateFrom: "2026-09-07", dateTo: "2026-09-13" },
    { dateFrom: "2026-09-14", dateTo: "2026-09-16" },
  ]);
  assert.deepEqual(weeks("2026-09-06", "2026-09-06"), [{ dateFrom: "2026-09-06", dateTo: "2026-09-06" }]);
});

test("a role is picked by name, or is the only one", () => {
  const roles = [{ id: "a", title: "Goda Konovalovaitė", subtitle: "8a" }, { id: "b", title: "Paulius", subtitle: "5b" }];
  assert.equal(selectRole(roles, "goda"), "a");
  assert.equal(selectRole([roles[1]], undefined), "b");
  assert.throws(() => selectRole(roles, "Ieva"), /found 0 of 2/);
});
