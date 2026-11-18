# CHANGELOG.md — DiplomaBondhu

## [0.11.8] — Result view restructured to match the reference board-style layout

Owner request: the result view after a roll search must look same-to-same as
the btebresultszone.com result pages shown in his reference screenshots — the
previous build used a custom premium layout instead of the reference structure.

### Result card now mirrors the reference (Flutter)
- **Centered header**: big roll (`#712990`), program title, institute — exactly
  the stacking of the reference page top.
- **Status banner directly under the header** (red "1 subject yet to pass" /
  status text; hidden on clean passes, like the reference).
- **One card per semester** (box with a soft green tint, like the reference):
  semester icon + name, right side `✓ Passed` (green) or the yet-to-pass count
  (red) for the semester that has failed subjects, publication date line with
  a relative "X days / months / years ago" caption, and the GPA row — gray
  `GPA` label chip, big bold green value, letter-grade badge; red `—` when no
  GPA is recorded.
- **Failed/referred subjects are listed inside their own semester's card**:
  code+suffix in bold red (`28553(T)`), subject name underneath, and the type
  word (`Theory` / `Practical`) on the right — same as the reference row.
- Semester grouping uses the subject's own semester from the BTEB subject
  catalog, so a 7th-semester exam PDF that reports a 5th-semester backlog
  (e.g. 28553) shows that subject under the 5th Semester card, exactly like
  the reference. Codes absent from the catalog fall back to the exam semester.
- CGPA highlight kept for 8th-semester records; name/registration now shown
  as subtle info rows above the disclaimer.

### Backend
- Result `check` and `history` responses now include `publishedAt` (the
  published exam's updatedAt) so the app can render real publication dates —
  one honest date per exam; per-semester publish dates are not present in the
  source PDFs, so they are not invented.
- Subject-name enrichment now also resolves each subject's `semester` from the
  catalog (first-wins by regulation) and returns `{code, grade, type, name,
  semester}`.

### Verified
- Backend `tsc --noEmit` clean; 145/145 vitest.
- Flutter analyze clean; 30/30 widget tests (new: failed subject under its own
  semester card with formatted date; existing chip/name/banner assertions
  updated for the per-semester repetition, matching the reference). Visual QA
  on device: Not run (KI-10).

## [0.11.7] — BTEB subject catalog browser + referred subject names

Owner request: (1) the failed/referred subject on a result must show the
subject NAME with its code — e.g. `28553(T) — Computer Architecture &
Microprocessor`; (2) an in-app subject catalog browser like the
btebresultszone.com/booklists pages (technology → regulation → semesters →
subjects, with credit/marks detail).

### Data (checked-in seed, no runtime scraping)
- `backend/data/bteb-subjects-2022.json` — all 41 technologies of Regulation
  2022, 2,174 subject rows (code, name, credit, theory/practical max marks,
  ppw, theory/practical type) with per-semester grouping.
- `backend/data/bteb-subjects-2016.json` — all 33 technologies of Regulation
  2016, 1,581 rows (code + name + optional-subject group markers; 2016 booklists
  publish no credits/marks — absent, not invented).
- Both harvested 2026-11-18 from the published btebresultszone.com catalog
  data (owner-designated source). No BTEB rules were invented; only published
  rows are stored. Spot-verified against the owner's reference screenshots
  (28553 → "Computer Architecture & Microprocessor", sem 5, 4 credits,
  150/50 marks).

### Backend
- New `BtebSubject` model (`bteb_subjects` collection; unique
  regulation+technology+semester+code) and `/bteb-subjects` module: public
  `GET /technologies` and `GET /subjects` (filters, search, pagination),
  authenticated `GET /names` (code→name resolution, 60 codes max), admin
  `POST /admin/import` (ACADEMIC_MANAGE, 12 MB JSON, chunked upsert,
  audit-logged `bteb_subjects.imported`).
- Seed script: `npm run seed:subjects` (reads the data files, upserts without
  duplicates).
- `results` service: check + history responses now carry `name` for every
  subject, joined server-side from `bteb_subjects`; graceful `name: null` when
  the catalog has no matching code.

### Flutter
- Referred/failed subject chips now show the subject name under the
  code+suffix (e.g. `28553(T)` above `Computer Architecture & Microprocessor`);
  falls back to the code-only chip when the name is unknown.
- New `subjects` feature: Subject Catalog screen (Regulation 2022/2016 chips,
  technology search, animated cards with subject counts) and Technology
  Subjects screen (semester-grouped sections, code badge, name, optional-group
  label, credits + theory/practical marks pills, in-app search). Catalog entry
  point: book icon in the Result Checker app bar (`/subjects`, `/subjects/:slug`).
- New ARB keys (en + bn) for all catalog strings.

### Verified
- Backend `npx tsc --noEmit` clean; 145/145 vitest (6 new: technologies list,
  subjects list/search/pagination, names auth + resolution, admin import
  upsert + RBAC, results enrichment, empty-catalog fallback).
- Flutter analyze clean; 29/29 widget tests (new: named referred chip;
  catalog list/filter/error; semester grouping with credits, marks pills,
  search).
- result-service pytest untouched (48 tests).
- Catalog browser visual QA on device: Not run (KI-10).

## [0.11.6] — Result Checker premium redesign (advanced UI/UX + animations)

Owner request: go beyond the reference screenshots — clearer text, more
polished and professional layout, smooth animations, everything neatly
organized.

### Redesigned (Flutter `ResultCheckerScreen`, zero new packages)
- **Navy gradient header** (deep navy → navyDark, per the design system) with
  an icon plate, roll number in bold semibold-white, title + institute clipped
  to 2 lines — matches the premium look of the approved design direction.
- **Search upgrade**: tag icon prefix, clear (×) button, Enter key submits,
  helper hint "6–10 digits", wider 48px full-width button with icon.
- **CGPA highlight**: softer green gradient card, verified-badge, scale-in
  entrance animation.
- **Semester tiles rebuilt**: index avatar (e.g. `7`) per row, semester name
  with the small "This exam" caption underneath, GPA in tabular figures, letter
  grade in a soft-rounded badge — cleaner hierarchy than plain text rows.
- **Staggered entrance animations**: record cards and every semester tile
  fade-in-up one after another (pure `TweenAnimationBuilder` + `Interval`, no
  dependency); status/CGPA blocks animate in.
- **Consistency**: DbColors / DbRadius / DbSpacing tokens everywhere; tabular
  figures so GPA digits align vertically.

### Verified
- flutter analyze clean; all 23 widget tests still pass (all asserted texts
  unchanged — roll, status, GPA values, letter grades, CGPA row, chips).

## [0.11.5] — Google Drive folder ingest (one link → all result PDFs)

Owner requested: paste ONE shared Drive folder link and have every PDF inside
it pulled, parsed and queued — the Drive API key is saved from the admin panel
(never in code or browser) and the key will be added by the owner later.

### Added
- **Python — `POST /parse/drive/job`**: accepts a folder link (or raw folder
  id) + Drive API key → lists PDFs via Drive API v3 (max 20 files) →
  downloads each (50 MB cap, `%PDF` check) → parses each into its OWN batch,
  all streamed to the terminal-style live log. One broken file is skipped
  with a logged reason; the rest continue. 9 new pytest cases (48 passed).
- **Node**:
  - `AppSettings.integrations.googleDriveApiKey` — `select: false` in the
    schema, so the key can never leak through any settings response
    (public `/settings/app` or admin `PUT /admin/settings`).
  - `GET/PUT /results/admin/drive-key` (masked display, audited set/clear;
    env `GOOGLE_DRIVE_API_KEY` overrides the stored key).
  - `POST /results/admin/parse-drive` — zod-validated folder link, 400 with a
    clear message when no key is set yet. 139 vitest passed (3 new).
- **Admin panel**:
  - Settings → new "Google Drive API key" card: save/remove key, masked
    status (e.g. `AIzaS…3f7c`), never returned raw after save.
  - Results → third input: Drive folder link → same review queue; every PDF
    becomes a separate batch with its own Exam ID/Confirm-import buttons.
- **Not yet live-verified with a real Drive key** — the Drive API calls are
  covered by mocked-transport tests; a real-folder smoke test is pending
  until the owner creates the free key (follow-up test report entry).

## [0.11.4] — Upload result PDFs from a link + multiple files at once

Owner request: results must be addable (a) by pasting a direct PDF download
link and (b) by selecting several PDFs in one go — each becoming its own
reviewed batch, with the live terminal log visible throughout.

### Added
- **Python — `POST /parse/url/job`**: downloads a PDF from a URL (http/https
  only, 50 MB cap, `%PDF` magic check, 60s timeout) in a job thread, then runs
  the same parse pipeline — the admin panel sees a full terminal log
  (`downloading … → downloaded N bytes → page X/Y scanned → done`).
- **Python — SSRF guard**: `_validate_public_url` refuses non-http(s) schemes
  and any host that resolves to a private/loopback/link-local address,
  re-checked after redirects.
- **Admin panel**: the upload card now takes (1) multiple selected PDFs —
  parsed one by one, each becoming a separate batch — and (2) a direct PDF
  link. Every processed PDF lands in a review queue; each batch is imported
  individually with its own Exam ID + title (nothing auto-imports).
- **Node — `POST /results/admin/parse-url`**: validates the URL body (zod,
  http/https only) and proxies to the python service under the admin
  permission guard. 136 vitest passed (3 new).
- result-service pytest 39 passed (URL guard + URL job pipeline cases).
- Google Drive folder ingest is deferred until the owner creates the free
  Drive API key (see conversation) — direct links already cover single files.

## [0.11.3] — Transparent warnings + terminal-style live parse log in the admin panel

Owner request: during PDF upload the admin panel must show WHY each warning
happened and stream the upload/parse progress live, terminal-style, so a
wrong batch can never be imported unnoticed.

### Added
- **Python parser — warning transparency**: every discard now explains itself
  with `page N: <reason>: "<offending text snippet>"` (snippet ≤100 chars).
  Raised warnings also stream through a new ``on_warning`` callback (both
  parser paths). 5 new pytest cases incl. a synthetic gpa-map PDF exercising
  the malformed-buffer path end-to-end (27 passed, 1 skipped).
- **Python `/parse/job` — live log**: each job now carries a terminal-style
  `log` (timestamps, page milestones every 25 pages, ⚠ WARNING lines the
  moment they occur, final summary with record/warning counts); exposed on
  `/parse/job/:id` (last 40 lines). Verified live on the real 1103-page PDF:
  mid-parse polls show pages streaming, and the one warning surfaced with its
  page (507) + text — a board footer note, not a student record.
- **Admin panel — terminal-style live log**: a dark monospace log box streams
  under the parse progress bar while parsing (warnings highlighted amber);
  after parse, the warnings block now explains what a discard means and lists
  each warning in full (up to 20). Import stays a separate confirm step —
  nothing is imported without explicit owner approval.
- Backend: no API change (parse-job proxy passes the raw payload through).

## [0.11.2] — CGPA display + letter grades on result cards

Based on the owner-provided BTEB grade-scale reference (screenshots of
btebresultszone.com, transcribed 2026-11-18; official verification tracked
as KI-1).

### Added
- **Python parser**: extracts the cumulative `cgpa:` value when the board
  sheet prints one (e.g. `700014 (cgpa: 3.45 ( gpa8: 3.50, …))` — seen on
  2016-regulation 8th-semester sheets); `ParsedRecord.cgpa` + batch export
  (`cgpa`: null when absent); 4 new pytest cases (22 passed, 1 skipped).
- **Python import**: exports `cgpa` into the imported result documents.
- **Node API**: `cgpa` flows through both `GET /results/check` and
  `GET /results/history` unchanged (verified 133 vitest, tsc clean).
- **Flutter app**: result cards now show
  - a CGPA highlight row whenever the record brings a board-printed CGPA
    (never computed client-side),
  - a derived letter grade (A+, A, A− …) beside every semester GPA using the
    documented BTEB scale (display-only: highest grade point ≤ GPA, GPA < 2.00
    → F; validated against reference screenshots 3.73→A−, 3.45→B+).
  flutter analyze clean, 23 tests passed (2 new: letter grade, CGPA row).
- **Docs**: `docs/GPA_CALCULATION_SPECIFICATION.md` §3.1 documents the
  confirmed BTEB grade scale + provenance and §3.1.1 the letter-grade
  derivation rule and CGPA pass-through policy.

## [0.11.1] — Fix: rate limiter starved the result upload progress polling

- On the owner's machine the admin "Parse PDF" polling (every 0.7s)
  consumed the global 300-requests/5-min rate limit — the progress bar
  froze at 0/0 and a red "Too many requests" appeared mid-parse.
- The global limiter now skips the authenticated admin status polls
  (`/results/admin/parse-job/:id`, `/results/admin/import-progress/:id`)
- The admin panel pollers are resilient: transient failures (429,
  brief network drops) are tolerated (up to 15 consecutive), polling
  runs at 1s; the live parse/import bar no longer aborts the whole
  flow on a single error. Backend vitest 133 passed; admin tsc+build
  OK.

## [0.11.0] — Result experience upgrade: full result cards, roll-only search across all exams, live import progress

### Added
- **Python result-service — live progress**:
  - `POST /parse/job` starts the PDF parse in a background thread and
    returns `{jobId}`; `GET /parse/job/{jobId}` reports `{stage,
    pagesDone, pages}` while running and the same preview payload as
    `/parse` when done (or an explicit `{stage: error, detail}`).
    Multi-hundred-page board sheets no longer look frozen.
  - `GET /import/{batchId}/progress` reports `{stage, total, done}`
    chunk-by-chunk while a batch imports into MongoDB.
  - `parser.parse_pdf(on_page=...)` now accepts a per-page progress
    callback (both the pdfplumber and pypdfium2 code paths).
- **Node API**:
  - `GET /api/v1/results/history?roll=` (student, rate-limited,
    zod-validated) — returns EVERY published result record for a roll
    across all imported examinations (newest semester first), each with
    exam `title`, `institute`, `semesterGpas` (gpa1…gpa8 incl. `ref`
    semesters as null), referred/expelled `subjects` with `(T)`/`(P)`
    type, and the non-official disclaimer. 404 when the roll has no
    published result.
  - Admin proxies: `POST /results/admin/parse-job`,
    `GET /results/admin/parse-job/:jobId`,
    `GET /results/admin/import-progress/:batchId`.
  - `checkResult` now also returns the exam `title`.
- **Admin panel (Results page)** — live progress bars for both stages:
  "Parsing PDF pages… X / Y (Z%)" and "Importing records into MongoDB…
  X / Y (Z%)"; parse errors surface the real parser/service message
  instead of a generic failure; exam ID hint documents the
  program-semester-regulation-year convention (one PDF per program +
  semester).
- **Flutter Result Checker — full result card** (matches the owner's
  reference screenshots):
  - roll-only search (no exam dropdown) via `/results/history`; shows
    "N published exams found for this roll" when several exams match.
  - Navy header: roll number, exam title (program + semester),
    institute name.
  - Status banner: green "Passed", red "N subject(s) yet to pass"
    (also shown when the board still lists referred subjects on an
    otherwise passed record), amber "Dropped", red "Expelled"/"Failed".
  - Referred subject chips in red with subject code and `(T)`/`(P)`
    suffix (e.g. `28553(T)`).
  - Semester GPA timeline (8th → 1st) with green GPA values, red dash
    for `ref` semesters, and a "This exam" badge on the semester this
    result belongs to. Bangla semester names (১ম…১০ম) in bn locale.
- New l10n keys (en+bn): resultPassed, resultReferred, resultDropped,
  resultExpelled, resultFail, resultSubjectsYetToPass, resultThisExam,
  resultGpa, resultSubjectsList, resultTheory, resultPractical,
  resultExamCount.

### Verified (live end-to-end, real 1103-page owner PDF)
- Parse job with visible live progress (pagesDone/pages) → done in ~3s
  with 31,094 records; import progress polled → finished 31,094/31,094.
- Student history: 700014 → pass, gpa7 3.73, full gpa1…gpa7 map, title;
  712990 → gpa7 3.54 with `28553(T)` referred subject (banner logic);
  764170 → expelled; unknown roll → 404; malformed roll → 400;
  unauthenticated → 401.

### Tests
- Backend vitest: 133 passed (parse-job proxy, malformed job id,
  import-progress proxy, history: newest-first ordering, titles, 404,
  400, auth).
- Python pytest: 18 passed, 1 skipped (mongo-dependent pipeline).
- Flutter: analyzer clean, 21 tests passed (6 result-checker screen
  tests incl. backlog banner and multi-exam header).
- Admin panel: tsc clean, vite build ok.

## [0.10.0] — Phase 12: BTEB Result Checker (implemented & tested)

### Added
- **Python result-service (`result-service/`)** — approved by the project
  owner as a separate service. Parses BTEB institute-wise result PDFs
  (table rows + text-line fallback; rolls, registration numbers, GPAs,
  pass/fail status) into JSON batches keyed by content hash, and bulk-imports
  confirmed batches into `results_db` (unique index `examId+roll`). Endpoints:
  `/health`, `POST /parse`, `GET /batches`, `POST /import/{batchId}` — all
  behind a shared service bearer token (503 if unconfigured). 7 pytest cases
  (parser units + full parse→import→lookup pipeline against a live Mongo).
- **Node API `/api/v1/results`** — the only student-facing surface:
  - `GET /results/meta` — published result sets
  - `GET /results/check?examId=&roll=` — roll lookup, 30/5min rate limit,
    zod-validated (roll 6-10 digits, NoSQL-operator stripping), 404 on miss,
    response always carries the "not an official BTEB service" disclaimer
  - admin proxy (CONTENT_MANAGE): `GET /admin/batches`, `POST /admin/parse`
    (multipart proxied raw to python — no new Node dependency),
    `POST /admin/import` (audit-logged `results.import`); 503 when the
    python service is not configured
- **Admin panel: BTEB Results page** (`/results`, CONTENT_MANAGE) — 3-step
  workflow: upload PDF → review parse preview (record count, warnings, first
  5 rows) → confirm import with examId/title; imported examinations table
  (records, check counts) and parsed-batches table. New `apiRaw` client
  helper for non-enveloped proxy responses.
- **Flutter: Result Checker screen** (`/results/checker`) — exam dropdown,
  roll input with client-side validation, result card (name, registration,
  GPA, pass/fail chip) with the non-official disclaimer, dedicated empty
  (no results published), not-found and error states; en+bn l10n (9 new
  keys, 143 total). Home dashboard's result-checker card is now tappable
  and still gated by the admin `resultChecker` feature flag.
- **E2E: `scripts/e2e-results-flow.mjs`** — live full-stack flow (real
  python service + real Node API + real Mongo): upload → parse → import →
  student check → RBAC/validation/audit checks.
- Backend env additions (all defaulted, backwards compatible):
  `RESULT_SERVICE_URL`, `RESULT_SERVICE_TOKEN`, `RESULTS_DB`.
- **Render blueprint (`render.yaml`)** — one-click deploy of api (Node web
  service), result-svc (Python web service), admin (static site, SPA
  rewrite, security headers); secrets via `sync: false` / `generateValue`;
  DEPLOYMENT_GUIDE §2 has the step-by-step (Atlas setup, env wiring,
  UptimeRobot keep-alive strategy that stays inside the 750 free
  instance-hours).
- **Parser hardened against real board PDFs** — regexes now match ASCII
  digits only (Python `\d` also matched Bangla numerals ০-৯, which garbled
  subset-font Bangla text could turn into fake rolls); two real BTEB board
  notice PDFs (downloaded from bteb.gov.bd) added as regression fixtures —
  they must yield zero student records (2 new tests).

### Fixed
- Python parse endpoint consumed the multipart stream twice
  (`file.read()` + `request.json()`) → "Stream consumed" 500s; now takes
  `examId`/`title` as multipart Form fields
- Python import endpoint's `Request` annotation broke after the import
  cleanup → replaced with `Body` parameter
- Parser name extraction only kept the first name token ("Student" instead
  of "Student One"); text-line fallback now joins consecutive name tokens
  and skips PASS/FAIL/grade tokens

## [0.9.0] — Phase 11: Remaining spec gaps closed (implemented & tested)

### Added
- **Password reset flow (spec 6.2)** — full stack:
  - Backend: `POST /auth/forgot-password` (always 202, no user enumeration,
    max 1 active request per user per 10 minutes) + `POST /auth/reset-password`
    (one-time hashed token, 30-minute expiry, revokes all sessions, audit
    `auth.password_reset_requested/completed`). New `PasswordReset` model with
    TTL index. Admin support action: `POST /admin/students/:id/password-reset`
    issues a one-time reset code (shown once, stored hashed, audit
    `auth.password_reset_issued`) for out-of-band delivery until email
    infrastructure exists (see KNOWN_ISSUES KI-12)
  - Admin panel: "Reset password" action on the Students page with a
    copy-able one-time code modal and delivery instructions
  - Flutter: new Forgot Password screen (email request step + reset-code and
    new-password step), "Forgot password?" link on the login screen,
    `/forgot-password` guest route, 9 new l10n keys (en+bn, parity verified,
    134 keys total)
- **Home global search (spec 6.3):** search bar on the home dashboard that
  forwards the query into the Study Library search
- **Community sharing (spec 6.8):** share button on post detail via
  `share_plus` (system share sheet)
- **App icon:** generated launcher icons (legacy rounded + adaptive
  foreground/background, all densities) — navy background, emerald graduation
  cap + open book

### Changed
- Material detail: external-link and download buttons are now live via
  `url_launcher` (external browser) — resolves KI-11
- New Flutter dependencies: `url_launcher ^6.3.3`, `share_plus ^13.3.1`
  (first-party flutter.dev packages; spec 6.4/6.8 require external links and
  sharing)

### Tested (exact commands)
- backend `npx tsc --noEmit` clean; `npx vitest run` → **118/118 pass**
  (6 new password-reset tests)
- backend `E2E_BASE=http://127.0.0.1:4101/api/v1 node scripts/e2e-student-flow.mjs`
  → **91/91 checks pass** (8 new: forgot-password no-enumeration, admin code
  issue, invalid-code 400, reset 200, single-use 400, old password 401,
  new password login 200)
- admin panel `npm run test` → **8/8 pass**; `npm run build` (tsc + vite) →
  success
- `flutter analyze` → No issues found; `flutter test` → **14/14 pass**

### NOT tested (honest limitations)
- Still no Android device/emulator run (KI-10) — icon, share sheet, and
  url_launcher behavior on real Android remain unverified
- Email delivery of reset codes is out-of-band via admin until SMTP/email
  infra is approved (KI-12)


## [0.8.0] — Phase 10: Hardening — student-flow E2E + cross-client bug fixes (implemented & tested)

### Added
- `backend/scripts/e2e-student-flow.mjs`: live-server end-to-end test covering every
  API surface the Flutter app uses (auth, profile, settings, notifications, library,
  bookmarks, exams incl. attempt+scoring with negative marking, GPA semester/CGPA/
  target/history, planner, community incl. guidelines-accept + PII check, RBAC
  denial checks, account deletion request) — **83/83 checks pass** against a live
  server on `E2E_BASE` (default 4100)
- Admin panel: question **Publish/Unpublish** buttons in the Exams page questions
  tab (backend routes existed only after the fix below; exam publish/close buttons
  already existed)

### Fixed (real bugs found by the E2E run)
1. Backend: no question publish route existed — exams could never be published
   (exam publish returned 409 "Exam has no published questions"). Added
   `adminSetQuestionStatus` in exam.service.ts + `POST /exams/admin/questions/:id/publish`
   and `/unpublish` routes (audit entries `question.published`/`question.draft`).
2. Flutter: app never called `POST /community/guidelines/accept` — every post from
   the app would 403. `CommunityRepository.createPost` now accepts guidelines first.
3. Flutter: `TargetEstimate.fromJson` read `requiredGpa` but the backend returns
   `requiredAverageGpa` — target screen always showed 0. Now reads both (fallback).
4. Backend: community post detail did not populate the author name (list did) —
   the app showed a generic name on the detail screen. `getPostWithComments` now
   populates `authorId` with `name` only (no PII).

### Tested (exact commands)
- `cd backend && E2E_BASE=http://127.0.0.1:4101/api/v1 node scripts/e2e-student-flow.mjs`
  → **83/83 checks passed** (live server, real Mongo)
- `npx vitest run` (backend) → **112/112 pass** after the backend changes
- admin-panel `tsc` typecheck → clean; `npm run test` → **8/8 pass**;
  `npm run build` → success
- (P9 state unchanged: `flutter analyze` clean, `flutter test` 14/14)

### NOT tested (honest limitations)
- Still no Android device/emulator run (KI-10) — see 0.7.0 entry
- E2E scripts use throwaway local credentials; never run against production


## [0.7.0] — Phase 9: Flutter Student App (implemented & analyzed; not device-tested)

### Added
- Flutter student app (`/mobile_app`, Flutter 3.50 / Dart 3.14, Android):
  Riverpod 3 state management, GoRouter navigation, feature-based architecture
  (`app/`, `core/`, `shared/`, `features/`)
- Features: splash + animated intro, onboarding with language selection (bn/en),
  login/register, home dashboard (settings-driven sections, maintenance banner,
  coming-soon result checker card, recent materials), Study Library (5 types,
  search, detail, bookmarks, report), Exam Center (list, rules, timed runner with
  auto-submit + mark-for-review, result review with explanations, history, stats),
  GPA hub (semester GPA marks/grade modes from server profile structure, CGPA with
  strategy-aware inputs, history, target estimator with disclaimer), Planner
  (tasks/goals/routine), Community (feed, post detail, composer, comments, likes,
  reports), Notifications (list, unread, preferences), Profile (info, quick links,
  logout, account deletion request), Settings (language, theme, notification
  preferences, change password, about)
- Core infrastructure: `ApiClient` (envelope parsing, Bearer auth, single-flight
  refresh-on-401, forced logout on refresh failure, Dio error mapping),
  `flutter_secure_storage` token storage, `ApiException` with backend error codes,
  shared async-state widgets, full light/dark theme from UI_UX_GUIDE tokens,
  l10n (123 keys, en + bn, key parity verified)
- Backend (backward-compatible): `refreshToken` now also returned in the body of
  `/auth/login`, `/auth/register`, `/auth/refresh` (native apps cannot use
  httpOnly cookies); cookie flow retained for the admin panel
- Android config: INTERNET permission, app label "DiplomaBondhu",
  applicationId `bd.diplomabondhu.app`
- Tests: 14 Flutter tests (ApiClient envelope parsing, refresh-on-401 retry,
  forced logout, model parsing incl. `_id` fallback, login form validation
  widget tests)

### Changed
- Migrated all UI imports from `package:flutter/material.dart` to
  `package:material_ui/material_ui.dart` (Flutter 3.50 deprecates the old
  material entrypoint; material_ui is the official replacement and ships with
  the SDK). Localization delegates use `GlobalMaterialLocalizations.delegates`
  from material_ui; generated l10n files are excluded from analysis.

### Tested (exact commands)
- `flutter analyze` → No issues found
- `flutter test` → 14/14 pass
- backend `npx vitest run src/tests/auth.test.ts` → 16/16 pass (after
  refreshToken response change); `npx tsc --noEmit` clean

### NOT tested (honest limitations)
- No Android device/emulator run (sandbox has no Android SDK or Java) — the app
  compiles/analyzes/tests but has never launched on a device
- No release APK/AAB build yet (requires Android SDK; see DEPLOYMENT_GUIDE)

## [0.6.0] — Phase 8: Admin Web Panel + GPA engine hardening (implemented & tested)

### Added
- React Admin Panel (`/admin-panel`): React 18 · TypeScript · Vite · Tailwind CSS ·
  TanStack Query · React Router — talks ONLY to the central REST API
- Screens: Login, Dashboard (live stats), Students (search/filter/suspend/reactivate
  with reason + audit history), Academic Structure (generic CRUD for programs,
  regulations, institutes, sessions, technologies, semesters, subjects, chapters),
  Study Materials (CRUD, publish/unpublish, content-report queue), Exams & Questions
  (question bank with options/correct key/explanation, exam builder, publish/close),
  GPA Profiles (full Draft → Verification → Testing → Approval → Publish workflow with
  one-click Test Run result viewer), Community Moderation (reports + post
  hide/remove/restore), Announcements (targeted: all/program/department/semester,
  scheduling), App Settings (branding, homepage sections, feature flags, maintenance
  mode, support info, legal), Audit Logs (filterable)
- Permission-aware navigation and route guards (admin = all, moderator = moderation only)
- Access token in memory-backed storage + automatic refresh via httpOnly cookie
- Admin panel tests: 8 (login validation, token storage, student-role rejection, RBAC map)
- E2E scripts (`backend/scripts/`): `e2e-admin-smoke.mjs` (17 checks) and
  `e2e-gpa-flow.mjs` (18 checks) run against a live server + in-memory MongoDB

### Fixed
- GPA engine: `credit_weighted` CGPA strategy was declared in the profile schema but
  threw at runtime — now implemented (weights = per-semester total credits supplied in
  the request; partial completion normalized; class band only on full coverage)
- `GpaValidationError` mapped to HTTP 400 (was leaking as 500 INTERNAL)
- CGPA integrity checks are now strategy-aware (semester_weighted: weights sum to 100;
  credit_weighted: positive unique weights)
- Admin panel Announcements page corrected to the real backend schema
  (`targeting{all,programIds,technologyIds,semesterIds}`, `category`, `scheduledAt`)

### Tested
- Backend: `npx tsc --noEmit` clean · `npx vitest run` **112/112** pass · build OK
- Admin panel: typecheck clean · **8/8** tests · production build OK (gzip ≈ 83 kB)
- Live E2E: admin smoke **17/17**, GPA flow **18/18** (login → program → regulation →
  profile → test-run → workflow gates → publish → student login → marks/grade GPA →
  CGPA → history; publish correctly blocked when test suite fails or recipients = 0)

---

## [0.5.0] — Phase 7: Planner, Community, Notifications (implemented & tested)

### Added
- Planner: Routine (weekly slots, per-user), Tasks (due/reminder, date+status
  filters, soft delete), Goals (progress with auto-achieve), Calendar (month view)
- Community: guidelines gate (posting blocked until accepted), posts feed
  (type/tag filters, hidden/removed excluded), author-only edit window (30 min),
  like/unlike (idempotent), comments + threaded replies, reports, moderation
  (hide/remove/restore, report queue, audit-logged)
- Notifications: inbox (paginated + unread count), mark read / read-all,
  per-category preferences, Announcement model with targeting (all / program /
  technology / semester), publish fan-out to recipients, scheduled announcements
- FCM dispatcher stub (`core/fcm.ts`) — inbox-only until Firebase exists (KI-3)
- New models: Routine, Task, Goal, CommunityComment, Notification,
  NotificationPreference, Announcement; User.guidelinesAcceptedAt; post likes
- Mounted `/planner`, `/community`, `/notifications` in app.ts
- Tests: 17 new — total 107 passing

### Security
- All planner data owner-scoped (IDOR tested)
- Moderation restricted to `community.moderate` permission
- Announcement publishing restricted to `notifications.manage`

---

## [0.4.0] — Phase 6: Exam Center (implemented & tested)

### Added
- Question model (MCQ: options, correctKey, explanation, marks, publish status)
  with schema-level rule: correctKey must match an option key
- ExamAttempt model: question-order snapshot, server-set deadline, answers map,
  partial unique index enforcing ONE active attempt per exam per user
- Student endpoints: published exam list (filters), exam detail (keys stripped),
  start/resume attempt (server deadline), save answer (deadline + membership
  validated), submit (idempotent, server-side scoring with negative marking),
  result (per-question + explanations, post-submission only), history, stats
- Admin endpoints (exams.manage): question CRUD, exam CRUD, publish (requires
  published questions), close, soft delete, per-exam attempts view — audit-logged
- Mounted `/api/v1/exams` in app.ts
- Tests: 14 new — total 90 passing

### Fixed
- Mongoose subdocument spread dropped fields when serializing per-question results

### Security
- Answer keys/explanations never leave the server before submission
- All scoring server-side; client scores are never trusted
- Late answers rejected by server clock regardless of client state

---

## [0.3.0] — Phase 5: Study Library (implemented & tested)

### Added
- Models: Bookmark (unique user+material), ContentReport (open/resolved/dismissed
  with resolution audit), MaterialView (per-user recently-viewed, unique upsert)
- `optionalAuth` middleware for public endpoints that personalize when logged in
- Student endpoints: materials list (type/hierarchy/examYear filters, Bangla+English
  text search, recent/popular/title sort, pagination), material detail (public,
  viewCount + recent-view recording), recently viewed, bookmark add/remove/list,
  report incorrect content, download (respects `downloadAllowed`)
- Admin endpoints (content.manage): materials list w/ status filter, create, update,
  publish/unpublish, soft delete, report queue + resolve/dismiss — all audit-logged
- Mounted `/api/v1/materials` in app.ts
- Tests: 11 new — total 76 passing

### Fixed
- Admin materials sub-router was missing `requireAuth` (would 403 even for admins)

### Deferred
- Direct file upload (multipart + storage backend) — KI-7, pending hosting decision

---

## [0.2.0] — Phase 4: GPA Calculation Engine (implemented & tested)

### Added
- GPA engine (`gpa.engine.ts`): pure, I/O-free calculation functions —
  `computeSemester` (marks-based with component weights + minima, grade-based),
  `computeCgpa` (semester-weighted with partial normalization + class bands),
  `computeTargetCgpa` (labelled estimate)
- CalculationProfile model with status workflow: draft → verification → testing →
  approved → published → retired; verification sourceRefs; test-run results;
  unique (regulationId, version)
- CalculationHistory model (owner-scoped, soft delete, profileVersion pinned)
- Student endpoints: profiles list (published only), profile structure,
  calculate/semester, calculate/cgpa, results CRUD (owner-only), target estimate
- Admin endpoints: profiles CRUD (new PUT update blocked for published/retired),
  workflow transitions (gated: verification needs sourceRefs, publish needs passed
  test-run + sourceRefs), profile test-run (integrity checks: table coverage,
  monotonic points, weight sums, pass-grade existence)
- Mounted `/api/v1/gpa` in app.ts
- Tests: 30 new (20 engine, 10 API) — total 65 passing

### Fixed
- CGPA formula divided by 100 twice (4.00 → 0.04) — critical, caught by tests
- CGPA precision loss from rounding intermediate contributions
- Grade lookup failure on float artifacts (79.99000000000001%)
- Target CGPA formula wrong for partial remaining-weight scenarios
- Integrity check falsely failing decimal grade-table boundaries

### Security
- All calculation server-side; clients receive results + breakdown only
- Publishing gates make unverified profiles unreachable for students

---

## [0.1.0] — Phase 3: Backend Foundation (implemented & tested)

### Added
- Backend: Node.js + Express + TypeScript modular monolith (`backend/`)
- Zod-validated environment config (fail-fast at boot)
- Auth: register (students only), login, JWT access + rotating refresh tokens
  (hashed, reuse detection with family revocation), logout, session list/revoke,
  change-password (revokes all sessions)
- RBAC middleware + permission map (student/moderator/admin)
- Request validation middleware with NoSQL operator stripping
- Centralized error handler (AppError, Mongoose validation/cast/duplicate mapping)
- Models: User, RefreshToken, AuditLog, EducationProgram, Regulation, Institute,
  AcademicSession, Technology, Semester, Subject, Chapter, AppSettings,
  StudyMaterial, Exam, CommunityPost (last three: minimal, for dashboard counts)
- Academic module: public read (paginated, searchable) + admin CRUD (audit-logged,
  soft delete)
- Users module: profile, academic-info, preferences, FCM token management,
  deletion request
- Admin module: dashboard aggregates, student list/detail, suspend/reactivate,
  audit-log viewer, settings update
- Settings module: public `/settings/app`
- Health endpoint `/health`
- Main Admin seed CLI (`npm run seed:admin`) — the only way to create admins
- Tests: 35 integration tests (Vitest + mongodb-memory-server), all passing

### Security
- bcrypt (cost 12), httpOnly SameSite=strict refresh cookie, helmet headers,
  rate limiting (disabled only in test env), no secrets in repo (.env.example only)
- zod upgraded to v4 (fixes high-severity advisory); `npm audit --omit=dev` clean

### Tested
- `npx tsc --noEmit` clean · `npx vitest run` 35/35 pass · `npm run build` success
- See docs/TEST_REPORT.md

## [Blueprint v1.0] — Planning & Design (awaiting approval)

### Added (documents only — no code)
- PROJECT_REQUIREMENTS.md — approved requirements + owner decisions D1–D3
- MASTER_BLUEPRINT.md — feature matrix, screen lists, user journeys, risks
- SYSTEM_ARCHITECTURE.md — architecture of backend/app/admin + ADRs
- DATABASE_DESIGN.md — collections, indexes, retention
- API_DOCUMENTATION.md — REST v1 endpoint specification
- GPA_CALCULATION_SPECIFICATION.md — regulation-profile engine design
- UI_UX_GUIDE.md — design tokens + 32 student screens + admin UX
- SECURITY_GUIDE.md, TESTING_STRATEGY.md, DEPLOYMENT_GUIDE.md
- DEVELOPMENT_ROADMAP.md — phases P3–P10
- research/BTEB_GRADING_RESEARCH.md — sources + verification status

### Decisions recorded
- D1: BTEB rules researched from web, owner-verified before enabling profiles
- D2: FCM push in first release (owner provides Firebase project)
- D3: Email verification & password recovery deferred to post-R1

## [0.10.6] — Fix: Result Checker card hidden on fresh installs

- `GET /settings/app` created app settings with an empty
  `homepageSections` array on a fresh database, so the Flutter home
  screen never rendered the "BTEB Result Checker" card even after a
  successful import (`resultCheckerVisible` requires the
  `result_checker` section). Backend now seeds default homepage
  sections (`announcements`, `quick_access`, `materials`, `exams`,
  `gpa_calculator`, `planner`, `community`, `result_checker`) on
  first creation; admins can still reorder/hide sections and toggle
  the `resultChecker` feature flag from Admin → Settings. Backend
  tests updated accordingly (127 passed).
- `getAppSettings()` also auto-heals settings documents created
  before this fix: any missing default section (including
  `result_checker`) is appended on the next public settings read, so
  existing installations work without manual database changes.
  Hiding remains admin-controlled (toggle in Admin → Settings;
  `resultChecker` feature flag still respected).

## [0.10.5] — KI-14: parser verified against a real BTEB result sheet (owner-provided)

- The owner downloaded a real institute-wise board result PDF (1103 pages,
  `DIPLOMA IN ENGINEERING`, 7th Semester, 2022 Regulation, exam year 2026,
  392 institutes) from the result portal. It exposed a new board format we
  had never seen: braced/parenthesised `gpa-map` records that wrap across
  lines (`745547 { gpa7: ref, gpa6: ref, gpa4: 3.30, ... ref_sub: 25853(T) }`),
  plus `promoted`/`dropped out`/`Expelled` sections, records whose
  closing bracket and the next roll share one line, ref-subject-only records,
  and stray bare rolls (board print artifacts).
- Parser: added a fast text path (`pypdfium2` reads all 1103 pages in ~2.4s;
  pdfplumber hangs on files this size) with a stack-of-buffers gpa-map parser,
  intro-based status detection (pass/referred/dropped/expelled), institute
  attachment, junk-line filtering (phone/memo/email cover text), and a strict
  balanced-bracket rule so a record only closes on its own final bracket.
- Fields per record now include `instituteCode`, `institute`,
  `semesterGpas` (gpa1..gpaN with `ref` stored as null), `examSemester`.
  Node `GET /results/check` passes them through; import now uses chunked
  `bulk_write` (31k records in ~2s; document shape unchanged for consumers).
- Fixture `docs/research/real-pdfs/bteb-2026-eng-7th-2022-regulation-result.pdf`
  added with sanity tests (cap at 120 pages for CI speed). Gold verification:
  every parsed roll is followed by a bracket in the source text (0 unbacked)
  and every bracket-backed roll is parsed (0 missed) - 31,094 records:
  15,346 pass / 12,509 referred / 3,233 dropped / 6 expelled, 0 duplicates,
  0 out-of-range GPAs. Full E2E (parse -> import -> roll lookup -> 404) green.
  Python: 18 pass + 1 skip (needs Mongo); Node: 127/127.

## [0.10.1] — Fix: .env file was never loaded

- `loadEnv()` now calls `dotenv.config()` on `backend/.env` (the dependency
  existed but was never wired in — `npm run dev` locally failed unless every
  var was exported by hand). Real environment variables still take
  precedence, so CI/Render behavior is unchanged. Regression: full backend
  suite 127/127 re-run green after the change.

## [0.10.2] — Fix: admin panel login failed with 404 in local dev

- Vite dev server now proxies `/api/*` to `http://localhost:5000`, so the
  panel works against a locally running backend without configuring
  `VITE_API_URL` (which previously sent requests to itself → 404).
  Production deployments are unaffected because `VITE_API_URL` is set there.

## [0.10.3] — Fix: Flutter web registration blocked by CORS in local dev

- Non-production builds now accept any `localhost`/`127.0.0.1` origin (any
  port) — `flutter run -d chrome` uses a random port that the configured
  CORS list could never include. Production behavior unchanged: strict
  origin list only (+ explicit empty-list allow-all preserved for
  bootstrapping). Verified: localhost origin allowed, foreign origin
  blocked, full backend suite 127/127 green.

## [0.10.4] — Fix: registration/login hid the real error behind a generic message

- The Flutter app collapsed every failure to `registerFailed`/`errorGeneric`,
  so a still-running CORS problem, an already-registered email (409), a
  BD-format phone mismatch, or the backend simply not running all looked
  identical. Auth screens now surface the real server message, zod detail
  lines, and a dedicated network hint (`errorNetwork`, en+bn). New shared
  helper `apiErrorText()`. Verified: `flutter analyze` clean, 18/18 tests.
