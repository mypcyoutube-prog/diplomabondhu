# GPA_CALCULATION_SPECIFICATION.md — DiplomaBondhu

**Version:** 1.0 (Draft for Approval) · **Status:** PLANNING

> **Honesty note:** This document distinguishes strictly between (a) rules verified
> against sources during research, and (b) rules that still require verification from
> official BTEB documents. Nothing unverified will ever be enabled for students.

---

## 1. Architecture Overview

The engine is **data-driven and versioned**. Rules are stored as *Calculation Profiles*
(documents), interpreted by a **pure function engine** in the backend:

```
inputs (marks or grades) + calculation_profile (version V)
        │
        ▼
gpaEngine.computeSemester()  →  SemesterResult {subjects[], gpa, breakdown}
gpaEngine.computeCgpa()      →  CgpaResult {cgpa, weightageBreakdown}
        │
        ▼
persisted to calculation_history with profileId + profileVersion
```

- Engine = pure functions, zero I/O → unit-testable in isolation.
- One profile per **regulation** (per program where rules differ). No universal formula.
- Profile schema (logical):
```ts
{
  regulationId, version, status: draft|verification|testing|approved|published,
  grading: { scale: 4.0, table: [{minPercent, maxPercent, grade, point}] },
  assessments: { [subjectType]: [{key, label, maxMarks, weightPercent}] },
  passRules: { minSubjectGrade, componentMinima, semesterMinGpa },
  cgpa: { strategy: "semester_weighted" | "credit_weighted",
          semesterWeights: [{semesterNumber, percent}],
          classBands: [{minCgpa, label}] },
  special: { improvement, referred, retake, industrialTraining, missingMarks, ... },
  verification: { sourceRefs: [{title, url, retrievedAt}], verifiedBy, verifiedAt },
  testSuiteRef, publishedAt
}
```

## 2. Input Methods

### A. Marks-Based
1. Client fetches profile structure → renders per-subject component inputs
   (e.g., Continuous Assessment / Final Exam / Practical with max marks).
2. Server validates every mark: numeric, `0 ≤ mark ≤ maxMarks`, all required
   components present (or explicitly "missing" per special rules).
3. Weighted total → percent → grading table → grade + point.

### B. Grade-Based
1. Student selects a letter grade per subject.
2. Server validates the grade exists in that profile's grading table.
3. Engine uses the grade's point directly.

Both modes produce identical output structure.

## 3. Verified Rules (research findings — see research/BTEB_GRADING_RESEARCH.md)

### 3.1 Grading table — Diploma in Engineering, 2016 & 2022 Probidhan
*(multi-source agreement; still requires owner confirmation against official document)*

| Marks (%) | Grade | Point |
|---|---|---|
| 80–100 | A+ | 4.00 |
| 75–79 | A | 3.75 |
| 70–74 | A− | 3.50 |
| 65–69 | B+ | 3.25 |
| 60–64 | B | 3.00 |
| 55–59 | B− | 2.75 |
| 50–54 | C+ | 2.50 |
| 45–49 | C | 2.25 |
| 40–44 | D | 2.00 |
| 0–39 | F | 0.00 |

Pass mark: **40% (grade D, point 2.00)**; F = fail. Minimum CGPA for certificate: 2.00.
First class: CGPA ≥ 3.00.

### 3.2 Semester weightage for final CGPA (semester_weighted strategy)

| Semester | 2010 | 2016 | 2022 |
|---|---|---|---|
| 1st | 5% | 5% | 5% |
| 2nd | 5% | 5% | 5% |
| 3rd | 5% | 5% | 10% |
| 4th | 15% | 10% | 10% |
| 5th | 15% | 15% | 20% |
| 6th | 20% | 20% | 20% |
| 7th | 25% | 25% | 20% |
| 8th | 10% | 15% | 10% |
| **Total** | **100%** | **100%** | **100%** |

`CGPA = Σ(semesterGPA × weight%)` over completed semesters (normalized for partial
completion, shown as "current CGPA").

**Verification status:** 2016 & 2022 weightages confirmed by ≥3 independent sources
(btebresultszone.com/cgpa-calculator re-checked 2026-11-17 — exact match for all three
regulations); 2010 weightage by 3 sources. 2010 marks→grade mapping **NOT verified** → 2010 profile
ships disabled until an official document is provided.

### 3.3 Not yet verified (blocked from publication)
- 2010 grading table
- Per-program assessment component structures (CA/final/practical weights) per
  regulation — must come from official curriculum/syllabus documents
- Non-Engineering program grading variations (Textile, Agriculture, Medical Tech…)
- Improvement/referred/retake mark-adjustment rules per regulation

## 4. Special Academic Cases (rule-profile driven)

Handled **only** when the profile defines the rule; otherwise the engine refuses the
input with a clear message.

| Case | Engine behavior |
|---|---|
| Failed subject (F) | Subject point 0.00; semester marked incomplete; GPA withheld until cleared (per profile) |
| Referred | Student may enter cleared grade after supplementary exam; profile decides whether capped (e.g., max D/C) |
| Improvement | Profile defines which grades improvable and cap; both attempts retained in history |
| Missing marks / incomplete | Subject flagged `incomplete`; GPA computed as provisional, clearly labelled |
| Practical/theory failure | Component minima from passRules decide pass/fail even if weighted total passes |
| Retake | Latest valid attempt used per profile; history preserved |
| Industrial training | Modeled as a semester/subject with its own assessment scheme |

## 5. Calculation Transparency (mandatory output)

Every result returns a breakdown the UI renders verbatim:

```
Subject: Computer Fundamentals (26611) — Credit 3
  Inputs: CA 24/30 · Final 41/70 → Total 65/100 (65%)
  Rule applied: 65–69% → B+ (3.25)   [grading table v2016.1]
  Points: 3 × 3.25 = 9.75
Semester GPA = Σ(credit×point) / Σ(credit) = 57.25/18 = 3.18
CGPA (2016 weights, completed sems 1–3) = (3.18×5 + 3.40×5 + 3.55×5)/15 = 3.38
```

Each line references the rule/table version applied.

## 6. Publishing Workflow & Safety

```
Draft → Verification (owner confirms rules vs official docs)
      → Testing (profile test suite must pass 100%)
      → Approval (Main Admin)
      → Publish (becomes selectable in app)
```

- Any edit creates a **new version**; published versions are immutable.
- Engine refuses to compute against a non-published profile.
- Each profile stores official document references + verification metadata.
- Target GPA planner output is always labelled: **"এটি একটি সম্ভাব্য হিসাব — অফিসিয়াল ফলাফল নয়"**.

## 7. Test Plan for the Engine (must pass before publish)

| Suite | Coverage |
|---|---|
| Grade boundaries | Every table edge: 39/40, 44/45, 49/50 … 79/80 |
| Credit math | Σ(credit×point)/Σ(credit) with mixed credits |
| Pass/fail | Component minima, practical-only failure, theory-only failure |
| Semester GPA | Reference examples (official marksheets where available) |
| CGPA | Weightage per regulation; partial-completion normalization |
| Special cases | Improvement cap, referred clearing, missing marks, retake |
| Regression | Golden results frozen per profile version; any change must reproduce them |
| Robustness | Negative marks, marks > max, missing components, invalid grades → clean errors |

Every profile carries a `testRunId` proving the suite passed on that exact version.
