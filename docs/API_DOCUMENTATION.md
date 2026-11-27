# API_DOCUMENTATION.md — DiplomaBondhu

**Version:** 1.0 (Draft for Approval) · **Status:** PLANNING · Base URL: `/api/v1`

---

## 1. Conventions

- **Auth:** `Authorization: Bearer <accessToken>`; refresh via `/auth/refresh` cookie or body.
- **Response envelope (always):**
```json
{ "success": true,  "data": { ... }, "meta": { "page": 1, "limit": 20, "total": 132 } }
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [] } }
```
- **Error codes:** `VALIDATION_ERROR` 400 · `UNAUTHENTICATED` 401 · `FORBIDDEN` 403 ·
  `NOT_FOUND` 404 · `CONFLICT` 409 · `RATE_LIMITED` 429 · `INTERNAL` 500.
- **Validation:** Zod schemas; unknown fields stripped; NoSQL operators rejected.
- **Pagination:** `?page=1&limit=20` (max 100) or cursor where noted.
- **Localization:** clients send `Accept-Language: bn|en`; localized fields returned per
  language when available.
- Admin-only routes: prefix `/admin`, require `role=admin` + permission key.

## 2. Endpoint Specification

### 2.1 Auth (`/auth`)
| Method | Path | Auth | Body / Notes |
|---|---|---|---|
| POST | `/auth/register` | — | {name, email, password, phone?} → creates `student`; rate-limited |
| POST | `/auth/login` | — | {email, password} → {accessToken, user}, sets refresh cookie |
| POST | `/auth/refresh` | refresh token | rotates token, returns new access token |
| POST | `/auth/logout` | any | revokes presented refresh token |
| GET | `/auth/me` | ✅ | current user + profile |
| POST | `/auth/change-password` | ✅ | {currentPassword, newPassword} |
| GET | `/auth/sessions` | ✅ | active refresh sessions |
| DELETE | `/auth/sessions/:id` | ✅ | revoke a session |

*Deferred (D3):* `/auth/forgot-password`, `/auth/reset-password`, `/auth/verify-email`.

### 2.2 Users (`/users`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/users/me` | ✅ | full profile |
| PATCH | `/users/me` | ✅ | editable fields only (name, phone, picture, roll, registrationNo, prefs) |
| PATCH | `/users/me/academic-info` | ✅ | instituteId, programId, regulationId, sessionId, technologyId, currentSemesterId — validated against collections |
| PATCH | `/users/me/preferences` | ✅ | language, theme, notification prefs |
| POST | `/users/me/deletion-request` | ✅ | creates deletion request |
| GET | `/users/me/fcm-token` mgmt | ✅ | POST/DELETE `/users/me/fcm-tokens` |

### 2.3 Academic (`/academic`) — public read, admin write
| Method | Path | Notes |
|---|---|---|
| GET | `/academic/programs` | list active programs |
| GET | `/academic/programs/:id/regulations` | only `published` for students; all for admin |
| GET | `/academic/institutes` | search, district filter |
| GET | `/academic/technologies?programId=` | |
| GET | `/academic/semesters?programId=&regulationId=` | includes cgpaWeightPercent |
| GET | `/academic/subjects?programId=&regulationId=&technologyId=&semesterId=` | paginated, text search |
| GET | `/academic/subjects/:id` | with chapters |
| GET | `/academic/sessions?programId=&regulationId=` | |

Admin CRUD under `/admin/academic/*` for every entity above.

### 2.4 Materials (`/materials`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/materials` | optional | filters: type, programId, regulationId, technologyId, semesterId, subjectId, chapterId, examYear, q (text); sort; pagination |
| GET | `/materials/:id` | optional | increments viewCount; returns payload (fileUrl signed / externalUrl) |
| GET | `/materials/recent` | ✅ | recently viewed (from user activity) |
| POST | `/materials/:id/bookmark` / DELETE | ✅ | toggle |
| GET | `/materials/bookmarks` | ✅ | my bookmarks, paginated (implemented under `/materials` for module cohesion) |
| POST | `/materials/:id/report` | ✅ | {reason} |
| GET | `/materials/download/:id` | ✅ if allowed | signed URL, downloadAllowed respected |

Admin: `/admin/materials` CRUD + publish/unpublish. Direct file upload (`multipart`) is **deferred** until storage/hosting decision (KI-4); materials currently reference admin-provided external/file URLs.

### 2.5 Exams (`/exams`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/exams` | ✅ | filters: type, subjectId, chapterId, semesterId; only published |
| GET | `/exams/:id` | ✅ | rules + questions **without correctKey/explanation** |
| POST | `/exams/:id/attempts` | ✅ | creates attempt, returns serverDeadline + questions (order per attempt) |
| PATCH | `/exams/attempts/:attemptId/answer` | ✅ | save single answer (server validates attempt ownership + not expired) |
| POST | `/exams/attempts/:attemptId/submit` | ✅ | server scores → result (idempotent) |
| GET | `/exams/attempts/:attemptId/result` | ✅ | score + per-question + explanations |
| GET | `/users/me/exam-history` | ✅ | paginated |
| GET | `/users/me/exam-stats` | ✅ | aggregates |

**Server-side rules:** deadline enforced by server clock; late answers rejected;
scoring only on server; answer keys never serialized pre-submission; one active
attempt per exam per user.

### 2.6 GPA (`/gpa`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/gpa/profiles?programId=&regulationId=` | ✅ | only `published` profiles; marks unverified ones as unavailable |
| GET | `/gpa/profiles/:id/structure` | ✅ | subjects, assessment components, grade table (for input UI) |
| POST | `/gpa/calculate/semester` | ✅ | {profileId, inputMode: `marks\|grades`, subjects: [...]} → GPA + full breakdown (not persisted unless saved) |
| POST | `/gpa/calculate/cgpa` | ✅ | {profileId, semesterGpas: [{semesterId, gpa}]} → CGPA + weightage breakdown |
| POST | `/gpa/results` | ✅ | persist a calculation → history |
| GET | `/gpa/results` | ✅ | my history, paginated |
| GET | `/gpa/results/:id` | ✅ | owner-only; includes breakdown + profileVersion |
| DELETE | `/gpa/results/:id` | ✅ | owner-only soft delete |
| POST | `/gpa/target` | ✅ | {targetCgpa, completed: [...], remainingSemesters} → labelled estimate |

Admin: `/admin/gpa/*` — schemes, profiles, workflow transitions, test runs.

### 2.7 Planner (`/planner`)
| Method | Path | Notes |
|---|---|---|
| GET/PUT | `/planner/routine` | class + personal routine (weekly slots) |
| GET/POST/PATCH/DELETE | `/planner/tasks` | filters by date/status; reminderAt |
| GET/POST/PATCH/DELETE | `/planner/goals` | study goals + progress |
| GET | `/planner/calendar?month=` | unified view (tasks + reminders) |

### 2.8 Community (`/community`)
| Method | Path | Notes |
|---|---|---|
| GET | `/community/posts` | paginated feed; filters tag/type; hidden/removed excluded |
| POST | `/community/posts` | ✅ rate-limited; guideline acceptance enforced |
| GET | `/community/posts/:id` | with comments tree |
| PATCH/DELETE | `/community/posts/:id` | author-only (within window) |
| POST | `/community/posts/:id/like` / DELETE | |
| POST | `/community/posts/:id/comments` | ✅; also replies via `parentId` |
| POST | `/community/reports` | ✅ {targetType, targetId, reason} |
| GET | `/community/guidelines` | from settings |

Moderation: `/admin/community/*`.

### 2.9 Notifications (`/notifications`)
| Method | Path | Notes |
|---|---|---|
| GET | `/notifications` | my inbox, paginated, unread count in meta |
| POST | `/notifications/:id/read` | |
| POST | `/notifications/read-all` | |
| GET/PUT | `/notifications/preferences` | per-category |
| GET | `/notifications/announcements/published` | published notices for the home ticker + All Notices page, `?source=admin\|bteb` filter |
| GET | `/notifications/announcements/published/:id` | notice detail (title, body, source, pdfUrl, publishedAt) |

Admin: `/admin/announcements` CRUD + targeting + scheduling + publish (notices carry `source: admin\|bteb` and an optional `pdfUrl`).

### 2.10 Settings (`/settings`) — public read
| Method | Path | Notes |
|---|---|---|
| GET | `/settings/app` | branding, homepage sections, `resultDisplay` (enabled/examId/startsAt/endsAt window), `homeNotice` (text/link/visible/window), feature flags, maintenanceMode, supportInfo, legal pages, versionInfo |
| GET | `/settings/features` | feature visibility incl. `result_checker: coming_soon` |

Admin: `/admin/settings` PUT (full audit-logged).

### 2.11 Admin (`/admin`) — role=admin
| Method | Path | Notes |
|---|---|---|
| GET | `/admin/dashboard` | aggregated stats (no sensitive PII) |
| GET | `/admin/students` | search/filters/status |
| GET | `/admin/students/:id` | details + audit summary |
| POST | `/admin/students/:id/suspend` / `/reactivate` | {reason} audit-logged |
| CRUD | `/admin/academic/*` | all hierarchy entities |
| CRUD | `/admin/materials`, `/admin/exams`, `/admin/questions` | + publish/unpublish |
| POST | `/admin/uploads` | multipart PDF/image; validated (type, size, magic bytes) |
| CRUD | `/admin/gpa/schemes`, `/admin/gpa/profiles` | workflow transitions: POST `/admin/gpa/profiles/:id/transition` {to, note}; POST `/admin/gpa/profiles/:id/test-run` |
| GET | `/admin/community/reports` + action endpoints | moderation |
| CRUD | `/admin/announcements` | targeting + schedule |
| GET | `/admin/audit-logs` | filterable |
| PUT | `/admin/settings` | app settings |
| POST | `/admin/admins` | Main Admin only, future moderators |

### 2.12 Results (`/results`) — BTEB Result Checker (P12)
Student-facing endpoints read a separate `results_db` Mongo database that is
populated exclusively by the internal Python result-service (see
`result-service/README.md`). Never expose that database to clients.

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/results/meta` | any logged-in user | published result sets: examId, title, recordCount, checkCount, updatedAt |
| GET | `/results/check?examId=&roll=` | any logged-in user | 30 checks / 5 min / user; roll must be 6-10 digits; 404 when not found; response always carries the non-official disclaimer; each subject gets `name` joined server-side from the BTEB subject catalog (null when unknown) |
| GET | `/results/history?roll=` | any logged-in user | latest records for the roll (max 50, newest first); `subjects` enriched with `name` the same way |
| GET | `/results/timeline?roll=` | any logged-in user | (0.11.10) full academic journey for the roll, computed server-side: `semesters[]` each with its **own** `publishedAt` (from the exam whose `examSemester` matches), latest non-null cumulative `gpa`, and backlog `subjects` carrying server-computed `cleared: true` (semester GPA known in a later sheet AND code absent from the latest record) — cleared subjects render non-red in the app; `bannerSubjects` counts the latest record's pending subjects |
| GET | `/results/admin/batches` | CONTENT_MANAGE | proxies python `GET /batches` (parsed, not-yet-imported batches) |
| POST | `/results/admin/parse` | CONTENT_MANAGE | multipart PDF (≤50 MB) proxied raw to python `POST /parse`; returns batchId, recordCount, pagesScanned, warnings, first 5 sample records |
| POST | `/results/admin/import` | CONTENT_MANAGE | {batchId, examId, title?}; proxies python `POST /import/:batchId`; audit-logged as `results.import` |

Proxy routes return 503 `SERVICE_UNAVAILABLE` when `RESULT_SERVICE_URL` /
`RESULT_SERVICE_TOKEN` are not configured. The python service rejects every
request without the shared bearer token.

### 2.13 BTEB Subjects (`/bteb-subjects`) — subject catalog (0.11.7)
Read-only catalog harvested from the owner-designated source
(btebresultszone.com booklists, harvested 2026-11-18) and stored in the
`bteb_subjects` collection (see `DATABASE_DESIGN.md`). Seeded via
`npm run seed:subjects` from `backend/data/bteb-subjects-*.json`. This is
reference data only — it never overrides parsed result data.

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/bteb-subjects/technologies?regulation=` | public | technologies with regulation, semesterCount, subjectCount |
| GET | `/bteb-subjects/subjects?regulation=&technologySlug=&semester=&q=&page=&limit=` | public | paginated subject rows (code, name, groupLabel?, type, credits, marks); meta carries page/limit/total/totalPages |
| GET | `/bteb-subjects/names?codes=28553,25852` | any logged-in user | resolves up to 60 codes to names (first-wins per regulation) |
| POST | `/bteb-subjects/admin/import` | ACADEMIC_MANAGE | bulk catalog import (≤12 MB JSON), upsert on regulation+technology+semester+code, 500-row chunks, audit-logged as `bteb_subjects.imported` |

## 3. Authorization Matrix (summary)

| Resource | Student | Moderator (future) | Admin |
|---|---|---|---|
| Own profile/results/planner | CRUD (own) | — | — |
| Materials | read published, bookmark, report | read | full CRUD |
| Exams | take, view own results | read | full CRUD |
| GPA profiles | read published only | read | create/edit/transition |
| Community | post/comment/like/report | moderate | moderate + config |
| Users | self only | read | suspend/reactivate |
| Settings | read public | read | write |
| Audit logs | ❌ | ❌ | read |

## 4. Rate Limits (initial)

| Scope | Limit |
|---|---|
| `/auth/login`, `/auth/register` | 10 req / 15 min / IP |
| Community writes | 20 posts / day, 50 comments / day / user |
| GPA calculate | 60 req / min / user |
| Global API | 300 req / 5 min / IP |
