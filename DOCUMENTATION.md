# GrowEasy AI CSV Importer — Technical Documentation

This document explains **how the project is built, how it works, and why the key
decisions were made**. For quick setup steps see [README.md](./README.md).

- **Live app:** https://grow-easy-rose.vercel.app
- **Repository:** https://github.com/Sthitaprajnyaa/GrowEasy

---

## 1. Problem statement

Build an AI-powered CSV importer that extracts CRM lead information from **any**
valid CSV format. The difficulty is not parsing CSV — it is that real-world lead
exports come with wildly different column names, orders, and structures
(Facebook Lead Ads, Google Ads, Excel sheets, real-estate CRM exports, marketing
agency dumps, hand-made spreadsheets). The system must map those arbitrary
columns into GrowEasy's **fixed** CRM schema, using AI, and following a strict
set of business rules.

---

## 2. High-level architecture

```
┌─────────────────────────────┐         ┌──────────────────────────────────────┐
│  Frontend (Next.js, Vercel) │         │       Backend (Express, Render)        │
│                             │         │                                        │
│  Upload → Preview → Confirm │  HTTP   │  Parse CSV → Batch → Gemini → Validate  │
│        → Live Results       │ ───────▶│         → Stream results back          │
│                             │ NDJSON  │                                        │
└─────────────────────────────┘         └───────────────────┬────────────────────┘
                                                             │
                                                             ▼
                                                    ┌──────────────────┐
                                                    │  Google Gemini   │
                                                    │ (LLM extraction) │
                                                    └──────────────────┘
```

- The **frontend** parses the CSV in the browser *only* to show an instant preview.
- On **Confirm**, the raw file is uploaded to the backend, which re-parses it
  server-side (the authoritative parse) and runs AI extraction.
- Progress and results **stream back** as newline-delimited JSON (NDJSON) so the
  UI shows a real, per-batch progress bar and incremental results.

---

## 3. Tech stack & rationale

| Layer     | Choice                                   | Why |
| --------- | ---------------------------------------- | --- |
| Frontend  | Next.js (App Router) + React + TypeScript | Modern, fast, type-safe; App Router keeps the page a clean client component. |
| Styling   | Tailwind CSS                             | Rapid, consistent, responsive; easy dark-mode via `class` strategy. |
| Parsing   | PapaParse (client), `csv-parse` (server) | Battle-tested CSV parsers on both ends. |
| Backend   | Node.js + Express + TypeScript           | Matches the assignment stack; minimal, well-understood HTTP layer. |
| AI        | Google Gemini (`@google/genai`)          | Strong structured-output support (JSON schema), fast + free tier. |
| Validation| Zod                                      | Type-safe env parsing and a single source of truth. |
| Testing   | Vitest                                   | Fast, TS-native unit tests. |
| Deploy    | Vercel (frontend) + Render (backend)     | Free tiers, first-class Git integration, matches a split frontend/backend app. |

---

## 4. Repository structure

```
groweasy-csv-importer/
├── backend/
│   └── src/
│       ├── constants/crm.ts          # Single source of truth for the CRM schema + enums
│       ├── config/env.ts             # Zod-validated environment config (fail-fast)
│       ├── prompts/extraction.prompt.ts  # System instruction + per-batch prompt builder
│       ├── services/
│       │   ├── csv.service.ts        # Parse CSV (arbitrary headers) + chunk()
│       │   ├── gemini.service.ts     # Gemini client, JSON-schema constrained call
│       │   ├── validation.service.ts # Enforce enums/dates/skip rules/CSV-safety
│       │   └── extraction.service.ts # Batching + concurrency + retry + progress
│       ├── controllers/import.controller.ts  # Request handling (JSON + streaming)
│       ├── routes/import.routes.ts   # Route definitions + async error wrapper
│       ├── middleware/               # Multer upload + central error handler
│       ├── utils/logger.ts
│       ├── types.ts                  # Shared API types
│       └── index.ts                  # Server bootstrap
├── frontend/
│   ├── app/                          # layout.tsx, page.tsx (state machine), globals.css
│   ├── components/                   # UploadZone, PreviewTable, ResultsView, ProgressBar, StatsCards, ThemeToggle
│   └── lib/                          # api.ts (streaming client), csv.ts, types.ts, constants.ts
├── samples/                          # Example messy CSVs in different formats
├── docker-compose.yml                # Run both services locally in containers
├── render.yaml                       # Render blueprint for the backend
├── README.md                         # Setup & usage
└── DOCUMENTATION.md                  # This file
```

---

## 5. The CRM schema (single source of truth)

Defined once in [`backend/src/constants/crm.ts`](./backend/src/constants/crm.ts) and
mirrored on the frontend. Everything else (prompt text, the LLM response schema,
validation, and the results table) is **derived** from it, so there is no drift.

15 fields: `created_at`, `name`, `email`, `country_code`,
`mobile_without_country_code`, `company`, `city`, `state`, `country`,
`lead_owner`, `crm_status`, `crm_note`, `data_source`, `possession_time`,
`description`.

Constrained enums:

- **`crm_status`** ∈ `GOOD_LEAD_FOLLOW_UP` · `DID_NOT_CONNECT` · `BAD_LEAD` · `SALE_DONE`
- **`data_source`** ∈ `leads_on_demand` · `meridian_tower` · `eden_park` · `varah_swamy` · `sarjapur_plots`

---

## 6. How the AI extraction works

This is the core of the assignment. It is a **two-part strategy: guide the model,
then verify deterministically.**

### 6.1 Prompt engineering
[`prompts/extraction.prompt.ts`](./backend/src/prompts/extraction.prompt.ts)

- A **system instruction** frames the model as a data-mapping engine that maps by
  *meaning*, not by column name (e.g. "Full Name", "Lead Name", "customer" all →
  `name`), and that **never invents data** — unknown fields become `""`.
- A **rulebook** is appended to every batch, encoding all assignment rules:
  status/source enums, `new Date()`-parseable dates, phone splitting
  (country code vs. number), first-email/first-mobile with the rest appended to
  `crm_note`, CSV-safety (escape newlines as `\n`), and the skip rule.
- Rows are sent with a stable `index` so responses can be realigned to inputs.

### 6.2 Structured output
[`services/gemini.service.ts`](./backend/src/services/gemini.service.ts)

Gemini is called with a **response JSON schema** (`responseMimeType:
application/json` + `responseSchema`) that requires an array of objects each
containing **exactly** the 15 fields. This makes malformed output nearly
impossible, and a tolerant parser strips any stray markdown fences as a safety net.

### 6.3 Deterministic validation (the safety net)
[`services/validation.service.ts`](./backend/src/services/validation.service.ts)

Regardless of what the model returns, every record is normalised:

1. Start from an empty record (all 15 fields present as `""`).
2. `crm_status` / `data_source` not in the allowed set → **blanked**.
3. `created_at` not parseable by `new Date()` → **blanked**.
4. Real newlines inside any value → replaced with the literal `\n` (CSV-safe).
5. A record with **neither** email **nor** mobile → **skipped** with a reason.

> Design principle: *trust, but verify the LLM.* The prompt asks the model to
> follow the rules, and this layer guarantees they hold — so a hallucinated status
> or an unparseable date can never leak into the output.

### 6.4 Batching, concurrency, retry
[`services/extraction.service.ts`](./backend/src/services/extraction.service.ts)

- Rows are split into **batches** (default 15).
- Batches run with **bounded concurrency** (default 3) via a small worker pool.
- Each batch is retried up to **3×** with **exponential backoff** (250ms → 500ms → 1s).
- If a batch still fails, **only its rows** are marked skipped (with the error as
  the reason) — the rest of the import always completes.
- Results are collected per-batch index so the final output preserves CSV order,
  while incremental events can stream as each batch finishes.

---

## 7. API reference

Base URL (production): `https://groweasy-csv-importer-api-5g6v.onrender.com`

| Method | Endpoint             | Description |
| ------ | -------------------- | ----------- |
| GET    | `/health`            | Liveness check → `{ status, model }` |
| POST   | `/api/import`        | Multipart `file` (CSV) → full JSON `ImportResult` |
| POST   | `/api/import/stream` | Same input → **NDJSON** stream of progress events |

### `ImportResult`
```jsonc
{
  "records":       [ /* CrmRecord[] — 15 fields each */ ],
  "skipped":       [ { "row": 5, "reason": "No email or mobile number found.", "data": {…} } ],
  "totalImported": 4,
  "totalSkipped":  1,
  "totalRows":     5
}
```

### Streaming events (NDJSON, one JSON object per line)
```
{ "type": "start",    "totalRows": 5, "totalBatches": 1 }
{ "type": "records",  "records": [ … ] }
{ "type": "skipped",  "skipped": [ … ] }
{ "type": "progress", "processedRows": 5, "totalRows": 5, "batch": 1, "totalBatches": 1 }
{ "type": "done",     "result": { …ImportResult } }
```

### Example
```bash
curl -X POST https://groweasy-csv-importer-api-5g6v.onrender.com/api/import \
  -F "file=@samples/real_estate_crm.csv"
```

---

## 8. Frontend flow
[`frontend/app/page.tsx`](./frontend/app/page.tsx)

A 4-step state machine: **upload → preview → processing → results**.

1. **Upload** — drag & drop or file picker ([`UploadZone`](./frontend/components/UploadZone.tsx)).
2. **Preview** — client-side parse (PapaParse) into a responsive table with sticky
   headers and horizontal/vertical scroll ([`PreviewTable`](./frontend/components/PreviewTable.tsx)).
   *No AI runs yet.*
3. **Processing** — on **Confirm**, the file streams to the backend; a real progress
   bar and live stat cards update from NDJSON events ([`ProgressBar`](./frontend/components/ProgressBar.tsx),
   [`StatsCards`](./frontend/components/StatsCards.tsx)).
4. **Results** — imported records (with colour-coded status badges) and skipped rows
   with reasons, in tabs, plus **Download CSV** ([`ResultsView`](./frontend/components/ResultsView.tsx)).

The streaming client ([`lib/api.ts`](./frontend/lib/api.ts)) reads the fetch response
body as a stream and dispatches each NDJSON line as a typed event.

---

## 9. Reliability & error handling

- **Env validation** — the server fails fast at boot if config is invalid (Zod).
- **Upload guards** — Multer restricts to `.csv` and a max file size.
- **CSV robustness** — blank/duplicate headers are auto-named/de-duplicated; ragged
  rows are tolerated; fully-empty rows are dropped.
- **Per-batch isolation** — one bad batch never fails the whole import.
- **Central error handler** — all thrown errors become clean JSON responses.
- **CORS** — restricted to the configured frontend origin(s).

---

## 10. Testing
[`backend/src/services/*.test.ts`](./backend/src/services)

Vitest unit tests cover the deterministic core:
- CSV parsing (arbitrary/blank/duplicate headers, empty-row dropping, chunking).
- Validation rules (enum whitelisting, date parseability, newline escaping,
  skip-if-no-contact, correct row numbering).

```bash
cd backend && npm test
```

---

## 11. Configuration

Backend (`backend/.env`, see `.env.example`):

| Variable            | Default            | Description |
| ------------------- | ------------------ | ----------- |
| `PORT`              | `4000`             | API port |
| `CORS_ORIGIN`       | `http://localhost:3000` | Comma-separated allowed origins |
| `GEMINI_API_KEY`    | —                  | **Required** Gemini key |
| `GEMINI_MODEL`      | `gemini-2.5-flash` | Extraction model |
| `BATCH_SIZE`        | `15`               | Rows per LLM request |
| `BATCH_CONCURRENCY` | `3`                | Batches in parallel |
| `MAX_RETRIES`       | `3`                | Retries per failed batch |
| `MAX_FILE_SIZE_MB`  | `10`               | Upload limit |

Frontend: `NEXT_PUBLIC_API_BASE_URL` → backend base URL (baked in at build time).

---

## 12. Deployment

- **Backend → Render** using [`render.yaml`](./render.yaml). Set `GEMINI_API_KEY`
  and `CORS_ORIGIN` in the dashboard.
- **Frontend → Vercel** with Root Directory = `frontend` and
  `NEXT_PUBLIC_API_BASE_URL` = the Render URL.
- **Docker** — `docker-compose.yml` + Dockerfiles run both services locally.

> Note: Render's free tier sleeps after ~15 min idle, so the first request after a
> nap takes ~30–40s to wake; subsequent requests are fast.

---

## 13. Key design decisions (summary)

1. **Server-side parse is authoritative** — the browser parse is only for preview,
   so results never depend on client behaviour.
2. **Constrain the model, then verify** — JSON-schema output + a deterministic
   validation layer guarantees the business rules regardless of the LLM.
3. **Resilient batching** — concurrency for speed, retry/backoff for transient
   failures, per-batch skip so an import never fully fails.
4. **Streaming over polling** — progress is real, derived from actual batch
   completions, not a fake timer.
5. **Single source of truth** — the CRM schema is defined once and everything is
   derived from it, eliminating drift between prompt, validation, and UI.
