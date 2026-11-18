"""Generates a synthetic BTEB-style institute result PDF and runs the parser
end-to-end against it (parse -> import -> lookup)."""

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from reportlab.lib.pagesizes import A4  # type: ignore
from reportlab.pdfgen import canvas  # type: ignore

from result_service.parser import parse_pdf, to_batch


def make_sample_pdf(path: str) -> None:
    c = canvas.Canvas(path, pagesize=A4)
    width, height = A4
    rows = [
        ("Roll", "Registration", "Name", "GPA", "Result"),
        ("410123", "1040123456", "Student One", "3.75", "PASS"),
        ("410124", "1040123457", "Student Two", "3.50", "PASS"),
        ("410125", "1040123458", "Student Three", "2.00", "FAIL"),
        ("410126", "1040123459", "Student Four", "4.00", "PASS"),
    ]
    y = height - 100
    c.setFont("Helvetica", 10)
    for row in rows:
        x = 60
        for cell in row:
            c.drawString(x, y, cell)
            x += 110
        y -= 20
    c.save()


def main() -> int:
    tmp = tempfile.mkdtemp()
    pdf_path = os.path.join(tmp, "sample.pdf")
    make_sample_pdf(pdf_path)

    result = parse_pdf(pdf_path)
    batch = to_batch(result.records, {"examId": "eng-3rd-2026-11", "fileName": "sample.pdf"})
    rolls = [r["roll"] for r in batch["records"]]
    assert rolls == ["410123", "410124", "410125", "410126"], rolls
    gpas = {r["roll"]: r["gpa"] for r in batch["records"]}
    assert gpas["410123"] == 3.75 and gpas["410126"] == 4.00, gpas
    assert batch["records"][2]["status"] == "fail"
    print("parse OK:", json.dumps(batch["records"][0], ensure_ascii=False))

    from pymongo import MongoClient
    from pymongo.errors import ServerSelectionTimeoutError

    uri = os.environ.get("MONGODB_URI", "mongodb://127.0.0.1:27017/")
    client = MongoClient(uri, serverSelectionTimeoutMS=2000)
    try:
        client.admin.command("ping")
    except ServerSelectionTimeoutError:
        import pytest
        pytest.skip("MongoDB not available")
    db = client["results_db_test"]
    coll = db["records"]
    coll.delete_many({})
    for r in batch["records"]:
        coll.update_one({"examId": "eng-3rd-2026-11", "roll": r["roll"]}, {"$set": {**r, "examId": "eng-3rd-2026-11"}}, upsert=True)
    coll.create_index([("examId", 1), ("roll", 1)], unique=True)
    found = coll.find_one({"examId": "eng-3rd-2026-11", "roll": "410123"})
    assert found and found["gpa"] == 3.75
    print("import + lookup OK:", found["roll"], found["gpa"])
    client.drop_database("results_db_test")
    return 0


def test_full_pipeline():
    assert main() == 0


if __name__ == "__main__":
    sys.exit(main())
