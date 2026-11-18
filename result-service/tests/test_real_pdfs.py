"""Regression tests against real BTEB board PDFs (notices, not result sheets).

These files were downloaded from bteb.gov.bd (official board site). They are
board NOTICES in Bangla - they must yield ZERO student records. They guard
against the parser hallucinating rolls from Bangla numerals (০-৯) or garbled
subset-font text. Skipped when the fixture files are absent.
"""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from result_service.parser import parse_pdf

FIXTURES = Path(__file__).resolve().parents[2] / "docs" / "research" / "real-pdfs"

NOTICE_PDFS = [
    FIXTURES / "bteb-2026-09-a.pdf",
    FIXTURES / "bteb-2026-10-a.pdf",
]


@pytest.mark.parametrize("pdf", NOTICE_PDFS, ids=lambda p: p.name)
def test_notice_pdfs_yield_no_student_records(pdf: Path) -> None:
    if not pdf.exists():
        pytest.skip(f"fixture missing: {pdf.name}")
    result = parse_pdf(str(pdf))
    rolls = [r.roll for r in result.records]
    assert rolls == [], f"notice PDF produced fake student records: {rolls[:5]}"


def test_ascii_digits_only_in_extracted_rolls() -> None:
    for pdf in NOTICE_PDFS:
        if not pdf.exists():
            continue
        result = parse_pdf(str(pdf))
        for record in result.records:
            assert record.roll.isascii() and record.roll.isdigit()
