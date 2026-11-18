# MASTER_BLUEPRINT.md — DiplomaBondhu

**Version:** 1.0 (Draft for Approval) · **Status:** PLANNING

---

## 1. Final Product Overview

DiplomaBondhu is a three-component platform sharing one backend and one database:

```
┌──────────────────┐        ┌─────────────────────────┐        ┌──────────────────┐
│  Student App     │  HTTPS │   Backend API (REST)    │        │  Admin Panel     │
│  Flutter/Android │◄──────►│  Node+Express+TypeScript│◄──────►│  React Web       │
│  Riverpod/GoRouter│  JWT  │  Modular Layered        │  JWT   │  Vite+Tailwind   │
└──────────────────┘        └───────────┬─────────────┘        └──────────────────┘
                                        │ Mongoose
                                 ┌──────▼──────┐
                                 │   MongoDB   │
                                 └─────────────┘
```

- One API (`/api/v1/...`), one MongoDB database, two JWT-authenticated clients.
- All GPA/CGPA math, exam scoring, and permission checks live in the backend.
- Android-first student experience; responsive web admin experience.

## 2. Complete Feature Matrix

| # | Feature | Student App | Admin Panel | Release |
|---|---|---|---|---|
| 1 | Splash / Onboarding / Language setup | ✅ | — | R1 |
| 2 | Auth (register/login/logout, sessions) | ✅ | ✅ (admin login) | R1 |
| 3 | Forgot password / email verification | Deferred (D3) | Deferred | R2 |
| 4 | Home dashboard (admin-controlled sections) | ✅ | section config | R1 |
| 5 | Global search | ✅ | — | R1 |
| 6 | Study Library (books/notes/materials/videos/past questions) | ✅ | ✅ full CRUD | R1 |
| 7 | Bookmarks / recently viewed / content reports | ✅ | ✅ review | R1 |
| 8 | Exam Center (MCQ, timed tests, results, history) | ✅ | ✅ full CRUD | R1 |
| 9 | GPA/CGPA calculator (marks & grade input) | ✅ | scheme management | R1 (verified profiles only) |
| 10 | Result history & calculation breakdown | ✅ | — | R1 |
| 11 | Target GPA planner (labelled estimate) | ✅ | — | R1 |
| 12 | Routine & planner (tasks, reminders, goals) | ✅ | — | R1 |
| 13 | Student community (posts, comments, likes, reports) | ✅ | ✅ moderation | R1 |
| 14 | Notification center + FCM push | ✅ | ✅ targeting/scheduling | R1 |
| 15 | Profile & settings (language, theme, privacy) | ✅ | — | R1 |
| 16 | Account deletion request | ✅ | ✅ processing | R1 |
| 17 | Student management (suspend/reactivate/audit) | — | ✅ | R1 |
| 18 | Academic management (programs→chapters) | — | ✅ | R1 |
| 19 | GPA rule publishing workflow | — | ✅ | R1 |
| 20 | App settings (branding, maintenance mode, feature flags) | — | ✅ | R1 |
| 21 | BTEB Official Result Checker | Coming Soon UI | visibility control | R2+ |
| 22 | Project Hub / Career Zone | ❌ EXCLUDED | ❌ EXCLUDED | never (without approval) |

## 3. Student App Screen List (Flutter)

| # | Screen | Route (GoRouter) |
|---|---|---|
| 1 | Splash | `/splash` |
| 2 | Onboarding (3 pages + language selection) | `/onboarding` |
| 3 | Login | `/login` |
| 4 | Registration (multi-step) | `/register` |
| 5 | Home Dashboard | `/home` |
| 6 | Global Search | `/search` |
| 7 | Study Library (tabs: Books / Notes / Materials / Videos / Past Questions) | `/library` |
| 8 | Material Detail (PDF viewer / external link) | `/library/item/:id` |
| 9 | Exam Center (hub) | `/exams` |
| 10 | Exam Detail (rules, start) | `/exams/:id` |
| 11 | Exam Runner (timed, question pager) | `/exams/:id/run` |
| 12 | Exam Result Summary | `/exams/results/:attemptId` |
| 13 | Exam History & Statistics | `/exams/history` |
| 14 | GPA Calculator — Semester (marks/grade input) | `/gpa/semester` |
| 15 | GPA Calculator — CGPA (all semesters) | `/gpa/cgpa` |
| 16 | Calculation Breakdown (explainable result) | `/gpa/breakdown/:resultId` |
| 17 | Result History | `/gpa/history` |
| 18 | Target GPA Planner | `/gpa/target` |
| 19 | Planner (tasks, reminders, goals) | `/planner` |
| 20 | Routine (class + personal) | `/planner/routine` |
| 21 | Calendar | `/planner/calendar` |
| 22 | Community Feed | `/community` |
| 23 | Post Detail (comments, replies) | `/community/post/:id` |
| 24 | Create Post | `/community/new` |
| 25 | Notifications | `/notifications` |
| 26 | Notification Preferences | `/settings/notifications` |
| 27 | Profile | `/profile` |
| 28 | Edit Profile | `/profile/edit` |
| 29 | Settings (language, theme, privacy) | `/settings` |
| 30 | Account Deletion Request | `/settings/delete` |
| 31 | BTEB Result Checker (P12; admin feature-flag gated, non-official disclaimer) | `/results/checker` |
| 32 | Error / Offline / Maintenance states | shared overlays |

## 4. Admin Panel Screen List (React)

| # | Screen |
|---|---|
| 1 | Admin Login |
| 2 | Dashboard (stats, health, recent activities) |
| 3 | Students (list, filters) |
| 4 | Student Detail (status, suspend/reactivate, audit) |
| 5 | Academic: Programs / Regulations / Sessions / Institutes / Technologies / Semesters / Subjects / Chapters (management suites) |
| 6 | Content: Materials list + editor (books, notes, videos, past questions) |
| 7 | Content: Categories & publish/unpublish |
| 8 | Exams: list + editor |
| 9 | Exams: Question bank + question editor (options, key, explanation) |
| 10 | Exams: Results browser |
| 11 | GPA: Programs/Regulations/Schemes management |
| 12 | GPA: Calculation profile editor (assessment, grading, pass, CGPA rules) |
| 13 | GPA: Publishing workflow (Draft→Verification→Testing→Approval→Publish) |
| 14 | GPA: Verification/Test status & official reference registry |
| 15 | Community: Reports queue |
| 16 | Community: Post/comment review + moderation history |
| 17 | Notifications: composer (targeting, schedule) |
| 18 | App Settings (branding, homepage sections, feature flags, maintenance mode, legal pages) |
| 19 | Coming Soon feature control |
| 20 | Admin Users & Moderators (future) + Audit log viewer |

## 5. Complete User Journeys

### 5.1 New Student
```
Install → Splash → Onboarding (language: বাংলা/English) → Register
→ Profile setup (institute, program, technology, regulation, session, semester)
→ Home Dashboard (personalized) → browse Library → bookmark a PDF
→ take a chapter MCQ test → see server-validated result
→ enter semester marks in GPA Calculator → see explainable GPA + breakdown
→ save to history → enable notifications
```

### 5.2 Returning Student (daily)
```
Open app → Home (greeting, announcements, recent materials)
→ Planner: check today's tasks/routine → Community: ask a question
→ receive push notification when someone replies → open & answer marked
```

### 5.3 Exam Flow
```
Exam Center → pick subject test → read rules → start timed exam
→ answer questions (server keeps key hidden) → auto-submit on timeout
→ server scores → result summary with explanations → stats update
```

### 5.4 GPA Flow
```
GPA Calculator → choose regulation (only verified ones enabled)
→ input method: marks (per assessment component) OR grades
→ server validates against profile → returns GPA + full breakdown
→ save result → history → CGPA tab (semester weightage applied)
→ optional: Target GPA planner (labelled "estimate")
```

### 5.5 Admin — Publish Content
```
Login → Content → New Material → select hierarchy (program→...→chapter)
→ upload PDF / add external link → save draft → preview → publish
→ students see it; notification optionally sent
```

### 5.6 Admin — GPA Rule Lifecycle
```
Login → GPA → create/edit calculation profile (Draft)
→ enter official rules + document reference → mark "Verification submitted"
→ run engine test suite against profile → all tests pass
→ Approval (Main Admin) → Publish → profile becomes selectable by students
→ any edit re-enters workflow as new version (old results keep version ref)
```

### 5.7 Moderation
```
Student reports post → Admin report queue → review → action
(remove / warn / dismiss) → action logged in moderation history → reporter informed
```

## 6. Development Phases (summary — details in DEVELOPMENT_ROADMAP.md)

| Phase | Deliverable |
|---|---|
| P0–P2 | Discovery, planning, design (this blueprint) |
| P3 | Backend foundation: auth, RBAC, academic hierarchy, settings |
| P4 | GPA engine (profiles, tests, publishing workflow) |
| P5 | Study Library + content management |
| P6 | Exam Center (server-side scoring) |
| P7 | Planner, Community, Notifications (FCM) |
| P8 | Admin panel completion |
| P9 | Flutter app integration + polish (i18n, themes, states) |
| P10 | Testing, security review, release builds, deployment docs |

## 7. Technical Risks & Solutions

| # | Risk | Impact | Solution |
|---|---|---|---|
| R1 | BTEB rules from web are third-party, not official documents | Wrong GPA results | Profiles stay disabled until owner verifies; official document reference + verification status stored; research doc lists all sources |
| R2 | 2010 regulation mapping unverified | Cannot serve 2010 students | Ship with only verified profiles enabled; UI shows "coming soon" for others |
| R3 | Regulation variety across programs (Textile, Agriculture, Medical Tech…) | Wrong rules per program | Per-program × per-regulation profile model; no shared assumptions |
| R4 | PDF hosting cost/limits | Library unusable | Compare Cloudinary/S3/Backblaze B2 at deployment phase; owner approval before choosing |
| R5 | FCM requires owner's Firebase account | Push blocked | Owner creates project; app degrades gracefully to in-app notifications |
| R6 | Exam cheating (client manipulation) | Invalid results | All timing/scoring server-side; keys never sent pre-submission; rate limiting |
| R7 | Community abuse | Harm to students | Reporting, moderation queue, rate limits, guidelines, minimal PII |
| R8 | Single developer bandwidth (AI) | Delays | Phased roadmap, modular monolith, shared UI components |
| R9 | Bangla text rendering/performance in Flutter | UX issues | Bangla-optimized fonts (e.g., Noto Sans Bengali/Hind Siliguri), widget tests with Bangla strings |
| R10 | MongoDB injection / auth bypass | Security breach | Centralized validation, sanitization, RBAC middleware, security tests |
