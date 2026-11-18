# CHANGELOG.md — DiplomaBondhu

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

## [0.10.1] — Fix: .env file was never loaded

- `loadEnv()` now calls `dotenv.config()` on `backend/.env` (the dependency
  existed but was never wired in — `npm run dev` locally failed unless every
  var was exported by hand). Real environment variables still take
  precedence, so CI/Render behavior is unchanged. Regression: full backend
  suite 127/127 re-run green after the change.
