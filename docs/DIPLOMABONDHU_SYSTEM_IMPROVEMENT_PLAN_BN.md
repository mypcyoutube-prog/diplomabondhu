# DIPLOMABONDHU — System Improvement Plan (Phase 3)

শ্রেণিবিভাগ: **Critical / Major / Minor**। প্রতিটি আইটেমে: সমস্যা · Root cause · প্রভাবিত মডিউল · ঝুঁকি · প্রস্তাবিত সমাধান · Dependencies · টেস্ট প্রয়োজন। **কোনো কাজ অনুমোদনের আগে শুরু হবে না।**

---

## Critical (এখনই করা উচিত — ছোট ও নিরাপদ)

### C-1: Unauthenticated admin proxy রুট (SEC-1)
- **সমস্যা:** `GET /api/v1/results/admin/parse-job/:jobId` ও `GET /api/v1/results/admin/import-progress/:batchId` লগইন ছাড়াই accessible।
- **Root cause:** রুটগুলো `router.use('/admin', requireAuth, requirePermission(CONTENT_MANAGE))` (`results.routes.ts:89`) এর আগে ডিফাইন করা।
- **Affected:** `backend/src/modules/results/results.routes.ts:61-87`।
- **ঝুঁকি:** result-service configured থাকলে যে কেউ job/batch status তথ্য polling করতে পারবে (informations disclosure), এবং admin surface-এ unauth রুট থাকা।
- **সমাধান:** guard-applying `router.use('/admin', ...)` লাইনটি এই দুই রুটের উপরে সরানো (এক-লাইন reposition)।
- **Dependencies:** নেই। **টেস্ট:** results.test.ts-এ দুই রুটে 401 assertion যোগ; পুরো suite re-run; e2e-results-flow রান।

## Major

### M-1: Flaky duplicate-subject guard (BUG-B1)
- **সমস্যা:** একই regulation-এ একই subject code দ্বিতীয়বার create করলে ৪০% রানে (৩-এ ১) `201` ফেরে, `409` এর বদলে।
- **Root cause:**mongoose unique index background-এ তৈরি হয়; fresh DB-তে দ্রুত পরপর duplicate insert index তৈরির আগেই প্রবেশ করে।
- **Affected:** `backend/src/models/academic.models.ts:124` + `academic.service.ts:47 (createDoc)`।
- **ঝুঁকি:** নতুন ডেপ্লয়/রিস্টোরে আসল duplicate subject ঢুকে যেতে পারে → GPA/রেজাল্ট ম্যাপিং ভুল হতে পারে; টেস্ট suite-এর বিশ্বাসযোগ্যতা কমে (150/150 দাবি অস্থির)।
- **সমাধান:** (ক) সার্ভার স্টার্টআপে গুরুত্বপূর্ণ মডেলগুলোতে `await Model.syncIndexes()`; (খ) admin create route-এ explicit pre-check (`findOne({regulationId, code, deletedAt: null})` → 409) — index-based guard এর পাশে belt-and-suspenders।
- **Dependencies:** নেই। **টেস্ট:** academic.test.ts loop এ ≥৫ বার deterministic pass; full suite re-run।

### M-2: ~~Dashboard section অ্যাডমিন-কনফিগ~~ — প্রত্যাহৃত (false positive, 0.11.13)
- আসলে সম্পূর্ণ chain আগে থেকেই বিদ্যমান: `AppSettings.homepageSections` (key/visible/order) → `GET /settings/app` → `PUT /admin/settings` (SETTINGS_MANAGE + zod schema) → Admin UI "Homepage sections" editor → Flutter home consumption। প্রাথমিক অডিটের grep কেস-সংবেদনশীল ছিল বলে ভুলভাবে missing ধরা হয়েছিল। নতুন কিছু তৈরি করা হয়নি (duplicate system এড়ানো হলো)।

### M-3: Global Search API (proposal MIS-3)
- **সমস্যা:** Audit §৯-এ নিশ্চিত — কেন্দ্রীয় সার্চ নেই।
- **সমাধান:** `GET /search?q=&type=` — materials + bteb-subjects + community posts (সব published/visible filter-সহ) এ regex/text index সার্চ; recent searches ক্লায়েন্ট-সাইড stays।
- **Dependencies:** অনুমোদন; text index তৈরি (DB change — partial)। **টেস্ট:** নতুন search.test.ts + Flutter global search উইজেট টেস্ট।

### M-4: dio retry/timeout ইন্টারসেপ্টর (Student UX resilience)
- **সমস্যা:** transient network ফেইলে অ্যাপে retry mechanism নেই (শুধু state উইজেট আছে)।
- **সমাধান:** `core/api` ক্লায়েন্টে timeout + এক্সপোনেনশিয়াল retry (GET-এ) + error→state mapping।
- **টেস্ট:** api_client_test.dart এ fake Dio adapter টেস্ট।

## Minor

| ID | আইটেম | সমাধান | টেস্ট |
|---|---|---|---|
| N-1 | "results" API নাম বনাম UI "GPA/CGPA History" terminology | UI string-এ নিয়ম মানা; API rename **নয়** (ভাঙার ঝুঁকি), ডকুমেন্টেশনে স্পষ্টীকরণ | l10n স্ট্রিং রিভিউ |
| N-2 | Launcher icon brand asset (KI-13) | Owner-অনুমোদিত asset → regenerate | Icon smoke |
| N-3 | Admin bundle route-level code splitting | React.lazy per-page | build + smoke |
| N-4 | KI-12: forgot-password code out-of-band — email provider যোগ (owner-অনুমোদিত হলে) | Provider ইন্টিগ্রেশন + rate limit | password-reset suite |
| N-5 | `/health` সম্প্রসারণ: db ping + version | ছোট ফিক্স | health check |
| N-6 | Backup/restore runbook + restore test (docs) | DEPLOYMENT_GUIDE সংযোজন | হাতে-পরীক্ষা |

## স্পষ্টভাবে বাদ (scope control, §30)

- Project Hub, Career Zone — নিষিদ্ধ, করা হবে না।
- BTEB Official Result Checker — শুধু Coming Soon; প্রকৃত checker এখানকার বর্ণিত internal result-parser থেকে আলাদা, R2+ এ আলাদা অনুমোদনে হবে।
- Chat/DM, নতুন social ফিচার — অনুমোদন ছাড়া নয়।
- KI-1/KI-2/KI-9 (BTEB official documents) — owner action বাকি; এর আগে কোনো GPA profile publish হবে না।

## কার্যক্রম ক্রম (অনুমোদিত হলে)

1. C-1 + M-1 (এক ছোট PR, backend) → full suite + typecheck re-run।
2. M-2, M-3, M-4 — প্রতিটি আলাদা ছোট PR, অনুমোদন-ক্রমে।
3. N-1..N-6 — সম্ভাব্যতা ও প্রয়োজন অনুযায়ী।
প্রতিটি PR-এ: বর্ণিত টেস্ট + আগের সব টেস্ট সবুজ + CHANGELOG entry + প্যাসিং-অস্থিরতা রান ≥৩।
