# DEVELOPMENT_ROADMAP.md — DiplomaBondhu

**Version:** 1.0 (Draft for Approval) · **Status:** PLANNING

> Phases start only after blueprint approval. Each phase ends with tests executed and
> TEST_REPORT.md updated. Duration estimates assume focused AI development sessions;
> calendar time depends on owner review speed.

---

| Phase | Scope | Key deliverables | Exit criteria |
|---|---|---|---|
| P3 — Backend Foundation | Repo scaffold, config, logger, error handler, auth (register/login/refresh/RBAC), academic hierarchy models + CRUD, app settings, audit log, seeds (Main Admin CLI) | Auth integration tests green; RBAC matrix tests green | API boots; security checklist §1–3 pass |
| P4 — GPA Engine | Profile schema, pure engine (semester + CGPA), marking input validation, breakdown output, publishing workflow endpoints, engine test suites, 2016 & 2022 profiles (pending owner verification) | Engine suites 100% pass on draft profiles; workflow enforced | No unpublished profile computable |
| P5 — Study Library | Materials module, upload validation, bookmarks, reports, recent, admin content CRUD, search/filters | Integration tests; admin publish flow E2E (backend) | Library API complete |
| P6 — Exam Center | Exams, question bank, attempts with server deadlines, server scoring, results, stats | Anti-cheat tests (late submit, key leakage) pass | Exam flow E2E (backend) |
| P7 — Planner, Community, Notifications | Tasks/routine/goals; posts/comments/likes/reports/moderation; notifications + FCM dispatch + preferences | Module tests; moderation flow tests | All modules green |
| P8 — Admin Panel | React app: dashboard, students, academic, content, exams, GPA workflow UI, moderation, notifications, settings | Component + permission tests | Admin can run all §5 journeys |
| P9 — Flutter App | All screens per UI guide, i18n (bn/en), themes, states, FCM, offline handling | Widget/nav/state tests; device matrix pass | All student journeys E2E against staging API |
| P10 — Hardening & Release | Security review, performance pass, E2E suite, release builds, deployment docs, TEST_REPORT, final docs | All E2E scenarios pass; release checklist done | Owner sign-off for Play Store submission |
| P12 — BTEB Result Checker (owner-approved addition) | Python result-service (PDF parse → JSON batches → `results_db` import), Node `/results` API (student check + admin proxy), admin Results page, Flutter Result Checker screen, E2E | Parser pytest 7/7; backend results tests; live E2E 17/17 | Feature flag-gated; disclaimer mandatory; real-PDF accuracy spot-check per batch (KI-14) |

## Milestone reviews with owner
- After P4: GPA engine demo with real references (owner verifies rules).
- After P8: admin panel walkthrough.
- After P9: app build on owner's device.
- After P10: release approval.

## Post-R1 backlog (owner approval required to start)
- Email verification (D3)
- ~~BTEB Official Result Checker~~ → delivered in P12 (roll-based lookup over owner-imported PDF batches; authorized/official portal integration still pending owner decision)
- Moderator roles expansion, 2010 profile verification, additional programs
