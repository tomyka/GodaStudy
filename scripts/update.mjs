// Monthly job: refresh the marks from TAMO (the school year up to the end of last month),
// then rewrite site/marks.json and site/data.json.
// Needs TAMO_USERNAME and TAMO_PASSWORD (scripts/monthly.ps1 sets them from the saved login).
//   --offline              skip TAMO and rebuild data.json from the stored marks and payouts
//   --accept-fewer-marks   allow TAMO to return fewer marks than stored, after a deliberate correction
//   --through-today        also fetch the current month so far (a one-off run; the monthly run takes whole months)
import { readFile, writeFile } from "node:fs/promises";
import { refreshMarks } from "../src/refresh.mjs";
import { buildReport } from "../src/report.mjs";
import { tamoDiary } from "../src/tamo.mjs";

const root = new URL("../", import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const writeJson = (path, value) => writeFile(new URL(path, root), JSON.stringify(value, null, 2) + "\n");

const config = await readJson("config.json");
let marks = await readJson("site/marks.json");
const payouts = await readJson("site/payouts.json");
const today = new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD, local time
const offline = process.argv.includes("--offline");

if (!offline) {
  const diary = tamoDiary(process.env.TAMO_USERNAME, process.env.TAMO_PASSWORD, config.tamo.role);
  const refreshed = await refreshMarks({ stored: marks, tamo: config.tamo, today, diary, acceptFewer: process.argv.includes("--accept-fewer-marks"), throughToday: process.argv.includes("--through-today") });
  refreshed.log.forEach((line) => console.log(line));
  marks = refreshed.marks;
  await writeJson("site/marks.json", marks);
}

// "Last updated" is the last refresh from TAMO, so an offline rebuild (as in CI) keeps the previous date.
const previous = await readJson("site/data.json").catch(() => null);
const report = buildReport(config, marks, payouts, offline ? previous?.updatedAt ?? today : today);
await writeJson("site/data.json", report);
console.log(`Marks to ${report.months.at(-1)?.month ?? "none"}, earned €${report.earned}, paid €${report.paid}, balance €${report.balance}`);
