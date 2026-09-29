import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchWindow, refreshMarks } from "../src/refresh.mjs";

const tamo = { from: "2026-09-01", testTypes: ["kontrolin"], subjects: { "Lietuvių kalba": "Lietuvių k." } };
const sheet = [{ month: "2026-06", subject: "Fizika", mark: 10, kind: "A" }];
const item = (subjectDate, assessmentValue, assessmentType = "Pažymys", subject = "Matematika") => ({ subject, subjectDate, assessmentValue, assessmentType });

// A diary source like tamoDiary, serving canned items and remembering what was asked for.
function fakeDiary(items) {
  const reads = [];
  return {
    reads,
    read: async (from, to) => {
      reads.push([from, to]);
      return items.filter((i) => i.subjectDate >= from && i.subjectDate <= to);
    },
  };
}

test("the fetch window never reaches back into the imported sheet", () => {
  assert.equal(fetchWindow("2026-09-29", tamo.from), null); // September 2026 is not over yet
  assert.deepEqual(fetchWindow("2026-10-01", tamo.from), { from: "2026-09-01", to: "2026-09-30" });
  assert.deepEqual(fetchWindow("2027-07-01", tamo.from), { from: "2026-09-01", to: "2027-06-30" });
  assert.deepEqual(fetchWindow("2027-09-01", tamo.from), { from: "2026-09-01", to: "2027-08-31" });
  assert.deepEqual(fetchWindow("2027-11-02", tamo.from), { from: "2027-09-01", to: "2027-10-31" });
});

test("before the first month is over nothing is read", async () => {
  const diary = fakeDiary([item("2026-09-14", "10")]);
  const { marks, log } = await refreshMarks({ stored: sheet, tamo, today: "2026-09-29", diary });
  assert.deepEqual(marks, sheet);
  assert.deepEqual(diary.reads, []);
  assert.match(log[0], /Nothing to fetch/);
});

test("the 1 October run adds September and keeps the sheet", async () => {
  const diary = fakeDiary([item("2026-09-14", "10", "Kontrolinis darbas"), item("2026-09-15", "n"), item("2026-10-01", "9")]);
  const { marks, log } = await refreshMarks({ stored: sheet, tamo, today: "2026-10-01", diary });
  assert.deepEqual(diary.reads, [["2026-09-01", "2026-09-30"]]);
  assert.deepEqual(marks, [...sheet, { date: "2026-09-14", month: "2026-09", subject: "Matematika", mark: 10, kind: "K" }]);
  assert.deepEqual(log, ["TAMO 2026-09-01..2026-09-30: 1 marks (1 tests)", `Skipped: {"n":1}`]);
});

test("a later run replaces the window's marks, so a teacher's correction comes through", async () => {
  const stored = [...sheet, { date: "2026-09-14", month: "2026-09", subject: "Matematika", mark: 7, kind: "A" }];
  const diary = fakeDiary([item("2026-09-14", "8"), item("2026-10-05", "10", "Pažymys", "Lietuvių kalba ir literatūra")]);
  const { marks } = await refreshMarks({ stored, tamo, today: "2026-11-01", diary });
  assert.deepEqual(marks.map((m) => [m.subject, m.mark]), [["Fizika", 10], ["Matematika", 8], ["Lietuvių k.", 10]]);
});

test("a read with fewer marks than stored is refused unless accepted", async () => {
  const stored = [
    { date: "2026-09-10", month: "2026-09", subject: "Fizika", mark: 8, kind: "A" },
    { date: "2026-09-11", month: "2026-09", subject: "Fizika", mark: 9, kind: "A" },
  ];
  const diary = fakeDiary([item("2026-09-11", "9", "Pažymys", "Fizika")]);
  await assert.rejects(refreshMarks({ stored, tamo, today: "2026-10-01", diary }), /1 marks for 2026-09-01..2026-09-30, fewer than the 2/);
  const { marks } = await refreshMarks({ stored, tamo, today: "2026-10-01", diary, acceptFewer: true });
  assert.deepEqual(marks.map((m) => m.date), ["2026-09-11"]);
});
