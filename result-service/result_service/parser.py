"""PDF parsing for BTEB result sheets.

BTEB publishes institute-wise result PDFs. Bangla text extraction from these
files is unreliable (subset fonts), but numbers (rolls, registration numbers,
GPAs, subject codes) extract cleanly - which is what roll-based lookup needs.

The parser is format-tolerant: it scans tables and text for student rows and
keeps unknown cells in `raw` so new formats can be tuned without data loss.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

import pdfplumber

# ASCII digits only: Python's \d also matches Bangla numerals (০-৯), which
# appear in garbled Bangla text and must never be read as rolls/GPAs.
ROLL_RE = re.compile(r"\b([0-9]{6,10})\b")
GPA_RE = re.compile(r"(?:^|\s)([0-4]\.[0-9]{2})(?:\s|$)")
REG_RE = re.compile(r"\b([0-9]{10,14})\b")
GRADE_RE = re.compile(r"^[A-F][+-]?$")


@dataclass
class ParsedRecord:
    roll: str
    gpa: float | None = None
    registration_no: str | None = None
    name: str | None = None
    status: str | None = None
    subjects: list[dict[str, Any]] = field(default_factory=list)
    raw: dict[str, Any] = field(default_factory=dict)


@dataclass
class ParseResult:
    records: list[ParsedRecord]
    pages_scanned: int
    warnings: list[str] = field(default_factory=list)


def _clean(cell: Any) -> str:
    if cell is None:
        return ""
    return re.sub(r"\s+", " ", str(cell)).strip()


def _to_float(value: str) -> float | None:
    try:
        return float(value)
    except ValueError:
        return None


def _parse_row(row: list[Any]) -> ParsedRecord | None:
    cells = [_clean(c) for c in row]
    joined = " ".join(cells)

    roll_match = None
    for cell in cells:
        m = ROLL_RE.search(cell)
        if m:
            roll_match = m
            break
    if not roll_match:
        return None
    roll = roll_match.group(1)

    gpa = None
    for cell in cells:
        m = GPA_RE.search(cell)
        if m:
            gpa = _to_float(m.group(1))
            break

    registration_no = None
    for cell in cells:
        m = REG_RE.search(cell)
        if m and m.group(1) != roll:
            registration_no = m.group(1)
            break

    name = None
    for cell in cells:
        if ROLL_RE.search(cell) or GPA_RE.search(cell):
            continue
        text = cell
        if text and not re.fullmatch(r"[\d\s./-]+", text) and len(text) > 2:
            name = text
            break

    status = None
    lowered = joined.lower()
    if any(word in lowered for word in ("fail", "ফেল", "অকৃতকার্য")):
        status = "fail"
    elif any(word in lowered for word in ("pass", "পাস", "উত্তীর্ণ", "কৃতকার্য")):
        status = "pass"
    elif any(word in lowered for word in ("refer", "রেফার")):
        status = "referred"

    subjects: list[dict[str, Any]] = []
    for cell in cells:
        for token in re.findall(r"\b([A-Z]{2,4}-?\d{3,4})\b", cell):
            subjects.append({"code": token})

    return ParsedRecord(
        roll=roll,
        gpa=gpa,
        registration_no=registration_no,
        name=name,
        status=status,
        subjects=subjects,
        raw={"cells": cells},
    )


def _parse_text_line(line: str) -> ParsedRecord | None:
    tokens = [t for t in re.split(r"\s{2,}", line) if t.strip()]
    if len(tokens) < 2:
        tokens = line.split()
    joined = " " + " ".join(tokens) + " "

    roll_match = ROLL_RE.search(joined)
    if not roll_match:
        return None

    gpa = None
    gpa_match = GPA_RE.search(joined)
    if gpa_match:
        gpa = _to_float(gpa_match.group(1))

    registration_no = None
    reg_match = REG_RE.search(joined)
    if reg_match and reg_match.group(1) != roll_match.group(1):
        registration_no = reg_match.group(1)

    name_tokens: list[str] = []
    for token in tokens:
        if ROLL_RE.search(token) or GPA_RE.search(token) or re.fullmatch(r"[\d\s./-]+", token):
            continue
        if GRADE_RE.match(token) or token.upper() in ("PASS", "FAIL", "REFERRED"):
            continue
        if len(token) > 1:
            name_tokens.append(token)
    name = " ".join(name_tokens) if name_tokens else None

    lowered = joined.lower()
    status = None
    if any(w in lowered for w in ("fail", "ফেল", "অকৃতকার্য")):
        status = "fail"
    elif any(w in lowered for w in ("pass", "পাস", "উত্তীর্ণ", "কৃতকার্য")):
        status = "pass"
    elif any(w in lowered for w in ("refer", "রেফার")):
        status = "referred"

    return ParsedRecord(
        roll=roll_match.group(1),
        gpa=gpa,
        registration_no=registration_no,
        name=name,
        status=status,
        raw={"line": line[:300]},
    )


def parse_pdf(path: str, max_pages: int | None = None) -> ParseResult:
    records: list[ParsedRecord] = []
    warnings: list[str] = []
    seen_rolls: set[str] = set()

    def add(record: ParsedRecord | None) -> None:
        if record is None or record.roll in seen_rolls:
            return
        seen_rolls.add(record.roll)
        records.append(record)

    with pdfplumber.open(path) as pdf:
        pages = pdf.pages if max_pages is None else pdf.pages[:max_pages]
        for page_no, page in enumerate(pages, start=1):
            tables = page.extract_tables() or []
            table_records = 0
            for table in tables:
                for row in table:
                    before = len(records)
                    add(_parse_row(row))
                    table_records += len(records) - before
            if table_records == 0:
                text = page.extract_text() or ""
                if not text:
                    warnings.append(f"page {page_no}: no extractable content")
                for line in text.splitlines():
                    add(_parse_text_line(line))

    return ParseResult(records=records, pages_scanned=len(pages), warnings=warnings)


def to_batch(records: list[ParsedRecord], meta: dict[str, Any]) -> dict[str, Any]:
    return {
        "meta": meta,
        "count": len(records),
        "records": [
            {
                "roll": r.roll,
                "gpa": r.gpa,
                "registrationNo": r.registration_no,
                "name": r.name,
                "status": r.status,
                "subjects": r.subjects,
                "raw": r.raw,
            }
            for r in records
        ],
    }
