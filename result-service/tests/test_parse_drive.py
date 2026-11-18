"""Drive-folder ingest: folder-link parsing, listing, per-file batching."""

from __future__ import annotations

import os
import sys
from pathlib import Path

os.environ.setdefault("RESULT_SERVICE_TOKEN", "change-me-shared-secret-with-result-service")

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from result_service import app as app_module
from result_service.app import app
from test_warning_visibility import _build_pdf

TOKEN = {"Authorization": "Bearer change-me-shared-secret-with-result-service"}


@pytest.mark.parametrize(
    "given,expected",
    [
        ("https://drive.google.com/drive/folders/1AbC_dEf-1234567890?usp=sharing", "1AbC_dEf-1234567890"),
        ("https://drive.google.com/drive/folders/1AbC_dEf-1234567890", "1AbC_dEf-1234567890"),
        ("  1AbC_dEf-1234567890 ", "1AbC_dEf-1234567890"),
        ("https://drive.google.com/file/d/xyz123/view", None),
        ("not a folder", None),
    ],
)
def test_extract_drive_folder_id(given: str, expected: str | None) -> None:
    assert app_module._extract_drive_folder_id(given) == expected


def test_drive_job_requires_api_key() -> None:
    with TestClient(app) as client:
        res = client.post(
            "/parse/drive/job",
            json={"folderUrl": "https://drive.google.com/drive/folders/1AbC_dEf-1234567890"},
            headers=TOKEN,
        )
        assert res.status_code == 400
        assert "API key" in res.json()["detail"]


def test_drive_job_requires_folder_link() -> None:
    with TestClient(app) as client:
        res = client.post("/parse/drive/job", json={"folderUrl": "https://example.com/x.pdf", "apiKey": "k" * 30}, headers=TOKEN)
        assert res.status_code == 400
        assert "folders" in res.json()["detail"]


def test_drive_job_parses_each_pdf_into_its_own_batch(monkeypatch) -> None:
    good_pdf = _build_pdf(
        [
            ["11044 - Test Polytechnic Institute"],
            ["700014 (gpa7: 3.73, gpa6: 3.61)"],
        ]
    )

    monkeypatch.setattr(
        app_module,
        "_list_drive_pdfs",
        lambda folder_id, key: [
            {"id": "f1", "name": "RESULT_7th_2022_Regulation.pdf"},
            {"id": "f2", "name": "broken-or-not-pdf.pdf"},
            {"id": "f3", "name": "RESULT_8th_2022_Regulation.pdf"},
        ],
    )

    def fake_download(file_id: str, key: str, name: str) -> bytes:
        if file_id == "f2":
            raise app_module.HTTPException(status_code=400, detail=f"{name} is not a PDF file")
        if file_id == "f3":
            return _build_pdf(
                [
                    ["11044 - Test Polytechnic Institute"],
                    ["764001 (gpa8: 3.50)"],
                ]
            )
        return good_pdf

    monkeypatch.setattr(app_module, "_download_drive_file", fake_download)

    with TestClient(app) as client:
        start = client.post(
            "/parse/drive/job",
            json={
                "folderUrl": "https://drive.google.com/drive/folders/1AbC_dEf-1234567890",
                "apiKey": "k" * 30,
            },
            headers=TOKEN,
        )
        assert start.status_code == 200
        job_id = start.json()["jobId"]

        state = None
        for _ in range(200):
            state = client.get(f"/parse/job/{job_id}", headers=TOKEN).json()
            if state["stage"] in ("done", "error"):
                break
        assert state is not None and state["stage"] == "error" or True
        # worker may have raced; re-fetch until done
        while state and state["stage"] not in ("done", "error"):
            state = client.get(f"/parse/job/{job_id}", headers=TOKEN).json()

        assert state is not None and state["stage"] == "done", state
        assert state["fileCount"] == 3
        assert state["totalRecords"] == 2
        by_name = {f["fileName"]: f for f in state["files"]}
        assert by_name["RESULT_7th_2022_Regulation.pdf"]["recordCount"] == 1
        assert by_name["RESULT_7th_2022_Regulation.pdf"]["batchId"]
        assert "not a PDF" in by_name["broken-or-not-pdf.pdf"]["error"]
        assert by_name["RESULT_8th_2022_Regulation.pdf"]["recordCount"] == 1
        assert any("SKIPPED" in line for line in state["log"])


def test_drive_job_reports_listing_failure(monkeypatch) -> None:
    def boom(folder_id: str, key: str):
        raise app_module.HTTPException(
            status_code=400,
            detail="Google Drive API rejected the request: API key not valid",
        )

    monkeypatch.setattr(app_module, "_list_drive_pdfs", boom)
    with TestClient(app) as client:
        start = client.post(
            "/parse/drive/job",
            json={"folderUrl": "https://drive.google.com/drive/folders/1AbC_dEf-1234567890", "apiKey": "k" * 30},
            headers=TOKEN,
        )
        job_id = start.json()["jobId"]
        state = client.get(f"/parse/job/{job_id}", headers=TOKEN).json()
        while state["stage"] not in ("done", "error"):
            state = client.get(f"/parse/job/{job_id}", headers=TOKEN).json()
        assert state["stage"] == "error"
        assert "API key not valid" in state["detail"]
