# DiplomaBondhu result-service (P12)

Internal Python service that converts BTEB result PDFs into JSON batches and
imports them into MongoDB (`results_db`). It is **not** student-facing: the
Node API (`/api/v1/results/*`) is the only student-facing surface, and the
Flutter app reads results only through the Node API.

Flow: admin uploads a result PDF in the admin panel → Node proxies the file
here (`POST /parse`) → admin reviews the preview (record count, sample rows,
warnings) and confirms with an `examId` → Node calls `POST /import/{batchId}`
→ records are upserted into `results_db.records` (unique index `examId+roll`).

## Endpoints (all require `Authorization: Bearer $RESULT_SERVICE_TOKEN`)

- `GET /health` — liveness (no token).
- `POST /parse` — multipart `file` (PDF ≤ 50 MB). Parses institute-wise result
  sheets (table rows, with a text-line fallback). Returns `batchId`,
  `recordCount`, `pagesScanned`, `warnings`, `sample` (first 5 records). The
  batch JSON is stored in `RESULT_BATCH_DIR` keyed by content hash, so
  re-uploading the same PDF reuses the same batch id.
- `GET /batches` — lists stored batches with meta (for the admin panel).
- `POST /import/{batchId}` — body `{"meta": {"examId": "...", "title": "..."}}`.
  Requires `examId` (a stable identifier for the result set, e.g.
  `eng-3rd-2026-11`). Upserts records, updates `results_db.exams`.

## Environment

- `MONGODB_URI` (default `mongodb://127.0.0.1:27017/`)
- `RESULTS_DB` (default `results_db`)
- `RESULT_SERVICE_TOKEN` — required; shared secret with the Node API.
- `RESULT_BATCH_DIR` (default `/tmp/result-batches`) — use a persistent
  volume in production, otherwise batches are lost on restart.

## Run

```bash
pip install -r requirements.txt
RESULT_SERVICE_TOKEN=<token> MONGODB_URI=<uri> uvicorn result_service.app:app --host 127.0.0.1 --port 8300
pytest
```

## Parser honesty note

The parser was tuned on synthetic BTEB-style PDFs and on the structure of
officially published institute-wise result sheets. Real BTEB PDF layouts vary
by institute and regulation; **always** use the `/parse` preview (record
count + sample + warnings) before importing a batch, and spot-check a few
rolls against the original PDF. Bangla names may extract unreliably from
subset fonts — rolls, registration numbers and GPAs are the reliable fields.
