# TESTING_STRATEGY.md — DiplomaBondhu

**Version:** 1.0 (Draft for Approval) · **Status:** PLANNING

> Rule: no feature is reported complete until its tests have actually been executed and
> results recorded in TEST_REPORT.md (passed / failed / skipped / not run / known issues).

---

## 1. Backend (Node/Express/TS)

| Layer | Tool (planned) | Scope |
|---|---|---|
| Unit | Vitest/Jest | Services, GPA engine (pure), validation schemas, utils |
| Integration | Supertest + in-memory MongoDB (mongodb-memory-server) | Full API routes with real middleware chain |
| Auth tests | Integration | register/login/refresh rotation/logout/session revocation |
| Permission tests | Integration | RBAC matrix from API doc §3, IDOR attempts |
| Validation tests | Integration | Malformed bodies, NoSQL payloads, oversize uploads |
| GPA engine tests | Unit (golden files) | Suites from GPA spec §7 — per profile version |
| Security tests | Integration + checklist | SECURITY_GUIDE §10 |

CI gate: engine test suite must pass 100% before any profile can be marked testable.

## 2. Flutter App

| Type | Tool | Scope |
|---|---|---|
| Unit | `flutter_test` | Providers, models, form validators |
| Widget | `flutter_test` | Key screens (login, dashboard, GPA input, exam runner), all UI states (loading/empty/error/offline), Bangla string rendering |
| Navigation | `flutter_test` | GoRouter guards: onboarding-once, auth redirects, deep links |
| State | Riverpod testing | AsyncNotifier flows: exam submission, GPA save |
| Network error | Mocked dio | Timeouts, 401 refresh flow, retry, offline banner |
| Device | Manual matrix | Low-end Android (2 GB RAM), small + large screens, dark mode, Bangla locale |

## 3. Admin Panel (React)

| Type | Tool | Scope |
|---|---|---|
| Component | Vitest + Testing Library | Tables, forms, workflow banners |
| Form validation | Testing Library | Academic/exam/GPA editors |
| Permission | Vitest | Route guards + hidden actions per role |
| API integration | MSW mocks | Query hooks, error handling, invalidation |

## 4. End-to-End Scenarios (must all pass before release)

1. Register → login → profile setup → home personalized
2. Search → open material → bookmark → appears in bookmarks & recent
3. Exam: start → answer → auto-submit → server-validated result → history/stats
4. GPA: marks input → explainable result → save → history → CGPA with weightage
5. GPA: grade input mode equivalence on same data
6. Admin: create subject in hierarchy → publish → visible in app
7. Admin: GPA profile Draft → Verification → Testing (suite run) → Approval → Publish → selectable in app
8. Admin: suspend student → student session revoked → cannot login
9. Community: post → reply → notification → report → moderation action → audit entry
10. Notification: admin targeted announcement → student receives push + inbox item

## 5. Test Reporting

- `TEST_REPORT.md` maintained per phase with: date, commit, suite results
  (passed/failed/skipped/not run), environment, known limitations.
- CI runs backend + admin + flutter tests on every push; failures block merge.

## 6. Non-Functional Checks

- API p95 latency targets on list endpoints (<300 ms dev bench); pagination max sizes.
- Flutter: no jank on list scroll (dev profiling), cold start < 3 s on test device.
- Security checklist re-run before each release.
