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
from typing import Any, Callable

import pdfplumber

# ASCII digits only: Python's \d also matches Bangla numerals (০-৯), which
# appear in garbled Bangla text and must never be read as rolls/GPAs.
ROLL_RE = re.compile(r"\b([0-9]{6,10})\b")
GPA_RE = re.compile(r"(?:^|\s)([0-4]\.[0-9]{2})(?:\s|$)")
REG_RE = re.compile(r"\b([0-9]{10,14})\b")
GRADE_RE = re.compile(r"^[A-F][+-]?$")

# Institute-wise board result sheets ("gpa-map" format), e.g.:
#   11044 - Himaloy Polytechnic Institute, Panchagarh
#   745547 { gpa7: ref, gpa6: ref, gpa4:
#   3.30, gpa3: 3.18, ref_sub: 25853(T), 28553(T) }
# Records wrap across lines, and the intro paragraph above each record block
# (passed / promoted to next semester / declared dropped out) is the only
# place the board states the outcome class.
INSTITUTE_RE = re.compile(r"^([0-9]{5})\s*-\s*(.+)$")
REC_START_RE = re.compile(r"^([0-9]{6,10})\s*[\(\{](.+)$")
GPA_ENTRY_RE = re.compile(r"\bgpa([0-9]{1,2})\s*:\s*(ref|fail|[0-4]\.[0-9]{2})")
# Final-program sheets (e.g. 8th semester, 2016 regulation) print a cumulative
# CGPA alongside the per-semester map: "... cgpa: 3.45 ( gpa8: 4.00, ...".
CGPA_RE = re.compile(r"\bcgpa\s*:\s*([0-4]\.[0-9]{2})")
REF_SUBJECT_RE = re.compile(r"(?:^|[,\s])([0-9]{4,6})\(([A-Za-z]{1,2})\)")
INTRO_PASSED_RE = re.compile(r"passed in all subjects", re.I)
INTRO_PROMOTED_RE = re.compile(r"promoted to\s*\n?\s*the next semester|promoted to next semester", re.I)
INTRO_DROPPED_RE = re.compile(r"dropped out on this semester", re.I)

# pdfplumber chokes on very large files; only use it for table-style PDFs
# below this page count.
DEFAULT_TABLE_PAGE_LIMIT = 60
# A record's roll can sit alone on the very last line of a page with its
# gpa-map starting on the next page.
BARE_ROLL_RE = re.compile(r"^[0-9]{6,10}$")
# Cover-page/notice lines that contain phone numbers, memo ids or emails must
# never be read as student records.
JUNK_LINE_RE = re.compile(r"phone|fax|e-?mail|www\.|@|memo no\.", re.I)
# A new record can begin on the same line where the previous record's closing
# bracket landed: "...(T) } 700209 { gpa7: ref, ..."
SEGMENT_SPLIT_RE = re.compile(r"(?<=[\)\}])\s+(?=[0-9]{6,10}\s*[\(\{])")


# A warning line explains WHERE (page) and WHY (reason + offending text
# snippet) a record was discarded — the admin must be able to see the cause,
# not just a bare count.
SNIPPET_LIMIT = 100


def _snippet(text: str, limit: int = SNIPPET_LIMIT) -> str:
    cleaned = re.sub(r"\s+", " ", text).strip()
    return cleaned[:limit] + "…" if len(cleaned) > limit else cleaned


def _warning_message(reason: str, page: int | None = None, text: str | None = None) -> str:
    prefix = f"page {page}: " if page else ""
    body = f'{reason}: "{_snippet(text)}"' if text else reason
    return prefix + body


@dataclass
class ParsedRecord:
    roll: str
    gpa: float | None = None
    cgpa: float | None = None
    registration_no: str | None = None
    name: str | None = None
    status: str | None = None
    subjects: list[dict[str, Any]] = field(default_factory=list)
    raw: dict[str, Any] = field(default_factory=dict)
    institute_code: str | None = None
    institute: str | None = None
    semester_gpas: dict[str, Any] = field(default_factory=dict)
    exam_semester: int | None = None


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


def parse_pdf(
    path: str,
    max_pages: int | None = None,
    table_page_limit: int | None = DEFAULT_TABLE_PAGE_LIMIT,
    on_page: Callable[[int, int], None] | None = None,
    on_warning: Callable[[str], None] | None = None,
) -> ParseResult:
    """Router: table-style PDFs go to pdfplumber, large gpa-map-style board
    sheets are parsed from fast raw text (pdfplumber hangs on 1000+-page
    files; pypdfium2 reads them in seconds).

    ``on_page`` receives (pages_done, page_count) after every scanned page
    so hosts can surface live progress. ``on_warning`` receives each
    warning message the moment it is raised, for live display."""
    page_count = _pdfium_page_count(path)
    if on_page is not None:
        on_page(0, page_count)
    if table_page_limit is not None and page_count <= table_page_limit:
        return _parse_pdf_pdfplumber(path, max_pages, on_page, on_warning)
    return _parse_pdf_gpa_map_text(path, max_pages, page_count, on_page, on_warning)


def _pdfium_page_count(path: str) -> int:
    import pypdfium2 as pdfium

    return len(pdfium.PdfDocument(path))


def _parse_pdf_pdfplumber(
    path: str,
    max_pages: int | None,
    on_page: Callable[[int, int], None] | None = None,
    on_warning: Callable[[str], None] | None = None,
) -> ParseResult:
    records: list[ParsedRecord] = []
    warnings: list[str] = []

    def warn(msg: str) -> None:
        warnings.append(msg)
        if on_warning is not None:
            on_warning(msg)
    seen_rolls: set[str] = set()

    def add(record: ParsedRecord | None) -> None:
        if record is None or record.roll in seen_rolls:
            return
        seen_rolls.add(record.roll)
        records.append(record)

    with pdfplumber.open(path) as pdf:
        pages = pdf.pages if max_pages is None else pdf.pages[:max_pages]
        for page_no, page in enumerate(pages, start=1):
            if on_page is not None:
                on_page(page_no, len(pages))
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
                    warn(f"page {page_no}: no extractable content")
                for line in text.splitlines():
                    add(_parse_text_line(line))

    return ParseResult(records=records, pages_scanned=len(pages), warnings=warnings)


def _map_closed(text: str) -> bool:
    # A record buffer is closed only when its final character is the closing
    # bracket of its opener. Balanced inner pairs like `25853(T)` mid-record
    # must not close it early.
    stripped = text.rstrip()
    if not stripped or stripped[-1] not in ")}":
        return False
    return stripped.count("(") == stripped.count(")") and stripped.count("{") == stripped.count("}")


def _parse_map_record(text: str, intro: str | None) -> ParsedRecord | None:
    cleaned = re.sub(r"\s+", " ", text).strip()
    roll_match = ROLL_RE.search(cleaned)
    if roll_match is None:
        return None
    for open_ch, close_ch in (("{", "}"), ("(", ")")):
        if cleaned.count(open_ch) > cleaned.count(close_ch):
            return None

    ref_subjects = [
        {"code": m.group(1), "type": m.group(2).upper()}
        for m in REF_SUBJECT_RE.finditer(cleaned)
    ]
    expelled_span = re.search(r"Expelled_sub\s*-\s*(.*)", cleaned)
    if expelled_span:
        expelled_codes = re.findall(r"([0-9]{4,6})", expelled_span.group(1)[:120]) or []
        if not expelled_codes:
            return None
        return ParsedRecord(
            roll=roll_match.group(1),
            gpa=None,
            status="expelled",
            subjects=[{"code": c} for c in expelled_codes],
            raw={"line": cleaned[:300]},
        )
    if "gpa" not in cleaned.lower() and not ref_subjects:
        return None

    gpas: dict[int, float | None] = {}
    gpa_tokens: dict[int, str] = {}
    for match in GPA_ENTRY_RE.finditer(cleaned):
        semester = int(match.group(1))
        gpa_tokens[semester] = match.group(2)
        gpas[semester] = _to_float(match.group(2))
    exam_semester = max(gpas) if gpas else None
    gpa = gpas.get(exam_semester) if exam_semester else None
    exam_token = gpa_tokens.get(exam_semester, "") if exam_semester else ""
    if intro == "dropped":
        status = "dropped"
    elif exam_token == "ref" or not gpas:
        status = "referred"
    elif exam_token == "fail":
        status = "fail"
    else:
        status = "pass"
    if not gpas and not ref_subjects:
        return None

    cgpa_match = CGPA_RE.search(cleaned)
    return ParsedRecord(
        roll=roll_match.group(1),
        gpa=gpa,
        cgpa=float(cgpa_match.group(1)) if cgpa_match else None,
        status=status,
        subjects=ref_subjects,
        raw={"line": cleaned[:300]},
        semester_gpas={f"gpa{k}": v for k, v in sorted(gpas.items())},
        exam_semester=exam_semester,
    )


def _parse_pdf_gpa_map_text(
    path: str,
    max_pages: int | None,
    page_count: int,
    on_page: Callable[[int, int], None] | None = None,
    on_warning: Callable[[str], None] | None = None,
) -> ParseResult:
    import pypdfium2 as pdfium

    records: list[ParsedRecord] = []
    warnings: list[str] = []
    seen_rolls: set[str] = set()

    def add(record: ParsedRecord | None) -> None:
        if record is None or record.roll in seen_rolls:
            return
        seen_rolls.add(record.roll)
        records.append(record)

    limit = page_count if max_pages is None else min(max_pages, page_count)
    pdf = pdfium.PdfDocument(path)
    pages_scanned = 0
    if on_page is not None:
        on_page(0, limit)
    institute_code: str | None = None
    institute: str | None = None
    pending_intro: str | None = None
    # Stack of open record buffers: [text, intro, institute_code, institute].
    # Usually 0 or 1 open. Two bare rolls in a row are a board print artifact:
    # the older bare roll is discarded instead of being merged into the next
    # record's data. Board PDFs do not repeat stray rolls, so nothing is lost.
    open_bufs: list[list[Any]] = []

    def warn(reason: str, text: str | None = None) -> None:
        msg = _warning_message(reason, state["page"], text)
        warnings.append(msg)
        if on_warning is not None:
            on_warning(msg)

    state = {"page": 0}

    def close_top() -> None:
        text, intro, inst_code, inst = open_bufs.pop()
        record = _parse_map_record(text, intro)
        if record is None:
            warn("discarded malformed record buffer (text did not match any known record layout)", text)
            return
        record.institute_code = inst_code
        record.institute = inst
        add(record)

    for page_no in range(limit):
        text = pdf[page_no].get_textpage().get_text_bounded()
        pages_scanned += 1
        state["page"] = pages_scanned
        if on_page is not None:
            on_page(pages_scanned, limit)
        for raw_line in text.splitlines():
            for segment in SEGMENT_SPLIT_RE.split(raw_line.strip()):
                line = segment.strip()
                if not line:
                    continue
                inst_match = INSTITUTE_RE.match(line)
                if inst_match:
                    institute_code = inst_match.group(1)
                    institute = inst_match.group(2).strip()
                    continue
                if INTRO_PASSED_RE.search(line):
                    pending_intro = "pass"
                    continue
                if INTRO_PROMOTED_RE.search(line):
                    pending_intro = "referred"
                    continue
                if INTRO_DROPPED_RE.search(line):
                    pending_intro = "dropped"
                    continue
                has_opener = bool(re.search(r"[\(\{]", line))
                is_start = REC_START_RE.match(line) is not None
                is_bare_roll = BARE_ROLL_RE.match(line) is not None
                if is_start or is_bare_roll:
                    if open_bufs and not re.search(r"[\(\{]", open_bufs[-1][0]):
                        open_bufs.pop()  # bare roll never got its map
                    if len(open_bufs) >= 2:
                        warn("discarded unclosed record buffer (a new roll started before the previous record's map arrived)", open_bufs[0][0])
                        open_bufs.pop(0)
                    open_bufs.append([line, pending_intro, institute_code, institute])
                    if _map_closed(open_bufs[-1][0]):
                        close_top()
                    continue
                if open_bufs:
                    last = open_bufs[-1]
                    last[0] = f"{last[0]} {line}"
                    if _map_closed(last[0]):
                        close_top()
                    continue
                if JUNK_LINE_RE.search(line):
                    continue
                add(_parse_text_line(line))

    pending = [b for b in open_bufs if "(" in b[0] or "{" in b[0]]
    if pending:
        warn(
            f"{len(pending)} record buffer(s) never closed (PDF text ended mid-record)",
            " | ".join(b[0] for b in pending),
        )
    return ParseResult(records=records, pages_scanned=pages_scanned, warnings=warnings)


def to_batch(records: list[ParsedRecord], meta: dict[str, Any]) -> dict[str, Any]:
    return {
        "meta": meta,
        "count": len(records),
        "records": [
            {
                "roll": r.roll,
                "gpa": r.gpa,
                "cgpa": r.cgpa,
                "registrationNo": r.registration_no,
                "name": r.name,
                "status": r.status,
                "subjects": r.subjects,
                "instituteCode": r.institute_code,
                "institute": r.institute,
                "semesterGpas": r.semester_gpas,
                "examSemester": r.exam_semester,
                "raw": r.raw,
            }
            for r in records
        ],
    }
