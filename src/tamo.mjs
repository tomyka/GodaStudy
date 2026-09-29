// TAMO e-diary, through the unofficial API behind the TAMO IŠMANIEMS app, as documented at
// https://github.com/sobakintech/tamo-dienynas-api. It is not a public API: TAMO's terms forbid
// this kind of access and it may need an active TAMO IŠMANIEMS subscription. Only reads are made.
import { REGULAR, TEST } from "./rewards.mjs";

const LOGIN_URL = "https://dienynas.tamo.lt/MobileServiceV3/AuthenticateV2";
const API = "https://api.tamo.lt/";
// The Android app's build constant, not a per-device id.
const APP_GUID = "1166cfd3-1be5-4dca-aa64-5aff7bbb8acc";
const HEADERS = { Accept: "application/json", "User-Agent": "okhttp/4.9.1" };

const pad = (n) => String(n).padStart(2, "0");
const localDateTime = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

// Error messages never include response bodies: they can carry account details.
async function readJson(res, what) {
  if (!res.ok) throw new Error(`TAMO ${what}: HTTP ${res.status}`);
  try {
    return await res.json();
  } catch {
    throw new Error(`TAMO ${what}: response was not JSON`);
  }
}

async function login(username, password) {
  const res = await fetch(LOGIN_URL, {
    method: "POST",
    headers: { ...HEADERS, "Content-Type": "application/json; charset=UTF-8" },
    body: JSON.stringify({ username, password, dateTime: localDateTime(new Date()), typePhoneSystem: "Android", guid: APP_GUID }),
    redirect: "error",
  });
  const body = await readJson(res, "login");
  if (body.Status !== 1 || body.ErrorCode !== 0) throw new Error(`TAMO login was refused (ErrorCode ${body.ErrorCode})`);
  const token = body.Result?.authToken;
  if (body.Result?.userRoleIsAllowed !== true || typeof token !== "string" || !token) {
    throw new Error("TAMO login returned no usable account role");
  }
  return token;
}

async function get(token, path, { role, query } = {}) {
  const url = API + path + (query ? `?${new URLSearchParams(query)}` : "");
  const headers = { ...HEADERS, Authorization: `Bearer ${token}`, ...(role && { "x-selected-role": role }) };
  const body = await readJson(await fetch(url, { headers, redirect: "error" }), path);
  if (body.isSuccess !== true) throw new Error(`TAMO ${path}: request was not successful`);
  return body;
}

// A parent account has one role per child. `match` picks one by its title or subtitle;
// an account with a single role needs no match.
export function selectRole(roles, match) {
  const label = (r) => `${r.title ?? ""} ${r.subtitle ?? ""}`;
  const found = match ? roles.filter((r) => label(r).toLowerCase().includes(match.toLowerCase())) : roles;
  if (found.length !== 1) {
    throw new Error(`Expected one TAMO role matching "${match ?? ""}", found ${found.length} of ${roles.length}: ${roles.map(label).join("; ")}`);
  }
  return found[0].id;
}

async function fetchRole(token, match) {
  await get(token, "core/app/settings/StyleRef"); // the app always asks for this before the roles
  const { roles } = await get(token, "core/app/roles");
  if (!Array.isArray(roles) || !roles.length) throw new Error("TAMO returned no roles");
  return selectRole(roles, match);
}

// Monday-to-Sunday ranges covering from..to (YYYY-MM-DD), without overlap. The API was
// only verified with week-long ranges, so longer ones are not risked.
export function weeks(from, to) {
  const ranges = [];
  const day = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (day <= end) {
    const start = day.toISOString().slice(0, 10);
    day.setUTCDate(day.getUTCDate() + ((7 - day.getUTCDay()) % 7)); // to Sunday
    ranges.push({ dateFrom: start, dateTo: (day < end ? day : end).toISOString().slice(0, 10) });
    day.setUTCDate(day.getUTCDate() + 1);
  }
  return ranges;
}

async function fetchDiary(token, role, from, to) {
  const items = [];
  for (const query of weeks(from, to)) {
    const body = await get(token, "core/app/dienynas", { role, query });
    if (!Array.isArray(body.items)) throw new Error("TAMO diary response has no items list; its format may have changed");
    items.push(...body.items);
  }
  return items;
}

// Diary items -> marks. An item is a mark when its value is a whole number 1-10; attendance
// ("n", "p"), pass/fail ("įsk") and anything else is skipped and reported, so a format change is noticed.
// options.testTypes: lower-case fragments of `assessmentType` that mean a test ("kontrolin").
// options.subjects: TAMO subject-name prefix -> the name the dashboard uses.
export function toMarks(items, { testTypes, subjects = {} }) {
  const marks = [];
  const skipped = {};
  for (const item of items) {
    const value = String(item.assessmentValue ?? "").trim();
    if (!value) continue;
    const date = String(item.subjectDate ?? item.assessmentDateTime ?? "").slice(0, 10);
    const subject = String(item.subject ?? "").trim();
    const reason = !/^(10|[1-9])$/.test(value) ? value : !/^\d{4}-\d{2}-\d{2}$/.test(date) ? "no date" : !subject ? "no subject" : null;
    if (reason) {
      skipped[reason] = (skipped[reason] ?? 0) + 1;
      continue;
    }
    const type = String(item.assessmentType ?? "").toLowerCase();
    const prefix = Object.keys(subjects).find((p) => subject.startsWith(p));
    marks.push({
      date,
      month: date.slice(0, 7),
      subject: prefix ? subjects[prefix] : subject,
      mark: Number(value),
      kind: testTypes.some((t) => type.includes(t)) ? TEST : REGULAR,
    });
  }
  marks.sort((a, b) => a.date.localeCompare(b.date) || a.subject.localeCompare(b.subject, "lt"));
  return { marks, skipped };
}

// The diary source the refresh reads marks from: logs in on first use, then returns the raw diary
// items of from..to. roleMatch picks the child (see selectRole).
export function tamoDiary(username, password, roleMatch) {
  let session;
  return {
    async read(from, to) {
      if (!username || !password) throw new Error("Set TAMO_USERNAME and TAMO_PASSWORD, or pass --offline");
      session ??= login(username, password).then(async (token) => ({ token, role: await fetchRole(token, roleMatch) }));
      const { token, role } = await session;
      return fetchDiary(token, role, from, to);
    },
  };
}
