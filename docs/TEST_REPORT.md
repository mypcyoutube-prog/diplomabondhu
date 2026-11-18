# TEST_REPORT.md — DiplomaBondhu

## Report: Phase 7 — Planner, Community, Notifications

| Field | Value |
|---|---|
| Date | Post-blueprint implementation session |
| Scope | Planner (routine/tasks/goals/calendar), Community (posts/comments/likes/reports/moderation/guidelines gate), Notifications (inbox, preferences, announcement fan-out) |
| Environment | Node v22.23.4, Vitest, mongodb-memory-server |
| Commands executed | `npx tsc --noEmit` · `npx vitest run` · `npm run build` |

## Summary (cumulative)

| Suite | Passed | Failed | Skipped |
|---|---|---|---|
| auth / security / academic (Phase 3) | 35 | 0 | 0 |
| gpa-engine + gpa-api (Phase 4) | 30 | 0 | 0 |
| materials (Phase 5) | 11 | 0 | 0 |
| exams (Phase 6) | 14 | 0 | 0 |
| planner + community + notifications (Phase 7) | 17 | 0 | 0 |
| **Total** | **107** | **0** | **0** |

Typecheck: **clean** · Production build: **success**

## What is verified by these tests

- Routine: empty default, save/replace slots, HH:MM validation, per-user isolation
- Tasks: create, filter by date/status, complete, soft delete; IDOR blocked across students
- Goals: progress 0–100, auto-achieve at 100%, list, delete
- Calendar: month filter returns only that month's tasks; invalid month rejected
- Community: posting blocked until guidelines accepted (403 → accept → 201)
- Likes idempotent (no duplicate count); comments + replies with parentId; commentCount maintained
- Author-only edit; non-author edit 403
- Reports: post reporting works; students blocked from moderation (403); moderator hide removes from feed; restore works; moderation audit-logged
- Notifications: announcement publish fans out to all active students; unread count in meta; mark-read/mark-all; IDOR blocked; per-category preferences with defaults
- Scheduled announcements cannot publish early; double publish 409

## Known limitations (honest list)

- FCM push is a stub (`core/fcm.ts`): notifications are stored in the inbox only; real push pending owner's Firebase project (KI-3). No firebase-admin dependency added yet.
- Comment reports reuse the ContentReport collection with a `[comment]` reason prefix; a dedicated moderation UI distinction is planned for the admin panel.
- Community edit window fixed at 30 minutes.

---

## Report: Phase 6 — Exam Center

| Field | Value |
|---|---|
| Date | Post-blueprint implementation session |
| Scope | Question bank, exam management, attempt lifecycle (start/answer/submit), server-side scoring, results, history, stats |
| Environment | Node v22.23.4, Vitest, mongodb-memory-server |
| Commands executed | `npx tsc --noEmit` · `npx vitest run` · `npm run build` · `npm audit --omit=dev` |

## Summary (cumulative)

| Suite | Passed | Failed | Skipped |
|---|---|---|---|
| auth / security / academic (Phase 3) | 35 | 0 | 0 |
| gpa-engine + gpa-api (Phase 4) | 30 | 0 | 0 |
| materials (Phase 5) | 11 | 0 | 0 |
| exams (Phase 6) | 14 | 0 | 0 |
| **Total** | **90** | **0** | **0** |

Typecheck: **clean** · Production build: **success** · `npm audit --omit=dev`: **0 vulnerabilities**

## What is verified by these tests

- `correctKey` and `explanation` are NEVER serialized before submission (exam detail + attempt start verified by raw-string assertions)
- Server-side scoring: correct marks, negative marking (25% per wrong), unanswered = 0, total clamped at ≥ 0
- Submission is idempotent — repeated submit returns the identical stored score
- Deadline enforced by server clock: answers after `deadlineAt` rejected (409) even if client clock differs
- One active attempt per exam per user (DB partial unique index); re-entry resumes the same attempt
- IDOR blocked: other students cannot answer/submit/read another's attempt (404)
- Answers to questions outside the attempt rejected; result before submit rejected (409)
- Publishing gates: exam with no published questions cannot be published; exams referencing ghost questions rejected
- History + stats aggregates reflect submissions

## Defect found and fixed during Phase 6

- Mongoose subdocument spread (`{...p}`) silently dropped all fields when serializing per-question results. Fixed with explicit field mapping.

---

## Report: Phase 5 — Study Library

| Field | Value |
|---|---|
| Date | Post-blueprint implementation session |
| Scope | Materials (books/notes/videos/past questions/subject materials), bookmarks, recently viewed, content reports, admin publish lifecycle |
| Environment | Node v22.23.4, Vitest, mongodb-memory-server |
| Commands executed | `npx tsc --noEmit` · `npx vitest run` · `npm run build` |

## Summary (cumulative)

| Suite | Passed | Failed | Skipped |
|---|---|---|---|
| auth / security / academic (Phase 3) | 35 | 0 | 0 |
| gpa-engine + gpa-api (Phase 4) | 30 | 0 | 0 |
| materials (Phase 5) | 11 | 0 | 0 |
| **Total** | **76** | **0** | **0** |

Typecheck: **clean** · Production build: **success**

## What is verified by these tests

- Draft materials invisible to students (list + direct GET 404); publish makes them visible
- Unpublish and soft-delete both hide materials
- Students blocked from admin material routes (403)
- Strict body validation: unknown fields and URL-less materials rejected
- Filters by type and examYear; text search in English and Bangla (titleBn)
- viewCount increments per view; recently-viewed recorded for authed users only; anonymous views work
- Bookmarks: add, idempotent re-add, list, remove, re-remove 404; auth required
- Download endpoint respects `downloadAllowed` (403 when disabled)
- Reports: validation (min reason length), admin queue, resolve/dismiss, double-close 409

## Defect found and fixed during Phase 5

- Admin materials sub-router lacked `requireAuth` before `requirePermission` — every admin request would have failed with 403. Caught by the "blocks students" test pattern and fixed by adding auth to the sub-router chain.

---

## Report: Phase 4 — GPA Calculation Engine

| Field | Value |
|---|---|
| Date | Post-blueprint implementation session |
| Scope | GPA engine (pure functions), calculation profiles (Draft→Verification→Testing→Approval→Publish workflow), semester/CGPA/target endpoints, calculation history |
| Environment | Node v22.23.4, Vitest, mongodb-memory-server (isolated test DB) |
| Commands executed | `npx tsc --noEmit` (typecheck) · `npx vitest run` (tests) · `npm run build` (production build) · `npm audit --omit=dev` |

## Summary

| Suite | Passed | Failed | Skipped | Not run |
|---|---|---|---|---|
| auth.test.ts (registration, login, refresh rotation, sessions) | 12 | 0 | 0 | — |
| security.test.ts (RBAC, injection, validation, suspension, audit) | 11 | 0 | 0 | — |
| academic.test.ts (hierarchy CRUD, search, soft delete, settings, profile) | 12 | 0 | 0 | — |
| gpa-engine.test.ts (grade boundaries, credit math, minima, incomplete, CGPA weights, target) | 20 | 0 | 0 | — |
| gpa-api.test.ts (publishing workflow gates, RBAC, unpublished 404, history IDOR, target estimate) | 10 | 0 | 0 | — |
| **Total** | **65** | **0** | **0** | — |

Typecheck: **clean** · Production build: **success** · `npm audit --omit=dev`: **0 vulnerabilities**

## Defects found and fixed during Phase 4 testing (real bugs, caught by tests)

1. **CGPA formula bug (critical):** `computeCgpa` divided by 100 twice — all-4.00 GPAs produced CGPA 0.04 instead of 4.00. Fixed and covered by regression tests.
2. **CGPA precision bug:** intermediate contributions were rounded to 2 decimals before summing (partial CGPA 3.25 → 3.30). Now sums raw values, rounds only the final result.
3. **Grade lookup float artifact:** a computed 79.99000000000001% fell outside the 75–79.99 band and threw "No grade rule found". Percent is now rounded to 2 decimals before table lookup.
4. **Target CGPA formula bug:** `required = (target×100 − Σgpa·w) / remainingWeight` was only correct when remaining semesters completed the full 100% weight. Now uses `target × (completedWeight + remainingWeight)`; also notes when the target is already met.
5. **Integrity check too strict:** decimal grade-table boundaries (74.99 → 75) were reported as gaps, failing valid 2016-style profiles. Gap/overlap check now tolerance-aware.
6. **Missing admin endpoint:** profiles could not be edited after creation (no way to add `verification.sourceRefs`). Added `PUT /api/v1/gpa/admin/profiles/:id` (blocked for published/retired profiles, audit-logged).

## What is verified by these tests

- Grade boundaries: 80→A+, 79.99→A, 75→A, 74.99→A-, 40→D (pass), 39.99→F (fail)
- Credit-weighted semester GPA math; marks exceeding component max rejected; negative marks rejected
- Component minima: failing a component minimum fails the subject even with a passing total
- Missing marks: incomplete status with GPA withheld when profile allows provisional; hard error otherwise
- Grade-based input validated against the regulation's grading table; unknown grades rejected
- CGPA: 2016 weightage (5,5,5,10,15,20,25,15), partial-completion normalization, class bands, out-of-range rejection
- Target CGPA: correct required-average math, infeasibility detection, "ESTIMATE only" label always present
- Publishing workflow: Draft→Verification requires sourceRefs; publish requires passed test-run AND sourceRefs; illegal transitions 409; failed test-run blocks publish; students get 403 on all admin GPA routes
- Unpublished profiles return 404 on every student endpoint (structure, calculate)
- Calculation history: save/list/get/delete, owner-only (IDOR blocked across students)

## Known limitations / Not yet implemented (honest list)

- **All 2016/2022 grading data remains PROVISIONAL** (KI-1): sourced from third-party calculator sites, not official BTEB documents. Nothing is published as verified; profiles ship as drafts pending owner verification (D1).
- 2010 regulation marks→grade mapping not found (KI-2): profile cannot be created yet.
- `credit_weighted` CGPA strategy: model supports the enum; engine rejects it with a clear error until a verified profile needs it.
- Rate limiting disabled in test env only; not load-tested.
- Study Library, Exam Center, Planner, Community, Notifications modules: not run (later phases).
- Email verification / forgot password: deferred by owner decision D3.
- No real MongoDB server test yet; FCM pending owner's Firebase project (KI-3).

---

## Report: Phase 3 — Backend Foundation

| Field | Value |
|---|---|
| Date | Blueprint approval session |
| Scope | Backend foundation: auth, sessions, RBAC, academic hierarchy, settings, admin student management, audit logging |
| Environment | Node v22.23.4, Vitest, mongodb-memory-server (isolated test DB) |
| Commands executed | `npx tsc --noEmit` (typecheck) · `npx vitest run` (tests) · `npm run build` (production build) · `npm audit --omit=dev` |

## Summary

| Suite | Passed | Failed | Skipped | Not run |
|---|---|---|---|---|
| auth.test.ts (registration, login, refresh rotation, sessions) | 12 | 0 | 0 | — |
| security.test.ts (RBAC, injection, validation, suspension, audit) | 11 | 0 | 0 | — |
| academic.test.ts (hierarchy CRUD, search, soft delete, settings, profile) | 12 | 0 | 0 | — |
| **Total** | **35** | **0** | **0** | — |

Typecheck: **clean** · Production build: **success** · `npm audit --omit=dev`: **0 vulnerabilities**

## What is verified by these tests

- Registration creates students only; role escalation via request body is ignored/stripped
- Login: identical error for unknown email vs wrong password (no user enumeration)
- Refresh token rotation works; **reuse of a rotated token revokes all sessions of that user**
- Tampered JWTs rejected; unauthenticated access to protected routes returns 401
- Students/anonymous blocked from all `/admin/*` routes (403/401); admin dashboard accessible to admin
- NoSQL operator payloads (`$ne` etc.) stripped/rejected on login
- Strict schemas reject unknown fields (e.g., `role` in profile update)
- Suspended accounts cannot log in
- Admin suspend/reactivate student works and writes audit entries; suspend requires a reason
- Full academic hierarchy (program → regulation → technology → semester → subject → chapter) creatable by admin, readable by students; duplicate subject code per regulation → 409; text search works; soft-deleted entities excluded from lists
- Public settings endpoint serves defaults; admin can toggle maintenance mode
- Student profile academic-info + preferences update works with validation

## Known limitations / Not yet implemented (honest list)

- Rate limiting is **disabled in test env only** (`NODE_ENV=test`); active in dev/prod. Not load-tested.
- GPA engine, Study Library, Exam Center, Planner, Community, Notifications modules: **not run** (later phases).
- Email verification / forgot password: deferred by owner decision D3.
- No real MongoDB server test yet (tests use in-memory instance); deployment guide covers production DB.
- FCM integration: requires owner's Firebase project (KI-3).
- Moderator role exists in RBAC map but no moderator UI/API surface yet (future phase).

---

## Report: Phase 8 — Admin Panel + GPA Engine Hardening

| Field | Value |
|---|---|
| Scope | React admin panel (11 screens), permission-aware routing, live E2E against running server, credit_weighted CGPA implementation |
| Environment | Node v22.23.4, Vitest, mongodb-memory-server, live server on 127.0.0.1:4100 |
| Commands executed | backend: `npx tsc --noEmit`, `npx vitest run`, live E2E scripts · admin: `npx tsc -p tsconfig.json`, `npx vitest run`, `npm run build` |

## Summary

| Suite | Passed | Failed | Skipped | Not run |
|---|---|---|---|---|
| Backend unit/integration (10 files) | 112 | 0 | 0 | — |
| Admin panel component tests (2 files) | 8 | 0 | 0 | — |
| E2E admin smoke (`scripts/e2e-admin-smoke.mjs`) | 17 | 0 | 0 | — |
| E2E GPA flow (`scripts/e2e-gpa-flow.mjs`) | 18 | 0 | 0 | — |

## What the E2E runs verified (live server, real HTTP + cookies)

- Admin login → accessToken + httpOnly refresh cookie; refresh rotation works; after
  logout the refresh token is rejected
- Unauthenticated `/admin/dashboard` → 401; repeated logins → 429 RATE_LIMITED (limiter
  proven active outside test env)
- Full GPA workflow: create program → regulation → calculation profile draft →
  **test-run** → draft→published **blocked (409)** → verification → testing → approved →
  published (publish gate refuses profiles whose test suite failed or that lack source refs)
- Student: register → login → semester GPA via marks mode (3.31) and grade mode →
  credit_weighted CGPA (3.41, partial-completion note) → save result → history
- Announcements: targeted create → publish fan-out (409 when zero recipients match —
  correct), double-publish blocked
- Audit trail captured: gpa.profile.test_run, gpa.profile.verification,
  announcement.publish, academic.*.created, auth.login

## Bugs found and fixed during this phase

1. `credit_weighted` CGPA strategy accepted by profile schema but threw at calculation
   time (500) — implemented in the engine with per-semester credit weights.
2. `GpaValidationError` surfaced as 500 INTERNAL — now maps to 400 VALIDATION_ERROR.
3. Admin panel Announcements page used an invented schema (`audience`, `priority`) —
   corrected to the real backend contract (`targeting`, `category`, `scheduledAt`).

## Known limitations / Not run

- Flutter app (P9): not started — no widget/device tests exist yet.
- Admin panel tested via jsdom + mocked fetch and live E2E via API; no browser
  screenshot/visual QA yet.
- Rate limiting not load-tested; FCM still pending owner's Firebase project (KI-3).
- E2E scripts use throwaway test credentials seeded locally; never run against production.

## Report: Phase 9 — Flutter Student App

| Field | Value |
|---|---|
| Scope | Complete Flutter student app: auth, home, library, exams, GPA, planner, community, notifications, profile, settings; router with auth guards; l10n (en/bn); light/dark theme |
| Environment | Flutter 3.50.0 stable, Dart 3.14.0 (installed in sandbox at ~/flutter) |
| Commands executed | `flutter pub get` · `flutter gen-l10n` · `flutter analyze` · `flutter test` · backend `npx vitest run src/tests/auth.test.ts` |

## Summary

| Suite | Passed | Failed | Skipped | Not run |
|---|---|---|---|---|
| Flutter unit + widget tests (3 files) | 14 | 0 | 0 | — |
| `flutter analyze` | 0 issues | — | — | — |
| Backend auth regression (after refreshToken body change) | 16 | 0 | 0 | — |
| Android device / emulator run | — | — | — | **Not run (no Android SDK/Java/device in sandbox)** |
| Release APK/AAB build | — | — | — | **Not run (requires Android SDK)** |

## What the Flutter tests verify

- ApiClient: success/error envelope parsing, backend error-code propagation
  (VALIDATION_ERROR), refresh-on-401 single retry with token rotation persisted
  to storage, forced logout + session-expired callback when refresh fails
- Model parsing: Mongo `_id` fallback (`User`, `Material`, `Exam`, `Task`),
  optional-field tolerance, role checks, exam `questionCount` fallback
- Login form: empty-form validation messages, invalid-email rejection,
  valid input clears errors (widget tests with overridden providers)

## Bugs found and fixed during this phase

1. l10n key `of` (Bangla "এর") generated an instance getter that conflicted with
   the static `AppLocalizations.of` — renamed to `ofLabel`.
2. `ApiClient` exposed `refreshExecutor`/`onSessionExpired` as final — made
   mutable so `AuthController` can wire them post-construction.
3. `User.fromJson` read only `id`; Mongo lean docs send `_id` — added fallback.
4. `flutter_secure_storage` v11 removed `AndroidOptions(encryptedSharedPreferences:)`
   — removed (default behavior).
5. `AppPreferencesController._update` accepted `void Function(...)` but was
   called with async callbacks — corrected to `Future<void> Function(...)`.
6. Flutter 3.50 deprecates `package:flutter/material.dart` — migrated all 29
   files to `package:material_ui/material_ui.dart`; `MaterialApp` localization
   delegates switched to `GlobalMaterialLocalizations.delegates`.
7. Wrong relative import depths in 3 screens; ambiguous `Material` name in
   library screen (fixed with `hide`).

## Known limitations / Not run (honest list)

- The app has never launched on an Android device or emulator — owner must run
  `flutter run` on a device before any release claim (rule 14).
- External-link/download buttons in material detail are placeholders;
  `url_launcher` not yet added (dependency decision pending).
- FCM push not wired (KI-3, owner's Firebase project pending).
- GPA profiles remain unpublished until official BTEB documents arrive (KI-1/KI-9);
  app shows a locked empty state by design.

## Report: Phase 10 — Hardening (student-flow E2E + bug fixes)

| Field | Value |
|---|---|
| Scope | Live-server E2E of every API surface the Flutter app uses; fix all bugs it exposed; admin panel question publish UI; doc sync |
| Environment | Node/tsx server on port 4101 (NODE_ENV=test), standalone Mongo (mongo-standalone.mjs), throwaway seeded admin |
| Commands executed | `node scripts/e2e-student-flow.mjs` · `npx vitest run` · admin-panel `tsc` / `npm run test` / `npm run build` |

## Summary

| Suite | Passed | Failed | Skipped | Not run |
|---|---|---|---|---|
| Student-flow E2E (live server, 83 checks) | 83 | 0 | 0 | — |
| Backend full suite (vitest) | 112 | 0 | 0 | — |
| Admin panel tests | 8 | 0 | 0 | — |
| Admin panel typecheck + production build | clean | — | — | — |
| Android device / emulator run | — | — | — | **Not run (KI-10, unchanged)** |

## Bugs found and fixed during this phase

1. **Backend — question publishing was impossible:** no admin route existed to
   publish a question, so exam publish always failed with 409. Added
   `POST /exams/admin/questions/:id/publish` and `/unpublish` (mirrors exam
   status transitions, writes audit entries). Verified live: both questions
   published, then exam publish succeeded.
2. **Flutter — community posting would always 403:** the app never accepted
   community guidelines. `createPost` now calls `POST /community/guidelines/accept`
   first. Verified live (201).
3. **Flutter — target GPA estimator always showed 0:** response key mismatch
   (`requiredAverageGpa` vs `requiredGpa`). Fixed with fallback read; verified
   live (`requiredAverageGpa: 3.77, feasible: true`).
4. **Backend — post detail missing author name:** list populated `authorId`
   (name only) but detail did not; detail screen showed a generic author.
   Fixed; E2E PII check confirms only `{_id, name}` is exposed.

## Known limitations / Not run (honest list)

- The Flutter app itself is unchanged since its P9 verification (analyze clean,
  14/14 tests) except the two client fixes above, which were re-analyzed and
  re-tested at 14/14. No device run has ever happened (KI-10).
- The 83-check E2E validates the API contract, not the app UI on a device.

## Report: Phase 11 — Remaining spec gaps closed

| Field | Value |
|---|---|
| Scope | Password reset flow (backend + admin + Flutter), home global search, community share, url_launcher wiring, app icon; full regression |
| Environment | Same as Phase 10 (test Mongo + live server on 4101, Flutter 3.50 sandbox) |
| Commands executed | `npx vitest run` · `node scripts/e2e-student-flow.mjs` · admin `npm run test` / `npm run build` · `flutter analyze` / `flutter test` |

## Summary

| Suite | Passed | Failed | Skipped | Not run |
|---|---|---|---|---|
| Backend full suite (incl. 6 new password-reset tests) | 118 | 0 | 0 | — |
| Student-flow E2E (incl. 8 new reset checks) | 91 | 0 | 0 | — |
| Admin panel tests + build | 8 + build OK | 0 | 0 | — |
| Flutter analyze + tests | 0 issues, 14 | 0 | 0 | — |
| Android device run / icon on device | — | — | — | **Not run (KI-10)** |

## What the new tests verify

- Forgot-password returns 202 for known AND unknown emails (no user
  enumeration); only one active token per user per 10 minutes
- Admin-only reset-code issuance (student/anonymous get 403/401); previous
  pending codes are voided when a new one is issued
- Reset code is single-use, expires, invalid codes get 400, weak new
  passwords get 400
- After reset: all sessions revoked, old password rejected, new password
  logs in
- E2E (live server): the same flow end-to-end plus the P9/P10 surfaces

## Bugs found and fixed during this phase

1. Test-only: two new password-reset tests forgot to register the student
   first (expected token absent) — fixed in the test, not the product.

## Known limitations / Not run (honest list)

- No Android device/emulator run ever happened (KI-10); launcher icon and
  share sheet are verified by rendering/analysis only.
- Reset-code delivery is out-of-band by admin (phone/in-person) until email
  infrastructure is approved (KI-12). The API and UI flows are complete.

## Report: v0.11.7 — BTEB subject catalog + referred subject names

| Field | Value |
|---|---|
| Date | 2026-11-18 |
| Scope | Subject-catalog seed data (2022+2016), `/bteb-subjects` module, results name enrichment, Flutter catalog screens, named referred chips |
| Environment | Node v22 sandbox, Vitest + mongodb-memory-server; Flutter test |
| Commands executed | `cd backend && npx tsc --noEmit && npm test` · `cd mobile_app && flutter analyze && flutter test` |

| Suite | Passed | Failed | Skipped |
|---|---|---|---|
| Backend vitest (13 files) | 145 (6 new) | 0 | 0 |
| Flutter widget tests | 29 (6 new) | 0 | 0 |
| result-service pytest | — | — | Not run (result-service untouched in 0.11.7) |
| Android device run | — | — | Not run (KI-10) |

| Check | Result |
|---|---|
| Catalog listing (regulation filter, subject counts) | Pass |
| Subjects list: technologySlug/semester/search/pagination filters | Pass |
| `/names`: auth required, resolves codes, 60-code cap, >1000 chars 400 | Pass |
| Admin import: 401 anonymous, 403 student, 400 invalid body, upsert idempotent | Pass |
| Results `/check` + `/history` subject `name` enrichment (e.g. 28553) | Pass |
| Empty catalog → `name: null` graceful fallback | Pass |
| Flutter: named referred chip (`28553(T)` + name below) | Pass |
| Flutter: catalog list/filter/error; semester grouping, credits, marks pills | Pass |
| Seed data spot-check vs owner's reference screenshots (28553, 25852 names, credits, marks) | Pass |
| Catalog browser visual QA on device | Not run (KI-10) |

## Report: v0.11.6 — Result Checker premium redesign

| Check | Passed | Failed | Skipped | Notes |
| --- | --- | --- | --- | --- |
| flutter analyze | 0 issues | 0 | 0 | — |
| flutter test (widget) | 23 | 0 | 0 | all prior assertions intact; entrance animations settle under pumpAndSettle |
| visual QA on a real device/emulator | — | — | **Not run** | KI-10 (no Android SDK in sandbox); owner should hot-restart and review both light + dark mode |

## Report: v0.11.5 — Google Drive folder ingest

| Check | Passed | Failed | Skipped | Notes |
| --- | --- | --- | --- | --- |
| result-service pytest (folder-link extraction, drive job E2E w/ mocked Drive transport, listing-failure path) | 48 | 0 | 1 (pipeline needs Mongo) | 9 new drive tests; real-drive calls mocked — no live key yet |
| Backend `tsc --noEmit` + vitest (drive-key lifecycle + parse-drive proxy) | 139 | 0 | 0 | key never returned raw (`select: false` + masked responses) |
| Admin tsc + vite build (Drive key card in Settings, Drive folder input in Results) | OK | 0 | 0 | — |
| Real Drive folder smoke test with a real API key | — | — | **Pending** | owner creates the free key; then one real folder run must be recorded here |
| Key-leak audit | yes | 0 | 0 | public settings endpoint + admin settings PUT replies verified to never contain the key |

## Report: v0.11.4 — Link-based + multi-file result upload

| Check | Passed | Failed | Skipped | Notes |
| --- | --- | --- | --- | --- |
| result-service pytest (URL guard + URL job pipeline) | 39 | 0 | 1 (pipeline needs Mongo) | 12 new: 8 SSRF refusals (loopback/private/link-local/ftp/file), public host accepted, job E2E w/ faked download, download-error surfacing |
| Backend `tsc --noEmit` + vitest (parse-url proxy) | 136 | 0 | 0 | 3 new: url job start, body validation (no url / ftp), polling with download log |
| Admin tsc + vite build (multi-file + link + review queue) | OK | 0 | 0 | each batch imported individually; nothing auto-imports |
| Google Drive folder ingest | — | — | Not run | deferred until owner creates the free Drive API key |

## Report: v0.11.3 — Transparent warnings + terminal-style live parse log

| Check | Passed | Failed | Skipped | Notes |
| --- | --- | --- | --- | --- |
| result-service pytest (warning format + live on_warning) | 27 | 0 | 1 (pipeline needs Mongo) | 5 new incl. synthetic gpa-map PDF exercising the malformed-buffer path |
| Real 1103-page PDF: live log + warning detail | yes | 0 | 0 | mid-parse polls showed pages streaming; the single warning read `page 507: discarded malformed record buffer … "746213 Note: 1. The result is hereby published…"` (board footer note) |
| `/parse/job/:id` exposes `log` (last 40 lines) | yes | 0 | 0 | TestClient smoke run on the real PDF |
| Admin tsc + vite build (ParseTerminal + warnings explainer) | OK | 0 | 0 | — |
| Backend vitest | — | — | Not run | results routes untouched in 0.11.3 |

## Report: v0.11.2 — CGPA display + letter grades on result cards

| Check | Passed | Failed | Skipped | Notes |
| --- | --- | --- | --- | --- |
| result-service pytest (cgpa extraction + batch export) | 22 | 0 | 1 (pipeline needs Mongo) | 4 new: cgpa printed / absent / not confused with gpa tokens / exported |
| Backend `tsc --noEmit` + vitest | 133 | 0 | 0 | cgpa passthrough in check + history (no schema change) |
| Flutter analyze + test (letter grade + CGPA row) | 23 | 0 | 0 | 2 new: `A-`/`A` beside GPA tiles; CGPA row `3.45` for a board-printed cgpa |
| Grade-scale provenance documented | yes | — | — | owner-provided btebresultszone.com screenshots (2026-11-18); official verification still open (KI-1) |
| 2016-regulation 8th-sem sheet import | — | — | **Not run** | blocked: awaiting the actual PDF from the owner for gold verification (KI-14) |

Notes:
- v0.11.0 note "display-only letter grades intentionally NOT shown" is now
  superseded: the owner supplied the scale reference, so letter grades are
  displayed with the derivation rule in `GPA_CALCULATION_SPECIFICATION.md`
  §3.1.1. Still display-only; the numeric GPA stays the board-printed value.
- CGPA is shown only when the board sheet prints `cgpa:`; the app never
  recomputes it.

## Report: v0.11.0 — Result experience upgrade (live progress + roll-only history + full result cards)

| Check | Passed | Failed | Skipped | Notes |
| --- | --- | --- | --- | --- |
| result-service pytest (parse progress callback + job endpoints) | 18 | 0 | 1 (pipeline needs Mongo) | on_page callback in both parser paths; /parse/job + /import/progress verified live below |
| Backend vitest (history endpoint, parse-job proxy, import-progress proxy) | 133 | 0 | 0 | incl. 6 new results tests |
| Flutter analyze + test (new result card screen) | 21 | 0 | 0 | 6 screen tests: backlog banner `28553(T)`, semester timeline, multi-exam header, not-found |
| Admin panel tsc + vite build (live progress bars) | OK | 0 | 0 | parse + import progress UI |
| Live real-PDF E2E: parse-job progress observed | yes | 0 | 0 | 1103-page owner PDF → pagesDone/pages polled → done ~3s, 31,094 records |
| Live real-PDF E2E: import progress polled | 31,094/31,094 | 0 | 0 | stage finished at end |
| Live history checks | 7/7 | 0 | 0 | 700014 pass+gpa1…7+title · 712990 `28553(T)` ref_sub (pass status, backlog banner) · 764170 expelled · 404 · 400 · 401 |
| Legacy E2E `e2e-results-flow.mjs` (still passing after changes) | 17 | 0 | 0 | — |

Notes:
- Board prints records like `712990 { … gpa5: ref, … ref_sub: 28553(T) }` where the current-exam GPA is a number — the parser keeps `status: pass` (verified against the board intro text in v0.10.5 gold data) while `subjects` lists the still-referred subject. The Flutter card shows the red "1 subject yet to pass" banner for such records, matching the owner's reference screenshots.
- Display-only letter grades (A-, B+ next to GPA) visible on third-party sites are intentionally NOT shown: the official GPA→grade mapping must be verified from official BTEB documents first (KI-1/KI-9). Raw GPA values come straight from the board sheet.

## Report: KI-14 — Real result-sheet verification (v0.10.5)

| Check | Passed | Failed | Skipped | Notes |
| --- | --- | --- | --- | --- |
| result-service pytest (no Mongo live) | 15 | 0 | 1 (pipeline needs Mongo) | 12 parsing/security incl. 8 new gpa-map tests + 2 notice regressions |
| result-service pytest + real 1103-page board PDF fixture | 18 | 0 | 1 | gpa-map sanity test on first 120 pages |
| Gold verification (independent script) | 100% recall + 100% precision | 0 | — | every parsed roll bracket-backed in source; every bracket-backed roll parsed; 31,094 records; 0 dupes; 0 out-of-range GPA |
| Node backend suite after `results.service.ts` passthrough change | 127 | 0 | 0 | vitest |
| Live E2E `e2e-results-flow.mjs` | 17 | 0 | 0 | parse→import→check→404→RBAC→audit |
| Real-PDF full roundtrip via live services | 31,094/31,094 | 0 | 0 | node proxy parse + chunked bulk import (~2s) + roll lookups incl. pass/referred/dropped/expelled/404 |

## Report: Phase 12 — BTEB Result Checker (Python result-service + Node API + admin + Flutter)

| Field | Value |
|---|---|
| Scope | P12 result checker: Python PDF parse/import service, Node `/results` module, admin Results page, Flutter Result Checker screen, E2E |
| Environment | Sandbox: standalone Mongo (37371), uvicorn on 8300, Node API on 4100, Flutter 3.x sandbox |
| Commands executed | `python3 -m pytest` (± live Mongo) · `npx tsc --noEmit` · `npx vitest run` (backend) · `node scripts/e2e-results-flow.mjs` · admin `tsc` / `npm run test` / `npm run build` · `flutter gen-l10n` / `flutter analyze` / `flutter test` |

## Summary

| Suite | Passed | Failed | Skipped | Not run |
|---|---|---|---|---|
| Python result-service pytest (no Mongo) | 6 | 0 | 1 (pipeline needs Mongo) | — |
| Python result-service pytest (with Mongo) | 7 | 0 | 0 | — |
| Backend full vitest suite (incl. 9 new results tests) | 127 | 0 | 0 | — |
| E2E results flow (live python + node + mongo) | 17 | 0 | 0 | — |
| Admin panel tests + typecheck + build | 8 + build OK | 0 | 0 | — |
| Flutter analyze + tests (incl. 4 new checker tests) | 0 issues, 18 | 0 | 0 | — |
| Real BTEB PDF parsing accuracy | — | — | — | **Not verified (KI-14)** |
| Android device run | — | — | — | Not run (KI-10) |

## What the new tests verify

- Python parser: table rows and text lines (roll, registration, name, GPA,
  pass/fail), non-student lines ignored, registration never confused with
  roll, batch shape; full parse→import→lookup pipeline against Mongo
- Node: parse proxy passthrough (incl. service token header), 503 when
  unconfigured, 400 for non-multipart, import proxy + audit entry, student
  blocked from admin routes (403), meta listing, check by roll with
  disclaimer, 404 unknown roll, 400 malformed roll, 401 unauthenticated
- E2E (live): the entire admin→python→mongo→student chain plus fail-status
  rows, audit log written, and RBAC
- Flutter: empty-exams state, invalid roll message, successful check renders
  name/GPA/status/disclaimer, not-found state

## Bugs found and fixed during this phase

1. Python `/parse` read the multipart stream twice (`file.read()` then
   `request.json()`) → "Stream consumed" 500; now takes `examId`/`title` as
   Form fields
2. Python `/import/{batch_id}` lost its `Request` annotation during a
   signature cleanup → 422; replaced with a `Body` parameter
3. Parser name extraction kept only the first token; now joins consecutive
   name tokens and skips status/grade tokens
4. E2E script itself: missing default JSON content-type (test bug, not product)

## Known limitations / Not run (honest list)

- Parser accuracy on real BTEB PDFs is unverified — tuned on synthetic
  BTEB-style PDFs only; the admin workflow forces a preview before import
  and the disclaimer covers residual risk (KI-14)
- Result data lives in a separate `results_db`; results are not linked to
  user accounts (roll-based lookup only, by design)
- No Android device run (KI-10); push notifications for new result sets not
  wired (would need KI-3 Firebase)

### Addendum to Phase 12 — real board PDF verification attempt + Render blueprint

| Field | Value |
|---|---|
| Scope | Parser verification against real BTEB board PDFs; Render deployment config |
| Commands executed | `python3 -m pytest` (result-service) |

- Downloaded 2 real PDFs from the official board site (bteb.gov.bd → Oracle
  object storage). Both are board **notices**, not result sheets — kept as
  regression fixtures: the parser must yield **zero** student records from
  them.
- **Real bug found and fixed**: Python `\d` matches Bangla numerals (০-৯);
  garbled subset-font Bangla text produced fake rolls (`০২৫৫০০৫২৫`). All
  roll/GPA/registration regexes now match ASCII digits only.
- Real institute-wise result-sheet PDFs (btebresultszone.com) are
  bot-protected (HTTP 403 for file downloads); bypassing was NOT attempted
  per spec. Owner does the one-time spot-check via the admin preview (KI-14).
- `render.yaml` blueprint added (api + result-svc + admin static) — config
  change, no runtime test possible in sandbox (no Render account).

| Suite | Passed | Failed | Skipped |
|---|---|---|---|
| result-service pytest (no Mongo) | 9 (incl. 2 new real-PDF tests) | 0 | 1 (pipeline needs Mongo) |
