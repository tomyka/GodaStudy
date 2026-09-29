# GodaStudy domain

**Mark**: one grade from 1 to 10 in one subject, with its month and, when it came from TAMO, its date.

**Kind**: whether a mark is a regular mark ("A") or a test ("K", kontrolinis darbas). The kind sets the rates (`KINDS` in `src/rewards.mjs`).

**Earned**: the euros a mark pays or costs under the agreement; summed per subject, month and in total.

**Payment**: money handed over, with its date. It counts in the school month its date falls in (a summer payment counts in June).

**Balance**: everything earned by the end of a month minus everything paid by then; the sheet's "Likutis". Below zero means paid ahead.

**School year**: September to June; July and August have no marks. Labelled in `config.json` `years` (`src/calendar.mjs`).

**Settled month**: a month that is over. The refresh fetches only settled months, so a run on the 1st never shows a new month's first marks.

**Refresh**: one monthly run that reads the diary source for the fetch window and replaces that window's stored marks (`src/refresh.mjs`).

**Diary source**: where the refresh reads diary items from. `tamoDiary` in production; a canned fake in tests.

**Fetch window**: the dates a refresh reads: the current school year up to the end of last month, never before `tamo.from`, where TAMO took over from the imported sheet.
