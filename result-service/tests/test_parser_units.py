import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from result_service.parser import _parse_row, _parse_text_line, to_batch


def test_table_row_extracts_all_fields():
    rec = _parse_row(["410123", "1040123456", "Student One", "3.75", "PASS"])
    assert rec is not None
    assert rec.roll == "410123"
    assert rec.gpa == 3.75
    assert rec.registration_no == "1040123456"
    assert rec.name == "Student One"
    assert rec.status == "pass"


def test_text_line_extracts_all_fields():
    rec = _parse_text_line("410123  1040123456  Student One  3.75  PASS")
    assert rec is not None
    assert rec.roll == "410123"
    assert rec.gpa == 3.75
    assert rec.registration_no == "1040123456"
    assert rec.name == "Student One"
    assert rec.status == "pass"


def test_text_line_fail_status():
    rec = _parse_text_line("410125 1040123458 Student Three 2.00 FAIL")
    assert rec is not None
    assert rec.status == "fail"


def test_non_student_lines_are_ignored():
    assert _parse_text_line("Bangladesh Technical Education Board") is None
    assert _parse_text_line("Page 3 of 12") is None


def test_registration_not_confused_with_roll():
    rec = _parse_text_line("410123 1040123456 Student One 3.75 PASS")
    assert rec is not None
    assert rec.roll == "410123"
    assert rec.registration_no == "1040123456"


def test_to_batch_shape():
    batch = to_batch([], {"examId": "x"})
    assert batch["count"] == 0 and batch["records"] == []
    rec = _parse_row(["410123", None, None, "3.00", "PASS"])
    batch = to_batch([rec], {"examId": "x"})
    assert batch["records"][0]["roll"] == "410123"
    assert "raw" in batch["records"][0]
