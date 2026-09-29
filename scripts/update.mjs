// Monthly job: fetch this school year's marks up to the end of last month from TAMO,
// then rewrite site/marks.json and site/data.json.
// Needs TAMO_USERNAME and TAMO_PASSWORD (scripts/monthly.ps1 sets them from the saved login).
//   --offline              skip TAMO and rebuild data.json from marks.json, e.g. after a config change
//   --accept-fewer-marks   allow TAMO to return fewer marks than stored, after a deliberate correction
import { readFile, writeFile } from "node:fs/promises";
import { fetchDiary, fetchRole, fetchWindow, login, toMarks } from "../src/tamo.mjs";
import { buildReport, mergeMarks } from "../src/report.mjs";

const root = new URL("../", import.meta.url);
const marksFile = new URL("site/marks.json", root);
const config = JSON.parse(await readFile(new URL("config.json", root), "utf8"));
let marks = JSON.parse(await readFile(marksFile, "utf8"));
const today = new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD, local time

const window = fetchWindow(today, config.tamo.from);
if (!window) console.log(`Nothing to fetch from TAMO yet: marks count from ${config.tamo.from} and a month is fetched once it is over`);
if (window && !process.argv.includes("--offline")) {
  const { from, to } = window;
  const { TAMO_USERNAME, TAMO_PASSWORD } = process.env;
  if (!TAMO_USERNAME || !TAMO_PASSWORD) throw new Error("Set TAMO_USERNAME and TAMO_PASSWORD, or pass --offline");
  const token = await login(TAMO_USERNAME, TAMO_PASSWORD);
  const role = await fetchRole(token, config.tamo.role);
  const { marks: fetched, skipped } = toMarks(await fetchDiary(token, role, from, to), config.tamo);
  const tests = fetched.filter((m) => m.kind === "K").length;
  console.log(`TAMO ${from}..${to}: ${fetched.length} marks (${tests} tests)`);
  if (Object.keys(skipped).length) console.log(`Skipped non-mark values: ${JSON.stringify(skipped)}`);
  marks = mergeMarks(marks, fetched, from, { acceptFewer: process.argv.includes("--accept-fewer-marks") });
  await writeFile(marksFile, JSON.stringify(marks, null, 2) + "\n");
}

const report = buildReport(config, marks, today);
await writeFile(new URL("site/data.json", root), JSON.stringify(report, null, 2) + "\n");
console.log(`Marks to ${report.months.at(-1)}, total earned €${report.total}`);
