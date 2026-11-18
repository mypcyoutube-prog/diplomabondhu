"""DiplomaBondhu result-service.

Separate Python service (approved by the project owner) that:
  1. parses BTEB institute-wise result PDFs into JSON batches
  2. bulk-imports confirmed batches into MongoDB (database: results_db)

The Node API remains the ONLY student-facing entry point; this service is
internal and protected by a shared service token.
"""

from __future__ import annotations

import hashlib
import json
import os
import time
from pathlib import Path

from fastapi import Body, Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pymongo import MongoClient, ASCENDING

from .parser import parse_pdf, to_batch

BATCH_DIR = Path(os.environ.get("RESULT_BATCH_DIR", "/tmp/result-batches"))
BATCH_DIR.mkdir(parents=True, exist_ok=True)

MONGO_URI = os.environ.get("MONGODB_URI", "mongodb://127.0.0.1:27017/")
RESULTS_DB = os.environ.get("RESULTS_DB", "results_db")
SERVICE_TOKEN = os.environ.get("RESULT_SERVICE_TOKEN", "")

app = FastAPI(title="DiplomaBondhu result-service", version="0.1.0")
bearer = HTTPBearer(auto_error=False)


def require_service_token(creds: HTTPAuthorizationCredentials | None = Depends(bearer)) -> None:
    if not SERVICE_TOKEN:
        raise HTTPException(status_code=503, detail="Service token not configured")
    if creds is None or creds.credentials != SERVICE_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid service token")


def db():
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    return client[RESULTS_DB]


@app.get("/health")
def health():
    return {"ok": True, "service": "result-service"}


@app.post("/parse")
async def parse(
    file: UploadFile = File(...),
    examId: str = Form(""),
    title: str = Form(""),
    _: None = Depends(require_service_token),
):
    data = await file.read()
    if len(data) > 50 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="PDF too large (max 50 MB)")
    if not data.startswith(b"%PDF"):
        raise HTTPException(status_code=400, detail="Not a PDF file")

    tmp = BATCH_DIR / f"upload-{int(time.time() * 1000)}.pdf"
    tmp.write_bytes(data)
    try:
        result = parse_pdf(str(tmp))
    finally:
        tmp.unlink(missing_ok=True)

    meta = {k: v for k, v in (("examId", examId), ("title", title)) if v}

    batch_id = hashlib.sha256(data).hexdigest()[:24]
    batch_path = BATCH_DIR / f"{batch_id}.json"
    batch = to_batch(result.records, {"fileName": file.filename, **meta})
    batch["meta"]["batchId"] = batch_id
    batch["meta"]["pagesScanned"] = result.pages_scanned
    batch["meta"]["warnings"] = result.warnings[:50]
    batch_path.write_text(json.dumps(batch, ensure_ascii=False))

    return {
        "batchId": batch_id,
        "fileName": file.filename,
        "pagesScanned": result.pages_scanned,
        "recordCount": len(result.records),
        "warnings": result.warnings[:50],
        "sample": [
            {k: v for k, v in r.items() if k != "raw"}
            for r in batch["records"][:5]
        ],
    }


@app.get("/batches")
def list_batches(_: None = Depends(require_service_token)):
    batches = []
    for path in sorted(BATCH_DIR.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True)[:100]:
        try:
            batch = json.loads(path.read_text())
        except (json.JSONDecodeError, OSError):
            continue
        meta = batch.get("meta", {})
        batches.append({
            "batchId": meta.get("batchId", path.stem),
            "fileName": meta.get("fileName"),
            "examId": meta.get("examId"),
            "recordCount": batch.get("count", 0),
            "pagesScanned": meta.get("pagesScanned"),
            "warnings": meta.get("warnings", []),
            "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(path.stat().st_mtime)),
        })
    return {"batches": batches}


@app.post("/import/{batch_id}")
def import_batch(batch_id: str, body: dict = Body(default={}), _: None = Depends(require_service_token)):
    if not re_ok(batch_id):
        raise HTTPException(status_code=400, detail="Invalid batch id")
    batch_path = BATCH_DIR / f"{batch_id}.json"
    if not batch_path.exists():
        raise HTTPException(status_code=404, detail="Batch not found (parse again)")

    meta = body.get("meta", {}) if isinstance(body, dict) else {}

    batch = json.loads(batch_path.read_text())
    records = batch.get("records", [])
    if not records:
        raise HTTPException(status_code=400, detail="Batch has no records")

    exam_id = meta.get("examId") or batch["meta"].get("examId")
    if not exam_id:
        raise HTTPException(status_code=400, detail="examId is required (exam name + date identifies a result set)")

    try:
        db().client.admin.command("ping")
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Cannot reach MongoDB ({MONGO_URI}): {type(exc).__name__}: {exc}",
        ) from exc

    coll = db()["records"]
    docs = []
    for r in records:
        doc = {
            "examId": exam_id,
            "roll": r["roll"],
            "gpa": r.get("gpa"),
            "registrationNo": r.get("registrationNo"),
            "name": r.get("name"),
            "status": r.get("status"),
            "subjects": r.get("subjects", []),
            "instituteCode": r.get("instituteCode"),
            "institute": r.get("institute"),
            "semesterGpas": r.get("semesterGpas"),
            "examSemester": r.get("examSemester"),
            "batchId": batch_id,
            "meta": {k: v for k, v in {**batch["meta"], **meta}.items() if k not in ("warnings", "records")},
        }
        docs.append(doc)

    inserted = 0
    CHUNK = 500
    from pymongo import ReplaceOne
    for i in range(0, len(docs), CHUNK):
        ops = [ReplaceOne({"examId": exam_id, "roll": doc["roll"]}, doc, upsert=True) for doc in docs[i:i + CHUNK]]
        res = coll.bulk_write(ops, ordered=False)
        inserted += res.upserted_count

    coll.create_index([("examId", ASCENDING), ("roll", ASCENDING)], unique=True)
    coll.create_index([("examId", ASCENDING), ("name", ASCENDING)])

    exams = db()["exams"]
    exams.update_one(
        {"examId": exam_id},
        {"$set": {"examId": exam_id, "recordCount": coll.count_documents({"examId": exam_id}), "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), **{k: v for k, v in meta.items() if k != "examId"}}},
        upsert=True,
    )

    return {"batchId": batch_id, "examId": exam_id, "total": len(docs), "inserted": inserted, "updated": len(docs) - inserted}


def re_ok(batch_id: str) -> bool:
    import re
    return bool(re.fullmatch(r"[a-f0-9]{24}", batch_id))
