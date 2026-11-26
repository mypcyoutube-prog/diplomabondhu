# DIPLOMABONDHU — চূড়ান্ত অবস্থা ও অনুমোদন-প্রত্র (Phase 4)

**তারিখ:** 2026-11-26 · Commit `a33ba4a`। এই ডকুমেন্টের একমাত্র উদ্দেশ্য: Owner-এর জন্য এক-পাতার অবস্থা + সিদ্ধান্ত-তালিকা। **অনুমোদন না পর্যন্ত কোনো কোড পরিবর্তন হবে না।**

---

## ১. এক-লাইনে অবস্থা

আর্কিটেকচার ও স্কোপ সঠিক এবং prompt-এর সব ground rule মেনে চলছে; বাস্তব টেস্টে **Backend 149/150 (1 flaky)**, **Admin 8/8**, **Result-service 48+1skip**, Flutter টেস্ট এই পরিবেশে চালানো অসম্ভব — এবং ২টি ছোট, নিরাপদ ফিক্স (C-1, M-1) অনুমোদনের অপেক্ষায়।

## ২. Verified Strengths (evidence)

- Centralized-API স্থাপত্য ৩ ক্লায়েন্টেই অক্ষত (কেউ MongoDB স্পর্শ করে না)।
- Security বেসলাইন প্রবল: bcrypt-12, refresh rotation+reuse-detect, RBAC, helmet/CORS/rate limits, audit logs, zod validation, secrets-external।
- Exam integrity: server-side deadline + idempotent submit (`exam.service.ts:103,122`)।
- GPA engine profile-ভিত্তিক, server-side — এবং কোনো unverified profile publish নীতি জায়গামোতো (KI-1/KI-9)।
- GPA/CGPA terminology: বর্তমান কোডে calculation আউটপুট GPA/CGPA ভাগেই আছে; পৃথক "Result" ক্যালকুলেশন-টাইপ **নেই** — নীতি বজায় থাকবে; UI-স্ট্রিং রিভিউ N-1।

## ৩. Owner-এর সিদ্ধান্ত নেওয়ার তালিকা

| # | সিদ্ধান্ত | রেফারেন্স | প্রস্তাব |
|---|---|---|---|
| D-1 | C-1 (auth-guard reposition) + M-1 (index sync/pre-check) ফিক্স অনুমোদন | Improvement Plan | ✅ অনুমোদন করুন — ছোট, ঝুঁকিমুক্ত |
| D-2 | M-2: Dashboard section admin-config schema অনুমোদন (DB field যোগ) | MIS-2 | করতে চাইলে অনুমোদন |
| D-3 | M-3: Global Search API অনুমোদন | MIS-3 | করতে চাইলে অনুমোদন |
| D-4 | M-4: Flutter retry/timeout interceptor | M-4 | করতে চাইলে অনুমোদন |
| D-5 | BTEB অফিসিয়াল ডকুমেন্ট (KI-1/KI-2) দেওয়া — GPA profiles publish-এর একমাত্র ব্লকার | KNOWN_ISSUES | Owner action |
| D-6 | Flutter ডিভাইস/এমুলেটর টেস্ট (KI-10) + Admin ব্রাউজার QA (KI-8) | KNOWN_ISSUES | Owner action |
| D-7 | Email provider (KI-12), Firebase প্রজেক্ট (KI-3), ড; স্টোরেজ (KI-7), ডোমেইন (KI-5) | KNOWN_ISSUES | Owner action, টাইমলাইন অনুযায়ী |

## ৪. Development Roadmap (অনুমোদনের পরের ধাপগুলো)

| Phase | Scope | টেস্ট গেট |
|---|---|---|
| R1 (সবার আগে) | C-1 + M-1 | typecheck + 150/150 stable (≥৩ রান) + নতুন 401 assertions |
| R2 | M-2 dashboard sections (backend+admin+app) | settings+home widget টেস্ট |
| R3 | M-3 global search | search tests + UI states |
| R4 | M-4 + N-1..N-6 ক্রমে | প্রতিটির নিজস্ব টেস্ট |
| R5 (release) | ডিভাইস টেস্ট, brand icon, deploy (KI-4 render.yaml ready) | E2E ৪টি স্ক্রিপ্ট সবুজ + KI তালিকা খালি |

## ৫. Prompt-এর নিয়ম-সম্মতি ঘোষণা

- Existing project নতুন করে তৈরি/rebuild করা হয়নি; কোনো ফাইল পরিবর্তন এই অডিটে হয়নি (রিপো clean)।
- Stack-এ কোনো যোগবিয়োগ প্রস্তাব করা হয়নি (M-3 text index, M-4 বিদ্যমান dio)।
- কোনো test ফেক করা হয়নি — ১টা fail-ও লুকানো হয়নি।
- Demo data, নতুন পেজ, নতুন feature — কিছুই implement হয়নি।
- অনুমোদন: উপরের D-1 (অথবা D-1..D-4 কোনটা যেটা) সিলেক্ট করে জানালেই সংশ্লিষ্ট ছোট PR হাতে-কলমে শুরু হবে।
