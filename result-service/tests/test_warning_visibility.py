"""Warnings must be transparent: page number, reason and the offending text.

Board sheets occasionally contain text the parser cannot trust (a roll whose
map never parses). The parser must DISCARD such buffers and raise a warning
that tells the admin exactly what was discarded and why — a bare count is not
acceptable. These tests also cover the ``on_warning`` live callback used by
the admin panel's terminal-style parse log.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from result_service.parser import _snippet, _warning_message, parse_pdf


def _esc(text: str) -> str:
    return text.replace("\\", r"\\").replace("(", r"\(").replace(")", r"\)")


def _build_pdf(pages: list[list[str]]) -> bytes:
    """Minimal hand-built PDF (Helvetica text, one page per list)."""
    n = len(pages)
    font_num = 3 + 2 * n
    page_nums = [3 + 2 * i for i in range(n)]
    content_nums = [4 + 2 * i for i in range(n)]
    kids = " ".join(f"{num} 0 R" for num in page_nums)
    objects: list[bytes] = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        f"<< /Type /Pages /Kids [{kids}] /Count {n} >>".encode(),
    ]
    for i, lines in enumerate(pages):
        ops = "\n".join(
            f"BT /F1 10 Tf 72 {720 - 14 * j} Td ({_esc(line)}) Tj ET"
            for j, line in enumerate(lines)
        ).encode()
        objects.append(
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
            f"/Resources << /Font << /F1 {font_num} 0 R >> >> "
            f"/Contents {content_nums[i]} 0 R >>".encode()
        )
        objects.append(
            f"<< /Length {len(ops)} >>\nstream\n".encode() + ops + b"\nendstream"
        )
    objects.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")

    out = bytearray(b"%PDF-1.4\n")
    offsets: list[int] = []
    for num, body in enumerate(objects, start=1):
        offsets.append(len(out))
        out += f"{num} 0 obj\n".encode() + body + b"\nendobj\n"
    xref_pos = len(out)
    out += f"xref\n0 {len(objects) + 1}\n".encode()
    out += b"0000000000 65535 f \n"
    for off in offsets:
        out += f"{off:010d} 00000 n \n".encode()
    out += (
        f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\n"
        f"startxref\n{xref_pos}\n%%EOF"
    ).encode()
    return bytes(out)


def test_snippet_collapses_whitespace_and_truncates() -> None:
    assert _snippet("a   b\n\tc ") == "a b c"
    long = "x" * 150
    s = _snippet(long)
    assert len(s) == 101 and s.endswith("…")


def test_warning_message_has_page_and_reason() -> None:
    msg = _warning_message("discarded malformed record buffer", 87)
    assert msg == "page 87: discarded malformed record buffer"


def test_warning_message_includes_offending_text() -> None:
    msg = _warning_message("discarded malformed record buffer", 87, "712999 (cgpa: (gpa8: 4")
    assert msg.startswith("page 87:")
    assert '"712999 (cgpa: (gpa8: 4"' in msg


def test_gpa_map_malformed_buffer_warning_is_visible(tmp_path) -> None:
    """A roll whose map cannot be parsed -> warning with page + raw text."""
    pdf_path = tmp_path / "sheet.pdf"
    pdf_path.write_bytes(
        _build_pdf(
            [
                ["11044 - Test Polytechnic Institute"],
                ["700100 ( mystery junk with no gpa )"],
                ["11044 - Test Polytechnic Institute"],
                ["700014 (gpa7: 3.73)"],
            ]
        )
    )
    live: list[str] = []
    result = parse_pdf(str(pdf_path), table_page_limit=0, on_warning=live.append)

    reasons = [w for w in result.warnings if "malformed" in w]
    assert len(reasons) == 1
    assert "page 2" in reasons[0] and '"700100 ( mystery junk' in reasons[0]
    assert live == result.warnings
    assert [r.roll for r in result.records] == ["700014"]


def test_gpa_map_clean_file_has_no_warnings(tmp_path) -> None:
    pdf_path = tmp_path / "sheet.pdf"
    pdf_path.write_bytes(
        _build_pdf(
            [
                ["11044 - Test Polytechnic Institute"],
                ["700014 (gpa7: 3.73, gpa6: 3.61)"],
            ]
        )
    )
    result = parse_pdf(str(pdf_path), table_page_limit=0, on_warning=lambda w: None)
    assert result.warnings == []
    assert [r.roll for r in result.records] == ["700014"]
