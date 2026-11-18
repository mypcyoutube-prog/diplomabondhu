"""Tests for the board "gpa-map" institute-wise result-sheet format.

Real board result PDFs of this format (e.g. Diploma in Engineering 7th
Semester, 2022 Regulation) place each record as:

    11044 - Himaloy Polytechnic Institute, Panchagarh
    700014 (gpa7: 3.73, gpa6: 3.61, ...)
    700022 { gpa7: ref, gpa6: 3.44, ..., ref_sub: 27061(T), 27073(T) }

Records wrap across lines, a new record can start on the same line where the
previous record's closing bracket landed, a roll can sit alone on a page
boundary, and the intro paragraph above a block (passed / promoted to next
semester / declared dropped out) gives the outcome class.
"""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from result_service.parser import (
    _map_closed,
    _parse_map_record,
    parse_pdf,
    to_batch,
)


def _rec(text: str, intro: str | None = None):
    return _parse_map_record(text, intro)


def test_pass_record_single_line() -> None:
    rec = _rec("700014 (gpa7: 3.73, gpa6: 3.61)")
    assert rec is not None
    assert rec.roll == "700014"
    assert rec.gpa == 3.73
    assert rec.status == "pass"
    assert rec.exam_semester == 7
    assert rec.semester_gpas["gpa6"] == 3.61


def test_cgpa_extracted_when_printed() -> None:
    """8th-semester sheets may print a cumulative cgpa next to the gpa map."""
    rec = _rec("700014 (cgpa: 3.45 ( gpa8: 3.50, gpa7: 3.73))")
    assert rec is not None
    assert rec.cgpa == 3.45
    assert rec.exam_semester == 8
    assert rec.semester_gpas == {"gpa8": 3.5, "gpa7": 3.73}


def test_cgpa_absent_is_none() -> None:
    rec = _rec("700014 (gpa7: 3.73, gpa6: 3.61)")
    assert rec is not None
    assert rec.cgpa is None


def test_cgpa_not_confused_with_gpa_tokens() -> None:
    rec = _rec("700014 (cgpa: 3.72 (gpa8: 3.72))")
    assert rec is not None
    assert rec.cgpa == 3.72 and rec.gpa == 3.72


def test_to_batch_exports_cgpa() -> None:
    rec = _rec("700014 (cgpa: 3.45 ( gpa8: 3.50))")
    assert rec is not None
    batch = to_batch([rec], {"examId": "x"})
    assert batch["records"][0]["cgpa"] == 3.45


def test_referred_record_multiline_with_ref_subjects() -> None:
    rec = _rec(
        "745547 { gpa7: ref, gpa6: ref, gpa5: ref, gpa4: "
        "3.30, gpa3: 3.18, gpa2: 3.60, gpa1: 3.20, ref_sub: "
        "25853(T), 28553(T), 28561(T) }",
        intro="referred",
    )
    assert rec is not None
    assert rec.roll == "745547"
    assert rec.gpa is None
    assert rec.status == "referred"
    assert [s["code"] for s in rec.subjects] == ["25853", "28553", "28561"]
    assert rec.semester_gpas["gpa4"] == 3.30


def test_dropped_section_marks_dropped_status() -> None:
    rec = _rec("718315 { gpa7: 3.19, gpa6: ref, gpa5: 2.91, ref_sub: 25841(T) }", intro="dropped")
    assert rec is not None
    assert rec.status == "dropped"
    assert rec.gpa == 3.19


def test_expelled_record_has_status_and_codes() -> None:
    rec = _rec("764170 ( Expelled_sub - 28563)")
    assert rec is not None
    assert rec.status == "expelled"
    assert rec.subjects == [{"code": "28563"}]


def test_ref_subject_only_record_is_referred() -> None:
    rec = _rec("777014 { 25851(T), 25853(T), 26976(P) }", intro="referred")
    assert rec is not None
    assert rec.status == "referred"
    assert rec.gpa is None
    assert rec.subjects[-1] == {"code": "26976", "type": "P"}


def test_record_without_gpa_or_subjects_is_rejected() -> None:
    assert _rec("729895") is None


def test_map_closed_balances_both_bracket_styles() -> None:
    assert _map_closed("(gpa7: 3.00)")
    assert _map_closed("{ gpa7: ref (x?) }")
    assert not _map_closed("{ gpa7: ref, gpa4:")
    assert not _map_closed("(gpa7: 3.00, ref_sub: 12345(T")


def test_phone_line_never_becomes_a_roll() -> None:
    rec = _rec("Phone: 02-55006525")
    assert rec is None


BIG_PDF = (
    Path(__file__).resolve().parents[2]
    / "docs"
    / "research"
    / "real-pdfs"
    / "bteb-2026-eng-7th-2022-regulation-result.pdf"
)


def test_real_gpa_map_pdf_parses_sanely() -> None:
    if not BIG_PDF.exists():
        pytest.skip(f"fixture missing: {BIG_PDF.name}")
    result = parse_pdf(str(BIG_PDF), max_pages=120)
    records = result.records
    assert len(records) > 300
    statuses = {r.status for r in records}
    assert statuses <= {"pass", "referred", "dropped", "fail", "expelled", None}
    rolls = [r.roll for r in records]
    assert len(rolls) == len(set(rolls))
    for r in records:
        assert r.roll.isascii() and r.roll.isdigit()
        assert r.gpa is None or 0.0 <= r.gpa <= 5.0
    assert any(r.institute for r in records)
    batch = to_batch(records, {"examId": "test-exam"})
    assert batch["count"] == len(records)
    sample = batch["records"][0]
    assert "semesterGpas" in sample and "instituteCode" in sample
