// One-off check of what TAMO sends, to tune config.json's "testTypes" and "subjects".
// Prints only the distinct subjects, assessment types and values of the last few weeks, no names or ids.
// Usage: pwsh scripts/tamo-probe.ps1   (or set TAMO_USERNAME/TAMO_PASSWORD and run node directly)
import { readFile } from "node:fs/promises";
import { tamoDiary } from "../src/tamo.mjs";

const config = JSON.parse(await readFile(new URL("../config.json", import.meta.url), "utf8"));
const to = new Date();
const from = new Date(to.getTime() - 28 * 864e5);
const diary = tamoDiary(process.env.TAMO_USERNAME, process.env.TAMO_PASSWORD, config.tamo.role);
const items = await diary.read(from.toLocaleDateString("sv-SE"), to.toLocaleDateString("sv-SE"));

const count = (key) => Object.entries(Object.groupBy(items, key)).map(([k, v]) => `${k} x${v.length}`);
console.log(`${items.length} diary items in the last 4 weeks`);
console.log("Fields:", [...new Set(items.flatMap(Object.keys))].join(", "));
console.log("Subjects:", count((i) => i.subject));
console.log("assessmentType / type:", count((i) => `${i.assessmentType} / ${i.type}`));
console.log("assessmentValue:", count((i) => i.assessmentValue));
