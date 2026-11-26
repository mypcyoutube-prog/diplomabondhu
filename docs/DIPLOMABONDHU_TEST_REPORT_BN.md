# DIPLOMABONDHU — টেস্ট রিপোর্ট (স্বাধীনভাবে সম্পাদিত রান)

**তারিখ:** 2026-11-26 · **Commit:** `a33ba4a` · সব কমান্ড বাস্তবে চালানো হয়েছে; নিচের প্রতিটি সংখ্যা এই sandbox-এর আউটপুট থেকে নেওয়া (রিপোর্ট-ভিত্তিক দাবি নয়)।

---

## ১. Backend (Node.js + Express + TS)

```
cd backend
npm run typecheck   → ✅ zero error
npm test            → Test Files: 1 failed | 12 passed (13)
                      Tests:      1 failed | 149 passed (150)
                      Duration:   67.03s
```

**Fail বিস্তারিত:**
```
FAIL src/tests/academic.test.ts > academic hierarchy >
     duplicate subject code in same regulation is rejected with 409
AssertionError: expected 201 to be 409  (src/tests/academic.test.ts:104:27)
```
**Flakiness নিশ্চিতকরণ:** একই ফাইল ৩ বার পৃথক রানে → 2×.pass, 1×.fail (index-build race; বিস্তারিত Improvement Plan M-1)।

## ২. Admin Panel (React + TS + Vite)

```
cd admin-panel
npm test   → Test Files: 2 passed (2) · Tests: 8 passed (8) · 3.35s
npm run build → ✅ dist/index.html 0.40 kB; assets/index-*.css 19.24 kB;
                assets/index-*.js 300.28 kB (gzip 87.79 kB); built in 1.71s
```

## ৩. Result Service (Python + FastAPI)

```
cd result-service; pip install -r requirements.txt; python3 -m pytest
→ 48 passed, 1 skipped in 12.61s
```
Skip কারণ: `tests/test_pipeline.py` — লাইভ/reachable MongoDB ছাড়া চলে না (রিপো-ডক-এর সঙ্গে সামঞ্জস্যপূর্ণ)। Breakdown: test_parser_units 6✓, test_real_pdfs 3✓, test_warning_visibility 5✓, test_pipeline 1 skip, বাকিগুলো অন্য ফাইলে।

## ৪. Flutter Student App

- **এই পরিবেশে Flutter/Dart SDK নেই** (`which flutter dart` → পাওয়া যায়নি) — → `flutter test`, `flutter analyze`, ডিভাইস/এমুলেটর রান **সম্পাদিত হয়নি**। এটি KNOWN_ISSUES.md KI-10-এর সঙ্গে মিলে যায়।
- টেস্ট ফাইল অস্তিত্ব যাচাই করা হয়েছে: `mobile_app/test/` → api_client_test.dart, login_screen_test.dart, models_test.dart, result_checker_screen_test.dart, subject_catalog_screen_test.dart (KNOW "29/29" দাবি **এই রানে স্বাধীনভাবে যাচাই অসম্ভব** — unverified হিসেবেই থাকবে)।

## ৫. E2E স্ক্রিপ্ট

`backend/scripts/` এ ৪টি স্ক্রিপ্ট আছে: e2e-admin-smoke.mjs (17 checks), e2e-gpa-flow.mjs (18), e2e-results-flow.mjs (17), e2e-student-flow.mjs (91 checks)।
**এই রানে চালানো হয়নি** — প্রয়োজন: standalone MongoDB + চলমান API (+ result-service)। ফলাফল: N/A।

## ৬. সারসংক্ষেপ

| Component | Reported (রিপো-ডক) | এই রানে যাচাই | পার্থক্য |
|---|---|---|---|
| Backend | 150/150 (KNOWN_ISSUES 0.11.11) | **149/150 + flaky 1** | ⚠️ পার্থক্য আছে — M-1 |
| Admin | 8/8 | **8/8** ✅ | নেই |
| Result-service | 7 (পুরোনো README) / 48 (KNOWN_ISSUES) | **48 pass + 1 skip** ✅ | README পুরোনো (N: docs sync) |
| Flutter | 29/29 | যাচাই **অসম্ভব** (SDK নেই) | — |
| E2E | একাধিক suite | এই রানে N/A | — |

**সিদ্ধান্ত:** রিপোর্ট-ভিত্তিক "150/150" দাবিটি বর্তমান কমিটে reproducible নয়; flaky টেস্ট fix (M-1) হওয়া আবশ্যক, নয়তো CI-তে false-red হবে।
