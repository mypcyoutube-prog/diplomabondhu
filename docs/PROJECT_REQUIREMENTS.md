# PROJECT_REQUIREMENTS.md — DiplomaBondhu

**Version:** 1.0 (Draft for Approval) · **Status:** PLANNING · **Last updated:** Blueprint v1

---

## 1. Product Overview

**DiplomaBondhu** — *"Your Diploma Life, One Platform."*

A centralized educational platform for all diploma students in Bangladesh, covering the
full academic journey: study materials, exam preparation, regulation-accurate GPA/CGPA
calculation, personal planning, academic information, and a moderated student community.

- **Target country:** Bangladesh
- **Target audience:** All diploma students (BTEB and other verified diploma curricula)
- **Languages:** Bangla + English (full localization, both from first release)
- **Primary platform:** Android mobile app (Flutter)
- **Secondary platform:** Web-based Admin Panel (React)

### Confirmed owner decisions (recorded this session)

| # | Decision | Value |
|---|---|---|
| D1 | BTEB grading rules source | Research from web by AI, then verified together with owner; unverified regulations stay disabled |
| D2 | Push notifications | In first release (FCM). Owner must create the Firebase project. |
| D3 | Email verification & password recovery | Deferred to a later release. First release: email + password auth only. |

---

## 2. Confirmed Technology Stack (LOCKED)

- **Mobile:** Flutter, Dart, Riverpod, GoRouter, modular feature-based architecture,
  reusable UI components, responsive layout.
- **Backend:** Node.js, Express.js, TypeScript, REST API, modular layered architecture,
  secure authentication/authorization.
- **Database:** MongoDB with Mongoose ODM.
- **Admin Panel:** React, TypeScript, Tailwind CSS, Vite, TanStack Query.
- **Rule:** Both clients talk only to the Backend API. Never to MongoDB directly.
  All business logic, permission checks, GPA calculations, and validation are server-side.
- Stack changes require explicit owner approval. Python is not in the initial backend stack.

---

## 3. Functional Requirements

### FR-1 Splash, Onboarding & First-Time Setup
- App logo, splash animation, loading screen, welcome screen, feature introduction,
  language selection (Bangla/English), first-time setup.
- Onboarding does **not** repeat after completion (persisted flag).

### FR-2 Authentication & Account
- Registration, login, logout.
- Forgot password + password reset: **deferred** (D3) — design must accommodate later.
- Email verification: **deferred** (D3).
- Session management with access + refresh tokens; token refresh and revocation.
- Profile fields (only what is genuinely necessary): full name, profile picture, email,
  phone number, institute, education program, department/technology, regulation,
  academic session, current semester.

### FR-3 Home Dashboard
- Personalized: greeting, profile shortcut, global search, current semester,
  quick access to Study Materials / Exam Center / GPA Calculator / Planner / Community,
  recent materials, announcements, notifications.
- Homepage sections and their visibility are **controlled by the Admin Panel**.

### FR-4 Study Library (core)
- **Books Library:** categories, subject-based & semester-based books, PDF resources,
  external learning links.
- **Class Notes:** PDF/handwritten/chapter/important/topic-based notes.
- **Subject Materials:** organized by program → regulation → technology → semester →
  subject → chapter.
- **Video Lessons:** subject- and chapter-based, external video links.
- **Previous Questions:** by exam year, program, technology, semester, subject.
- Cross-cutting: search, filters, bookmark, recently viewed, download where permitted,
  report incorrect content. All content categorized and searchable.

### FR-5 Exam Center
- MCQ practice; chapter-based, subject-based, semester-based, and model tests;
  previous question practice; timed examinations with automatic submission;
  answer explanations; result summary; exam history; performance statistics.
- Exam rules (duration, negative marking, scheduling, publishing) configurable by admins.
- **Server-side validation is mandatory.** Client-submitted scores/answers are never trusted.
- Answer keys are never sent to the client before submission.

### FR-6 GPA / CGPA Calculator (core — see GPA_CALCULATION_SPECIFICATION.md)
- Two input methods: **marks-based** and **grade-based**; both validated server-side.
- Outputs: semester GPA, overall CGPA, subject-wise results (name, code, credit, grade,
  grade point, pass/fail), theory/practical breakdowns, full calculation breakdown,
  result history.
- Regulation-based architecture: one **independent calculation profile per regulation**;
  program-specific grading/assessment/CGPA rules; configurable CGPA strategies
  (semester weightage, credit-weighted, etc.).
- Special cases handled only where confirmed by official rules: failed/referred subjects,
  improvement exams, missing marks, incomplete results, practical/theory failure,
  retake, industrial training.
- Every calculation is explainable (inputs, applied rules, intermediate results, formula).
- Publishing workflow: **Draft → Verification → Testing → Approval → Publish**.
  Unverified profiles can never be active for students.
- Target GPA planner: clearly labelled **estimates**, never official results.

### FR-7 Student Routine & Planner
- Class routine, personal study routine, daily tasks, assignment/exam reminders,
  study goals, calendar, progress tracking. Fully student-managed.

### FR-8 Student Community
- Create post, Q&A, comments, replies, likes, sharing, post reporting,
  content moderation, spam control, community guidelines.
- No unnecessary personal information exposed; protection from harassment/spam/scams.

### FR-9 Notification Center
- New study materials, exam announcements, academic notices, community replies,
  admin announcements, system notifications.
- Per-user notification preferences. Push via **FCM** (D2).

### FR-10 Student Profile & Settings
- Personal + academic info, bookmarks, exam history, GPA history, learning progress.
- Language, theme (light/dark), privacy settings, account deletion request.

### FR-11 Admin Panel
- **Roles:** initially one Main Admin (full authority; never creatable via public
  registration); future moderators with explicitly assigned permissions (RBAC).
- **Dashboard:** total/new/active students, content & exam & community statistics,
  reported content, system health, recent admin activities.
- **Student management:** list, search/filters, details, suspend/reactivate,
  support actions, audit history.
- **Academic management:** programs, regulations, sessions, institutes, departments/
  technologies, semesters, subjects (codes, credits), chapters, academic structures.
- **Content management:** add/edit/publish/unpublish materials, PDF uploads,
  external resources, categories.
- **Exam management:** questions, options, correct answers, explanations, marks,
  negative marking, duration, scheduling, publishing, results.
- **GPA management:** full academic/grading scheme management + calculation rule
  publishing workflow with verification status.
- **Community moderation:** reports, post/comment review, spam, moderation history,
  moderator permissions.
- **Notification management:** announcements targeted to all / program / department /
  semester; scheduled and urgent notices.
- **App settings:** branding, languages, theme defaults, homepage sections, feature
  visibility, maintenance mode, support info, privacy policy, terms, version info,
  Coming Soon feature control.

### FR-12 Coming Soon — BTEB Official Result Checker (NOT in first release)
- Display a Coming Soon interface; admin controls visibility.
- Future implementation constraints: no CAPTCHA bypass, no scraping of restricted
  services, no false claims of official integration; only authorized APIs or a secure
  link to the official portal.

---

## 4. Explicitly Excluded (NEVER build without owner approval)

1. **Project Hub** — completely excluded (no project upload/marketplace).
2. **Career Zone** — completely excluded (no career portal, jobs, internships).

---

## 5. Non-Functional Requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-1 | Security | See SECURITY_GUIDE.md — hashing, JWT access/refresh, RBAC, validation, rate limiting, headers, CORS, NoSQL-injection protection, audit logging |
| NFR-2 | Performance | Pagination everywhere, indexed queries, caching where beneficial, lazy loading, efficient API payloads |
| NFR-3 | Scalability | Modular monolith first; no premature microservices or expensive infrastructure |
| NFR-4 | Reliability | Centralized error handling, network retry strategy, error recovery, health checks |
| NFR-5 | i18n | Full Bangla + English; correct Bangla font rendering |
| NFR-6 | UX | Light/dark mode, loading/empty/error/success/offline states, accessible contrast |
| NFR-7 | Privacy | Minimal PII; no private student data exposure; account deletion request flow |
| NFR-8 | Data | Timestamps, soft deletion where appropriate, retention policy for academic history |
| NFR-9 | Maintainability | Feature-based modules, no giant files, no duplicated business logic, documented decisions |

---

## 6. Acceptance Criteria (first release)

1. A student can register, log in, complete profile, and use the app in Bangla or English.
2. Study Library is browsable/searchable/filterable by the full academic hierarchy.
3. Exams run with server-validated timing, scoring, and results.
4. GPA calculator produces correct, explainable results for **at least the verified
   regulation profile(s)** and refuses unverified ones.
5. Admin panel can manage all content, academic data, exams, notifications, and settings.
6. All tests in TESTING_STRATEGY.md pass or are honestly reported in TEST_REPORT.md.
7. No secrets in the repository; no client-side trust for academic results.
