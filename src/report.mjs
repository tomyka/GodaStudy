import { RATES, KIND_NAMES, computeRewards } from "./rewards.mjs";

// Replace the marks from `from` (YYYY-MM-DD) onward with a fresh TAMO fetch, keeping older ones
// (earlier school years and the imported sheet). A fetch with fewer marks than already stored
// for that period is refused: TAMO glitches or a changed format would otherwise wipe marks.
export function mergeMarks(existing, fetched, from, { acceptFewer = false } = {}) {
  const month = from.slice(0, 7);
  const inPeriod = (m) => (m.date ? m.date >= from : m.month >= month);
  const kept = existing.filter((m) => !inPeriod(m));
  const before = existing.length - kept.length;
  if (fetched.length < before && !acceptFewer) {
    throw new Error(`TAMO returned ${fetched.length} marks since ${from}, fewer than the ${before} already stored`);
  }
  return [...kept, ...fetched];
}

// Everything the dashboard draws.
export function buildReport(config, marks, updatedAt) {
  return {
    student: config.student,
    repo: config.repo,
    years: config.years,
    updatedAt,
    rates: RATES,
    kinds: KIND_NAMES,
    ...computeRewards(marks),
  };
}
