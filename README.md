# GrowEasy — AI-Powered CSV Importer

Upload a lead CSV in **any** format — Facebook Lead Ads, Google Ads, Excel, a real-estate
CRM export, a marketing-agency dump, or a hand-made spreadsheet — and an LLM intelligently
maps the arbitrary columns into GrowEasy's fixed CRM schema.

> The hard part isn't parsing CSV. It's handling the *infinite variety* of column names,
> layouts, and structures that real exports come in. That mapping is done by AI, guided by
> a carefully engineered prompt and backed by a deterministic validation layer.

**Position applied for:** Software Developer Intern

---

## ✨ Features

**Core**
- Upload any valid CSV — no assumptions about column names or order
- Client-side preview in a responsive table (sticky headers, horizontal + vertical scroll)
- Explicit **Confirm** step — AI only runs after the user confirms
- AI extraction into the 15-field GrowEasy CRM schema
- Structured JSON results: imported records, skipped rows (with reasons), and totals
- Deterministic post-processing that **enforces** the assignment rules regardless of model output

**Bonus / extras**
- 🖱️ Drag & drop upload
- 📊 Real per-batch **progress bar** via streaming NDJSON (not a fake spinner)
- 🔁 **Retry with exponential backoff** for failed AI batches — a bad batch is skipped, never crashes the import
- ⚡ **Batch processing** with bounded concurrency
- 🌙 **Dark mode** (system-aware, persisted)
- ⬇️ **Download** the extracted records as a clean CRM CSV
- 🧪 **Unit tests** (Vitest) for CSV parsing and validation
- 🐳 **Docker** + `docker-compose` for both services
- ☁️ Deploy configs (Render blueprint + Vercel instructions)
- 🔒 Full **TypeScript** on both frontend and backend

---

## 🏗️ Architecture

```
groweasy-csv-importer/
├── backend/                 # Node + Express + TypeScript API
│   └── src/
│       ├── constants/crm.ts        # Single source of truth for the CRM schema
│       ├── prompts/                # AI prompt engineering (system + per-batch)
│       ├── services/
│       │   ├── csv.service.ts      # CSV parsing (arbitrary headers, chunking)
│       │   ├── gemini.service.ts   # Gemini client + JSON-schema constrained output
│       │   ├── validation.service.ts # Enforces enums, dates, skip rules, CSV-safety
│       │   └── extraction.service.ts # Batching + concurrency + retry + progress
│       ├── controllers/ routes/ middleware/
│       └── index.ts
├── frontend/                # Next.js (App Router) + TypeScript + Tailwind
│   ├── app/                 # Layout + main stateful page (upload→preview→extract→results)
│   ├── components/          # UploadZone, PreviewTable, ResultsView, ProgressBar, StatsCards…
│   └── lib/                 # API client (streaming), CSV helpers, types, constants
├── samples/                 # Example messy CSVs in different formats
├── docker-compose.yml
└── render.yaml
```

### How the AI mapping works

1. The backend parses the CSV **server-side** (the source of truth) into rows keyed by their
   original, arbitrary headers.
2. Rows are split into **batches** (default 15) and sent to Gemini concurrently (default 3 at
   a time), each batch retried up to 3× with exponential backoff.
3. Gemini is constrained with a **response JSON schema** so it must return one object per row
   containing exactly the 15 CRM fields — mapping *by meaning*, not by column name.
4. Every model response passes through a **validation layer** that guarantees the assignment
   rules hold no matter what the model returns:
   - `crm_status` / `data_source` outside the allowed enums → blanked
   - `created_at` not parseable by `new Date()` → blanked
   - real newlines inside values → escaped to `\n` (CSV-safe single rows)
   - rows with **neither email nor mobile** → skipped with a reason
5. Progress and incremental results **stream** to the browser as NDJSON.

---

## 🚀 Getting Started (Local)

### Prerequisites
- Node.js **18.17+** (Node 20 recommended)
- A **Google Gemini API key** — free at <https://aistudio.google.com/app/apikey>

### 1. Backend

```bash
cd backend
cp .env.example .env        # then edit .env and set GEMINI_API_KEY
npm install
npm run dev                 # http://localhost:4000  (health: /health)
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env.local  # defaults to http://localhost:4000
npm install
npm run dev                 # http://localhost:3000
```

Open <http://localhost:3000>, drag in a file from [`samples/`](./samples), and click
**Confirm & Import**.

### With Docker

```bash
# from the repo root, with GEMINI_API_KEY exported in your shell
GEMINI_API_KEY=your_key docker compose up --build
# frontend → http://localhost:3000   backend → http://localhost:4000
```

---

## 🔌 API

Base URL: `http://localhost:4000`

| Method | Endpoint             | Description                                         |
| ------ | -------------------- | --------------------------------------------------- |
| GET    | `/health`            | Liveness check `{ status, model }`                  |
| POST   | `/api/import`        | Multipart `file` (CSV) → full JSON `ImportResult`   |
| POST   | `/api/import/stream` | Same input → **NDJSON** stream of progress events   |

`ImportResult`:

```jsonc
{
  "records":       [ /* CrmRecord[] — 15 fields each */ ],
  "skipped":       [ { "row": 5, "reason": "No email or mobile number found.", "data": {…} } ],
  "totalImported": 42,
  "totalSkipped":  3,
  "totalRows":     45
}
```

Example:

```bash
curl -X POST http://localhost:4000/api/import \
  -F "file=@samples/real_estate_crm.csv"
```

---

## 🧬 CRM Schema

`created_at`, `name`, `email`, `country_code`, `mobile_without_country_code`, `company`,
`city`, `state`, `country`, `lead_owner`, `crm_status`, `crm_note`, `data_source`,
`possession_time`, `description`.

- **`crm_status`** ∈ `GOOD_LEAD_FOLLOW_UP` · `DID_NOT_CONNECT` · `BAD_LEAD` · `SALE_DONE`
- **`data_source`** ∈ `leads_on_demand` · `meridian_tower` · `eden_park` · `varah_swamy` · `sarjapur_plots`

---

## ⚙️ Configuration (backend `.env`)

| Variable            | Default            | Description                                  |
| ------------------- | ------------------ | -------------------------------------------- |
| `PORT`              | `4000`             | API port                                     |
| `CORS_ORIGIN`       | `http://localhost:3000` | Comma-separated allowed origins         |
| `GEMINI_API_KEY`    | —                  | **Required.** Your Gemini API key            |
| `GEMINI_MODEL`      | `gemini-2.5-flash` | Model used for extraction                    |
| `BATCH_SIZE`        | `15`               | Rows per LLM request                         |
| `BATCH_CONCURRENCY` | `3`                | Batches processed in parallel                |
| `MAX_RETRIES`       | `3`                | Retry attempts per failed batch              |
| `MAX_FILE_SIZE_MB`  | `10`               | Upload size limit                            |

Frontend uses `NEXT_PUBLIC_API_BASE_URL` (see `frontend/.env.example`).

---

## 🧪 Tests

```bash
cd backend && npm test      # Vitest — CSV parsing + validation rules
```

---

## ☁️ Deployment

**Backend → Render** (blueprint included):
1. Push this repo to GitHub.
2. On Render: **New + → Blueprint**, select the repo (uses [`render.yaml`](./render.yaml)).
3. Set `GEMINI_API_KEY` and `CORS_ORIGIN` (your frontend URL) in the dashboard.

**Frontend → Vercel**:
1. Import the repo on Vercel and set the **root directory** to `frontend`.
2. Add env var `NEXT_PUBLIC_API_BASE_URL` = your deployed backend URL.
3. Deploy. Then update the backend's `CORS_ORIGIN` to the Vercel URL.

---

## 🛠️ Tech Stack

**Frontend:** Next.js (App Router) · React · TypeScript · Tailwind CSS · PapaParse · lucide-react
**Backend:** Node.js · Express · TypeScript · `@google/genai` (Gemini) · Zod · Multer · csv-parse
**Tooling:** Vitest · Docker

---

## 📝 Notes & Design Decisions

- **Server-side parsing is authoritative.** The browser parse is only for the instant preview;
  the backend re-parses so results never depend on client behaviour.
- **Trust, but verify the LLM.** The prompt asks the model to follow every rule, *and* a
  deterministic layer re-enforces them — so a hallucinated status or an unparseable date can
  never leak into the output.
- **Resilient batching.** One failed batch (rate limit, transient error) is retried and, if it
  still fails, its rows are reported as skipped — the rest of the import always completes.
- **Streaming over polling.** Progress is real, derived from actual batch completions.
