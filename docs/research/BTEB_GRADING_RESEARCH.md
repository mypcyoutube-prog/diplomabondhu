# BTEB Grading Research — Sources & Verification Status

**Version:** 1.0 · **Date of research:** Blueprint v1 session · **Method:** web search +
cross-checking multiple independent secondary sources. **No official BTEB document was
directly accessed yet** — every row below must be confirmed by the project owner against
an official BTEB regulation/curriculum document before the matching profile is published.

---

## 1. Final CGPA = semester-GPA weighted by regulation-specific percentages

**Finding (multi-source agreement):**

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

**Sources:**
1. cgpa-calculator.com — "Diploma Semester Wise GPA Priorities" table (2010/2016/2022) — https://cgpa-calculator.com/diploma-cgpa-calculator/
2. toolsace.io — 2016: "1st-3rd (5% each), 4th-5th (10% each), 6th-7th (20% each), 8th (25%)"; 2022: "1st-2nd (5%), 3rd-4th (10%), 5th-7th (20%), 8th (10%)" — https://www.toolsace.io/polytechnic-cgpa-calculator *(note: toolsace's 2016 row conflicts with sources 1, 3, 4 below — majority view adopted, flagged)*
3. cgpacalculatoronline.net — 2016 weights 5-5-5-10-15-20-25-15 — https://cgpacalculatoronline.net/cgpa-calculator-for-diploma/
4. students.bd — "Probidhan 2010 and 2016 place a massive 25% weight on the 7th semester and 15% on the 8th" — https://students.bd/calculator/diploma-cgpa
5. civilkpi.blogspot.com — 2010: 5,5,5,15,15,20,25,10 — https://civilkpi.blogspot.com/2019/02/how-to-calculate-final-cgpa-for-diploma.html
6. btebresultszone.com — full "Semester Wise GPA Priorities for Regulations" table (2010/2016/2022), re-checked 2026-11-17 at https://btebresultszone.com/cgpa-calculator — **matches the adopted table exactly for all three regulations** (was already listed under §3 for semester GPA; now also confirms §1 weightages)

**Status:** 2016 & 2022 → consistent across ≥3 independent sources (provisional).
2010 → 3 sources agree (provisional). ⚠️ Requires owner verification with official document.

## 2. Marks → Grade → Point table (2016 & 2022, Diploma in Engineering)

| Marks % | Grade | Point | Source agreement |
|---|---|---|---|
| 80–100 | A+ | 4.00 | ✅ all sources |
| 75–79 | A | 3.75 | ✅ |
| 70–74 | A− | 3.50 | ✅ |
| 65–69 | B+ | 3.25 | ✅ |
| 60–64 | B | 3.00 | ✅ |
| 55–59 | B− | 2.75 | ✅ |
| 50–54 | C+ | 2.50 | ✅ |
| 45–49 | C | 2.25 | ✅ |
| 40–44 | D | 2.00 | ✅ (btebresultszone: "at least 40% marks to pass, D, 2.00") |
| 0–39 | F | 0.00 | ✅ |

**Sources:** students.bd ("standard 4.00-point mapping… universally defined"),
btebresultszone.com/gpa-calculator, cgpa-calculator.com (table present but with typos —
letter labels partially swapped and overlapping ranges; values above are the
de-conflicted majority reading).

**Additional rules found:** minimum CGPA for certificate 2.00; CGPA ≥ 3.00 = First
Class; 2.25–2.99 = Second Class; all subjects must be passed; referred subjects block
final GPA until cleared via supplementary exam.

**Status:** Provisional — owner verification required. ⚠️

## 3. Semester GPA = credit-weighted average of grade points

**Finding:** "The semester GPA is a credit-weighted average of grade points across all
subjects" — GPA = Σ(credit × gradePoint) / Σ(credit).
**Source:** btebresultszone.com/gpa-calculator.
**Status:** Provisional — consistent with standard BTEB practice; owner verification required. ⚠️

## 4. NOT FOUND / NOT VERIFIED (blocked from implementation)

| Item | Why blocked |
|---|---|
| 2010 Probidhan marks→grade mapping | No reliable source found; 2010 may use a different scale |
| Assessment component weights (CA/final/practical) per regulation & subject type | Requires official curriculum/syllabus documents |
| Program-specific variations (Textile, Agriculture, Fisheries, Forestry, Livestock, Medical Tech, Marine, Tourism, Commerce) | Each program's own regulation documents needed |
| Improvement / referred / retake mark-adjustment rules per regulation | Official rules required |
| Official result API / integration for Result Checker | None found; feature stays Coming Soon |

## 5. Candidate official sources for owner verification

- BTEB official website: https://www.bteb.gov.bd (regulations/circulars section)
- Official result portal: https://result.bteb.gov.bd
- Official curriculum PDFs for Diploma in Engineering Probidhan 2016 & 2022
  (owner may have printed/college copies — preferred)

## 6. Verification Protocol (agreed with owner)

1. Owner supplies or approves official document(s).
2. Each rule entered into a calculation profile records: document title, section/page,
   URL or scan reference, retrieval date.
3. Profile moves Draft → Verification only after owner confirms; → Testing after the
   engine test suite passes; → Publish only after Main Admin approval.
