"""Parse-from-URL: public-host guard (SSRF) + the /parse/url/job pipeline."""

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
    "url",
    [
        "http://127.0.0.1/sheet.pdf",
        "http://localhost/sheet.pdf",
        "http://192.168.1.50/sheet.pdf",
        "http://10.0.0.9/sheet.pdf",
        "http://169.254.169.254/latest/meta-data",
        "https://[::1]/sheet.pdf",
        "ftp://example.com/sheet.pdf",
        "file:///etc/passwd",
    ],
)
def test_private_or_non_http_urls_are_refused(url: str) -> None:
    with pytest.raises(Exception) as excinfo:
        app_module._validate_public_url(url)
    assert getattr(excinfo.value, "status_code", 0) == 400


def test_real_public_host_passes_validation() -> None:
    app_module._validate_public_url("https://example.com/RESULT_7th.pdf")


def test_parse_url_job_requires_url() -> None:
    with TestClient(app) as client:
        res = client.post("/parse/url/job", json={}, headers=TOKEN)
        assert res.status_code == 400
        assert "URL" in res.json()["detail"]


def test_parse_url_job_end_to_end(monkeypatch, tmp_path) -> None:
    """With the download faked (no network in tests), the full job pipeline
    must parse the PDF, emit a terminal log and finish cleanly."""
    pdf_bytes = _build_pdf(
        [
            ["11044 - Test Polytechnic Institute"],
            ["700014 (gpa7: 3.73, gpa6: 3.61)"],
        ]
    )
    monkeypatch.setattr(app_module, "_download_pdf", lambda url: (pdf_bytes, "RESULT_7th.pdf"))

    with TestClient(app) as client:
        start = client.post(
            "/parse/url/job",
            json={"url": "https://example.com/results/RESULT_7th.pdf", "examId": "eng-7th-2022reg-2026"},
            headers=TOKEN,
        )
        assert start.status_code == 200
        job_id = start.json()["jobId"]

        state = None
        for _ in range(100):
            state = client.get(f"/parse/job/{job_id}", headers=TOKEN).json()
            if state["stage"] in ("done", "error"):
                break
        assert state is not None and state["stage"] == "done", state
        assert state["recordCount"] == 1
        assert state["fileName"] == "RESULT_7th.pdf"
        assert any("downloaded" in line for line in state["log"])
        assert any("done: 1 records" in line for line in state["log"])


def test_parse_url_job_reports_download_error(monkeypatch) -> None:
    from fastapi import HTTPException

    def boom(url: str):
        raise HTTPException(status_code=400, detail="Download failed: HTTP 404")

    monkeypatch.setattr(app_module, "_download_pdf", boom)
    with TestClient(app) as client:
        start = client.post("/parse/url/job", json={"url": "https://example.com/missing.pdf"}, headers=TOKEN)
        job_id = start.json()["jobId"]
        state = client.get(f"/parse/job/{job_id}", headers=TOKEN).json()
        # worker runs in a thread; allow a moment
        for _ in range(50):
            if state["stage"] in ("done", "error"):
                break
            import time
            time.sleep(0.02)
            state = client.get(f"/parse/job/{job_id}", headers=TOKEN).json()
        assert state["stage"] == "error"
        assert "Download failed" in state["detail"]
