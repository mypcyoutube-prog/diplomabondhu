# DIPLOMABONDHU — সম্পূর্ণ প্রজেক্ট অডিট রিপোর্ট (Phase 1)

**তারিখ:** 2026-11-26 · **Commit:** `a33ba4a` (main, version 0.11.11) · **পদ্ধতি:** প্রতিটি দাবি কোড ও বাস্তব কমান্ড-আউটপুট দিয়ে যাচাই করা হয়েছে। কোনো কোড পরিবর্তন করা হয়নি — এটি শুধু অডিট।

---

## ১. পদ্ধতি ও পরিসর

- সম্পূর্ণ রিপো স্ট্রাকচার ও প্রতিটি কম্পোনেন্টের কোড পর্যালোচনা (backend, mobile_app, admin-panel, result-service, docs)।
- Backend: `npm run typecheck` + `npm test` বাস্তবে চালানো হয়েছে (in-memory MongoDB)।
- Admin Panel: `npm test` + `npm run build` চালানো হয়েছে।
- Result-service: `python3 -m pytest` চালানো হয়েছে।
- Flutter অ্যাপ: এই sandbox-এ Flutter SDK নেই (README/KNOWN_ISSUES KI-10-এর সঙ্গে সামঞ্জস্যপূর্ণ) — তাই Flutter টেস্ট ও analyzer **চালানো যায়নি**; শুধু কোড-স্তরের পর্যালোচনা করা হয়েছে।
- E2E স্ক্রিপ্টগুলো (`backend/scripts/e2e-*.mjs`) এই অডিট রানে চালানো হয়নি — এগুলোর জন্য আলাদা লাইভ MongoDB + চলমান সার্ভার দরকার; স্ক্রিপ্টের অস্তিত্ব ও কভারেজ কোড-স্তরে যাচাই করা হয়েছে।

## ২. প্রজেক্ট স্ট্রাকচার (যাচাইকৃত)

```
diplomabondhu/
├── backend/          Node.js + Express + TypeScript (102 ফাইল, node_modules ছাড়া)
│   ├── src/modules/  ১৩টি মডিউল: academic, admin, auth, bteb-subjects, community,
│   │                 exams, gpa, materials, notifications, planner, results, settings, users
│   ├── src/models/   24টি Mongoose মডেল
│   ├── src/middlewares/  auth (JWT), rbac, validate (zod), error-handler
│   ├── src/tests/    13টি টেস্ট ফাইল
│   └── scripts/      4টি E2E স্ক্রিপ্ট + standalone mongo
├── mobile_app/       Flutter (feature-first: auth, community, exams, gpa, home, library,
│                     notifications, planner, profile, results, settings, subjects + shared/widgets)
├── admin-panel/      React + TS + Vite + Tailwind (12 পেজ, 2 টেস্ট ফাইল)
├── result-service/   Python FastAPI (app.py, parser.py; 5 টেস্ট ফাইল)
└── docs/             12টি ডিজাইন/আর্কিটেকচার ডকুমেন্ট + research/
```

**আর্কিটেকচার যাচাই:** Centralized API মডেল মেনে চলা হয়েছে — Flutter ও Admin দুটোই শুধু REST API ব্যবহার করে; কোথাও সরাসরি MongoDB অ্যাক্সেস নেই (`admin-panel/src/api/client.ts`, `mobile_app/lib/core/api/`)। GPA/CGPA হিসাব সম্পূর্ণ সার্ভার-সাইড (`backend/src/modules/gpa/gpa.engine.ts`)।

## ৩. Existing Feature Inventory (কোড-ভিত্তিক, অনুমান নয়)

| এরিয়া | বর্তমান অবস্থা | প্রমাণ |
|---|---|---|
| Auth (register/login/refresh/logout/forgot-reset/change-password/sessions) | সম্পূর্ণ | `backend/src/modules/auth/auth.routes.ts` (১০ এন্ডপয়েন্ট) |
| Refresh token rotation + reuse ডিটেকশন | আছে | `backend/src/modules/auth/auth.service.ts:84-101` — reuse হলে ওই user-এর সব session revoke + audit log |
| ব্যবহারকারী প্রোফাইল, FCM token, deletion-request | আছে | `backend/src/modules/users/users.routes.ts` (৭ এন্ডপয়েন্ট) |
| Academic hierarchy (Program→Regulation→Session→Technology→Semester→Subject→Chapter) | আছে | `backend/src/models/academic.models.ts`, `academic.routes.ts` (public list + admin CRUD) |
| Study Library (books/notes/materials/videos/past-questions এক মডেলে), bookmark, view tracking, report, download proxy | আছে | `backend/src/modules/materials/materials.routes.ts` (৮ এন্ডপয়েন্ট) |
| Exam Center (attempt start/answer/submit/result/history/stats) | আছে | `backend/src/modules/exams/exam.routes.ts` (৮ এন্ডপয়েন্ট); server-side `deadlineAt` (`exam.service.ts:90,103`), duplicate submit-safe (`:122` `alreadySubmitted`) |
| GPA/CGPA engine (BTEB profile-based, marks+grade input, target planner) | আছে, কিন্তু কোনো profile officially verified নয় | `backend/src/modules/gpa/gpa.engine.ts` (computeSemester/computeCgpa/computeTargetCgpa); KI-1, KI-9 |
| GPA ইতিহাস + ডিলিট | আছে | `gpa.routes.ts` (`/results` CRUD, `/target`) |
| Planner (routine/tasks/goals/calendar) | আছে | `backend/src/modules/planner/planner.routes.ts` (১১ এন্ডপয়েন্ট) |
| Community (posts/comments/likes/reports/guidelines) | আছে | `backend/src/modules/community/community.routes.ts` (১১ এন্ডপয়েন্ট) |
| Notifications (list/read/preferences) | আছে, Push (FCM) আসল integration বাকি (KI-3) | `notifications.routes.ts`, `backend/src/core/fcm.ts` |
| BTEB result checker (PDF parse→import→check/timeline) | ছাত্র-সাইড চালু; **Coming-Soon scope rule ভেঙে হলেও owner-নির্ধারিত internal feature** — 1103-পৃষ্ঠা রিয়েল PDF 100% recall/precision-এ gold-verified (CHANGELOG 0.10.5, KI-14) | `backend/src/modules/results/results.routes.ts` (১৪ এন্ডপয়েন্ট), `result-service/` |
| Admin Panel (Dashboard, Students, Academic, Materials, Exams, Results, GPA Profiles, Community, Announcements, Settings, Audit Logs) | আছে, route-level permission guard | `admin-panel/src/App.tsx:33-48`, `admin-panel/src/pages/` (১২ পেজ) |
| App Settings / feature flags | আছে জেনেরিক আকারে | `backend/src/models/app-settings.model.ts` (`featureFlags: Mixed`), `settings.routes.ts` |
| Flutter app (onboarding→auth→home→library→exams→gpa→planner→community→notifications→profile, bn/en l10n, light/dark) | আছে; ডিভাইস-টেস্ট হয়নি | `mobile_app/lib/app/router/router.dart` (৩০+ রুট), `lib/app/l10n/`, KI-10 |

## ৪. API Inventory (গণনাকৃত)

`router.(get|post|patch|put|delete)` গণনা: **auth 10, users 7, academic 2+loop-admin-CRUD, bteb-subjects 4, settings 1, gpa 9, materials 8, exams 8, planner 11, community 11, notifications 5, results 14, admin 8** — মোট ≈ 98+ এন্ডপয়েন্ট, সব `/api/v1`-এর অধীনে। প্রতিটি মডিউলে zod validation middleware (`middlewares/validate.ts`) ব্যবহৃত।

## ৫. Database Schema Review

- **24 মডেল**, সম্পর্কগুলো ObjectId ref-ভিত্তিক; academic hierarchy-তে compound unique index আছে (যেমন `academic.models.ts:40,70,85,102,124,140`)।
- ভালো দিক: `refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })` (TTL cleanup), `auditLogSchema` এ `actorId+at`, `targetType+targetId` index, `bookmarkSchema` unique `{userId, materialId}`।
- Soft-delete pattern (`deletedAt`) সব জায়গায় consistent; `buildFilter` এ সব query-তে `deletedAt` ফিল্টার (`academic.service.ts:22`)।
- GAP-DB1: `deletedAt` দিয়ে soft-delete করলে unique index (`regulationId+code`) পুরোনো deleted doc-এর সাথে দ্বন্দ্ব করবে — partial index (`partialFilterExpression: { deletedAt: null }`) নেই। এখনকার ডেটাতে সমস্যা না হলেও future delete+recreate flow-এ বাধা হবে।
- GAP-DB2: প্রোডাকশন index build/sync নিশ্চিত করার কোনো startup step নেই (বিস্তারিত BUG-B1)।

## ৬. Security Review

**যা ঠিক আছে (প্রমাণসহ):**
- bcrypt cost 12 (`auth.service.ts:32`); refresh token `crypto.randomBytes(48)` + SHA-256 হ্যাশ সংরক্ষণ; rotation + reuse detection (`auth.service.ts:84-101`); TTL index।
- JWT access token এ `ObjectId` validation (`middlewares/auth.ts:47`); RBAC permission model + `requirePermission`/`requireAdmin` (`middlewares/rbac.ts`, `core/permissions.ts`)।
- helmet, CORS production-এ strict allowlist (`app.ts:27-41`), global rate limit 300/5min (`app.ts:44-56`), auth-নির্দিষ্ট rate limit (`auth.routes.ts:11`), result-check rate limit (`results.routes.ts:40`)।
- Audit logging: register, login, login_failed, refresh_reuse, admin অ্যাকশন (`writeAudit`)।
- Secrets: `.env` commit করা নেই, `.env.example` টেমপ্লেট আছে; কোড-স্ক্যানে hardcoded secret পাওয়া যায়নি; result-service shared token bearer auth (`result_service/app.py:52-56`)।
- Error handler এ duplicate-key → 409 ম্যাপিং আছে (`middlewares/error-handler.ts:22-25`)।

**যা সমস্যা (findings অংশে):** SEC-1 (unauth admin proxy রুট), BUG-B1 (duplicate guard), GAP সেট (§৯)।

## ৭. UI/UX Review (সংক্ষেপ — বিস্তারিত Blueprint ডকুমেন্টে)

- একটি `theme.dart` আছে (central design tokens), `shared/widgets/states.dart` + `async_value_view.dart` — অর্থাৎ loading/error/empty state-এর ভিত্তি আছে।
- l10n আছে (`lib/app/l10n/` + generated), Light/Dark সাপোর্ট আছে — কিন্তু ডিভাইসে চালিয়ে দেখার সুযোগ এখনো হয়নি (KI-10, KI-8)।
- অ্যাডমিন প্যানেলে Sidebar+Topbar layout (`components/Layout.tsx`), প্রতিটি রুটে permission guard (`App.tsx`)।
- GAP-UX: Home Dashboard-এর অ্যাডমিন-নিয়ন্ত্রিত section reorder/enable-disable স্কিমা এখনো জেনেরিক `featureFlags: Mixed` — নির্দিষ্ট section config নেই (§৯, MIS-2)।
- GAP-UX: Global Search নেই — library/community/exams আলাদা আলাদা list সার্চ করে; কেন্দ্রীয় সার্চ API/স্ক্রিন নেই।

## ৮. যাচাইকৃত টেস্ট ফলাফল (এই অডিট রান)

| Component | কমান্ড | ফলাফল |
|---|---|---|
| Backend typecheck | `npm run typecheck` | ✅ clean |
| Backend tests | `npm test` | ⚠️ **149/150** — 1 FAIL (flaky, BUG-B1) |
| Admin Panel tests | `npm test` | ✅ 8/8 |
| Admin Panel build | `npm run build` | ✅ সফল (~300 KB JS, gzip 87 KB) |
| Result-service | `python3 -m pytest` | ✅ 48 passed, 1 skipped (pipeline টেস্টে লাইভ Mongo লাগে) |
| Flutter tests | `flutter test` | ❌ চালানো যায়নি (sandbox-এ Flutter SDK নেই — KI-10) |
| E2E স্ক্রিপ্ট | `node scripts/e2e-*.mjs` | এই রানে চালানো হয়নি (লাইভ সার্ভার দরকার) |

Backend FAIL বিস্তারিত: `src/tests/academic.test.ts:104` — "duplicate subject code in same regulation is rejected with 409" → আসলে 201। ৬ বার রানে ২ বার fail (flaky)। **তাই CHANGELOG-এর "150/150" দাবি এই মুহূর্তে সব পরিবেশে reproducible নয়।**

## ৯. শনাক্তকৃত সমস্যা (৩ স্তরে)

### Critical (নিরাপত্তা/ডেটা অখণ্ডতা)
- None confirmed. KI-15/KI-1 (unverified BTEB rules + unverified result PDF import) ইতিমধ্যে owner-জানা ও import-blocked — এগুলো Process-risk, নতুন কোড-bug নয়।

### Major
| ID | সমস্যা | Root cause | প্রমাণ | Risk | Proposed fix |
|---|---|---|---|---|---|
| SEC-1 | `GET /api/v1/results/admin/parse-job/:jobId` ও `/admin/import-progress/:batchId` — authentication ছাড়াই accessible | এই ২টি রুট `router.use('/admin', requireAuth, requirePermission)` লাইনের (results.routes.ts:89) **আগে** রেজিস্টার করা, তাই গার্ড প্রয়োগ হয় না | `results.routes.ts:61-87` বনাম `:89` | সার্ভিস configure থাকলে যে কেউ guessed id দিয়ে parse/import job-এর status তথ্য পড়তে পারবে; admin surface-এ unauth রুট | রুট-guard লাইনটি এই ২ রুটের উপরে সরানো (এক-লাইন reposition + টেস্ট) |
| BUG-B1 | Duplicate subject create মাঝে মাঝে 201 | mongoose unique index background-এ তৈরি হয়; test-env এ দ্রুত পরপর insert এ index না-থাকা অবস্থায় ঢুকে যায় | §৮ এ বর্ণিত flaky fail | নতুন/রিস্টোরড ডাটাবেসে আসল duplicate সাবজেক্ট ঢুকতে পারে; টেস্ট suite-এর বিশ্বাসযোগ্যতা কমে | startup-এ `await Model.syncIndexes()` (বা route-এ pre-check `findOne({regulationId, code})`) + প্রয়োজনে partial index |
| BUG-B2 | GAP-UX Home Dashboard admin-নিয়ন্ত্রণ: prompt-এর চাহিদা (enable/disable/reorder/section title) এখনো schema-তে নেই | `app-settings.model.ts` এ শুধু জেনেরিক `featureFlags: Mixed` | `app-settings.model.ts:6,24` | Product goal অসম্পূর্ণ | MIS-2 proposal (approval-সাপেক্ষ) |

### Minor
| ID | সমস্যা | প্রমাণ |
|---|---|---|
| MIN-1 | Backend history endpoint-এর নাম `/gpa/results` — UI-তে "GPA/CGPA History" দেখালেও API-পর্যায়ে "results" নাম; prompt-terminology অনুযায়ী বিভ্রান্তির সম্ভাবনা (change নয় — শুধু ডকুমেন্টে স্পষ্টীকরণ) | `gpa.routes.ts:65-89` |
| MIN-2 | KI-13: launcher icon প্রোগ্রামাটিক — brand asset এখনো নেই | KNOWN_ISSUES.md |
| MIN-3 | Admin bundle 300 KB (gzip 87.8 KB) — ভালো, তবে code-splitting (route-level lazy) পরে দরকার হতে পারে | build output |
| MIN-4 | Flutter SDK/ডিভাইস টেস্ট অনুপস্থিত — release-এর আগে বাধ্যতামূলক | KI-10 |

## ১০. Missing Systems Detection (§26 চেকলিস্ট — কোডে যাচাইকৃত)

| System | অবস্থা | প্রমাণ/মন্তব্য |
|---|---|---|
| Refresh token rotation, session mgmt | ✅ আছে | `auth.service.ts`, `/auth/sessions` CRUD |
| Login/API rate limiting | ✅ আছে | `app.ts`, `auth.routes.ts`, `results.routes.ts` |
| RBAC | ✅ আছে (student/moderator/admin + 10 permission) | `core/permissions.ts` |
| zod input validation | ✅ সব মডিউলে | `middlewares/validate.ts` |
| Audit log | ✅ আছে + admin view | `audit-log.model.ts`, `admin.routes.ts:106` |
| Email/SMTP | ❌ নেই (KI-12, out-of-band reset) | KNOWN_ISSUES.md |
| Background job queue (BullMQ ইত্যাদি) | ❌ নেই — result parse/import in-process | `results.routes.ts`, result-service |
| Monitoring/metrics (uptime, alerts) | ⚠️ শুধু `/health` | `app.ts:59` |
| API versioning | ⚠️ শুধু path-prefix `/api/v1` | `app.ts:79` |
| Global Search API | ❌ নেই | §৭ |
| Dashboard section admin-config | ❌ জেনেরিক flags | `app-settings.model.ts` |
| Offline/retry UX ফাউন্ডেশন | ⚠️ আংশিক (states.dart আছে; dio retry interceptor নেই) | `mobile_app/lib/shared/widgets/` |
| Backup/restore strategy | ⚠️ DEPLOYMENT_GUIDE.md এ উল্লেখ আছে কিন্তু automated restore-test নেই | docs/ |
| FCM push real integration | ❌ টোকেন API আছে, প্রজেক্ট নেই (KI-3) | KNOWN_ISSUES.md |

## ১১. Duplicate/Broken Navigation Detection

- রাউট/app bridge: Flutter রাউট ↔ Bottom-nav ৫ ট্যাব (home/library/exams/community/profile) সংগতভাবে আছে (`router.dart`); broken route পাওয়া যায়নি — তবে runtime নেভিগেশন ডিভাইসে যাচাই বাকি।
- Duplicate system পাওয়া যায়নি: "results" (checker) ও "gpa" আলাদা ডোমেন হিসেবে সঠিকভাবে আলাদা।

## ১২. উপসংহার

প্রজেক্টের ভিত্তি প্রবল ও scope-অনুগত। অনুমোদনের জন্য হাতে আছে: **SEC-1 (রুট-guard reposition)**, **BUG-B1 (index sync + retest)** — দুটোই ছোট, নিরাপদ ফিক্স। বাকি issues Blueprint/Improvement Plan-এ approval-সাপেক্ষ প্রস্তাব হিসেবে আছে।
