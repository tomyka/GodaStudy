# Goda Study Rewards

A shareable dashboard of Goda's school marks and the money each one earns or costs. It is modelled on PauliusChess. The page is at https://tomyka.github.io/GodaStudy/.

## The agreement

Every mark pays a fixed amount. A test (kontrolinis darbas, "K") counts about double a regular mark ("A"):

| Mark | 10 | 9 | 8 | 7 | 6 | 5 or lower |
|---|---|---|---|---|---|---|
| Regular | +€5 | +€3 | €0 | −€5 | −€10 | −€20 |
| Test | +€20 | +€10 | €0 | −€10 | −€20 | −€50 |

- Earnings add up across all subjects and months.
- The balance is what was earned minus what was paid. It can go below zero, meaning she was paid ahead, and it carries over.

The rates come from the formulas in the "Godos mokslo pasiekimai" sheet. They live in `src/rewards.mjs` and are covered by `test/rewards.test.mjs`. The balance, and which month a payment counts in, is worked out in `src/report.mjs`. A test checks it follows the sheet's Likutis month by month.

## Where the marks come from

The 7th grade (September 2025 to June 2026) was imported once from the sheet's "7 klasė" tab:

- 110 marks, each with its month but no exact date.
- The sheet's payments, each dated the last day of its month.
- A test checks that the import reproduces the sheet: €279 earned, and the same total for every subject and month.

From the 8th grade on, marks are fetched from TAMO. There is no official TAMO API. The fetch uses the unofficial API behind the TAMO IŠMANIEMS mobile app, as documented at https://github.com/sobakintech/tamo-dienynas-api:

- **Terms of Use.** TAMO's terms (sections 9.1, 9.2 and 9.4) forbid this kind of access, and the account could be restricted.
- **Subscription.** It may need an active TAMO IŠMANIEMS subscription.
- **Stability.** TAMO can change the API without notice.
- **What it sends.** Only read requests, about one per school week, once a month.
- **Class data.** Only this child's own marks are available: no class averages and no classmates' marks.

Each run fetches the current school year up to the end of last month, and replaces that year's stored marks. So marks a teacher corrects later are picked up too, and a month appears once it is over. A run in July or August re-reads the year that just ended. A run that returns fewer marks than already stored is refused, so a TAMO glitch cannot wipe marks. After a deliberate correction that removes marks, run `node scripts/update.mjs --accept-fewer-marks` once.

`config.json` controls how TAMO data is read:

- `tamo.from` is the first day TAMO is the source, `2026-09-01`. Marks before it come only from the sheet and are never replaced.
- `tamo.role` picks Goda among the children on the parent account, by matching part of the role's name.
- `tamo.testTypes` lists fragments of TAMO's assessment type that mean a test. The default is `kontrolin`.
- `tamo.subjects` shortens TAMO's subject names to the ones the sheet used, for example "Lietuvių kalba ir literatūra" becomes "Lietuvių k.".

- `tamo.paying` lists the subjects whose marks pay: the sheet's nine plus Chemija. Marks in other subjects (Dailė, Muzika, Fizinis ugdymas, Dorinis ugdymas) are skipped.

Only "Kontrolinis darbas" counts as a test; "Testas", "Savarankiškas darbas" and "Klasės darbas" pay regular rates. Values that are not a mark from 1 to 10 are skipped: attendance ("n"), pass/fail ("įsk") and anything else. The run log names everything it skipped, including subjects that do not pay, so a renamed subject is noticed.

## First-time setup

1. Save the TAMO parent login. Run this in a normal PowerShell window, not with `!` in Claude Code, because it has to prompt for the username and password. It is stored encrypted with Windows DPAPI in `%APPDATA%\GodaStudy\tamo-login.xml`, where only your Windows user on this PC can read it. It is never put in the repo.

   ```powershell
   pwsh scripts/save-tamo-login.ps1
   ```

2. Check what TAMO sends before trusting the first run. This prints only the subjects, assessment types and values from the last four weeks, with no names:

   ```powershell
   pwsh scripts/tamo-probe.ps1
   ```

   Check two things:
   - Tests must show an assessment type that contains `kontrolin`. If they use other wording, put it in `tamo.testTypes`.
   - Subject names should match the 7th-grade ones. If a name differs, add an entry to `tamo.subjects`.

3. The first real fetch is on 1 October 2026, for September. A run before then only reports that there is nothing to fetch yet.

## How it runs

1. On the 1st of every month at 09:00, the Windows scheduled task "GodaStudy monthly TAMO update" runs `scripts/monthly.ps1`. If the PC is off at that time, the task runs as soon as the PC is back on.
2. The script does the following:
   - loads the saved login and pulls the repo,
   - fetches the school year's marks from TAMO (`scripts/update.mjs`),
   - rewrites `site/marks.json` and `site/data.json`,
   - commits and pushes if anything changed,
   - writes a log to `scripts/monthly.log`.
3. The push triggers `.github/workflows/update.yml`, which runs the tests, rebuilds `site/data.json` from the stored marks and payments, and publishes `site/` to GitHub Pages.

To refresh now, run `pwsh scripts/monthly.ps1` or `Start-ScheduledTask "GodaStudy monthly TAMO update"`. Both fetch only months that are over. To also show the current month so far, run `pwsh scripts/monthly.ps1 -ThroughToday`. The next monthly run replaces that partial month with the whole month.

To set up the task on another PC, use the full path to `pwsh.exe`. Task Scheduler does not search PATH, and a plain `pwsh` fails with result 0x80070002 (file not found). With PowerShell from the Microsoft Store, the `WindowsApps\pwsh.exe` launcher below keeps working across PowerShell updates:

```powershell
schtasks /Create /TN "GodaStudy monthly TAMO update" /SC MONTHLY /D 1 /ST 09:00 /TR "$env:LOCALAPPDATA\Microsoft\WindowsApps\pwsh.exe -NoProfile -ExecutionPolicy Bypass -File D:\Projects\GodaStudy\scripts\monthly.ps1"
Set-ScheduledTask -TaskName "GodaStudy monthly TAMO update" -Settings (New-ScheduledTaskSettingsSet -StartWhenAvailable -RunOnlyIfNetworkAvailable -AllowStartIfOnBatteries)
```

## Recording a payout

On GitHub, open **Actions**, then **Record payout**, then **Run workflow**, and fill in:

- **Amount** in euros, for example `20` or `12.50`,
- **Date** as `YYYY-MM-DD`; leave it empty for today,
- **Note**, optional.

The form also works in the GitHub mobile app. Only the repo owner can run it. The payment is added to `site/payouts.json` and the page republishes in about a minute. To fix a mistake, edit `site/payouts.json` on GitHub.

## The dashboard

- **Tiles:** balance, total earned, total paid.
- **School-year filter:** switches the monthly chart and the subject grid between years.
- **Month by month:** net euros per month.
- **Earned and paid:** running totals of both.
- **Subjects:** euros per subject and month. Hover a cell for the marks behind it.
- **Latest marks:** the most recent month's marks, with what each one paid.
- **Payments:** each payment with the balance after it.
- **Pay table:** what each mark is worth.

To add a new school year, add an entry to `years` in `config.json`, then run `npm run rebuild`.

## Code layout

- `src/calendar.mjs`: school months and years.
- `src/rewards.mjs`: mark kinds and rates, and euros per subject and month.
- `src/payouts.mjs`: checks and adds a payment recorded with the form.
- `src/report.mjs`: the money view (earned, paid, balance) and everything `data.json` holds.
- `src/refresh.mjs`: one monthly refresh, including its window and the replace-and-keep rules. It reads from a diary source.
- `src/tamo.mjs`: the TAMO protocol and `tamoDiary`, the real diary source. Tests use a fake one.

The page (`site/index.html`) only draws `data.json`. `CONTEXT.md` defines the domain terms.

## Local use

Needs Node 22 or newer. There are no dependencies.

```sh
npm test         # reward rule, TAMO parsing and merging
npm run update   # fetch from TAMO (needs TAMO_USERNAME and TAMO_PASSWORD)
npm run rebuild  # rebuild site/data.json from site/marks.json, no TAMO
npm run preview  # serve site/ locally
```
