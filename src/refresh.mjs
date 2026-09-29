import { previousMonthEnd, schoolYearStart } from "./calendar.mjs";
import { TEST } from "./rewards.mjs";
import { toMarks } from "./tamo.mjs";

// The dates a run on `today` fetches: the school year up to the end of last month (a July or
// August run re-reads the year just ended), but never before `tamoFrom`, the day TAMO took over
// from the imported sheet. Null when there is nothing to fetch yet.
export function fetchWindow(today, tamoFrom) {
  const to = previousMonthEnd(today);
  const yearStart = schoolYearStart(to);
  const from = yearStart > tamoFrom ? yearStart : tamoFrom;
  return from <= to ? { from, to } : null;
}

// One monthly refresh: read the window's diary items from `diary` (see tamoDiary; tests pass a fake
// with the same read(from, to)), turn them into marks and replace the stored marks of that window.
// Marks before the window, including the imported sheet, are kept. A read with fewer marks than
// already stored for the window is refused unless acceptFewer: a TAMO glitch or a changed format
// would otherwise wipe marks. Returns the new marks and the lines to log.
export async function refreshMarks({ stored, tamo, today, diary, acceptFewer = false }) {
  const window = fetchWindow(today, tamo.from);
  if (!window) return { marks: stored, log: [`Nothing to fetch from TAMO yet: marks count from ${tamo.from} and a month is fetched once it is over`] };
  const { from, to } = window;
  const { marks: fetched, skipped } = toMarks(await diary.read(from, to), tamo);
  const log = [`TAMO ${from}..${to}: ${fetched.length} marks (${fetched.filter((m) => m.kind === TEST).length} tests)`];
  if (Object.keys(skipped).length) log.push(`Skipped non-mark values: ${JSON.stringify(skipped)}`);

  const inWindow = (m) => (m.date ? m.date >= from : m.month >= from.slice(0, 7));
  const kept = stored.filter((m) => !inWindow(m));
  const before = stored.length - kept.length;
  if (fetched.length < before && !acceptFewer) {
    throw new Error(`TAMO returned ${fetched.length} marks for ${from}..${to}, fewer than the ${before} already stored`);
  }
  return { marks: [...kept, ...fetched], log };
}
