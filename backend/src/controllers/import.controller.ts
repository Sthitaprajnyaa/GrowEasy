import type { Request, Response } from "express";
import { parseCsv } from "../services/csv.service.js";
import { extractRecords } from "../services/extraction.service.js";
import type { StreamEvent } from "../types.js";
import { logger } from "../utils/logger.js";

/** Read CSV text from either an uploaded file or a raw `csv` JSON field. */
function getCsvInput(req: Request): string | Buffer | null {
  if (req.file?.buffer) return req.file.buffer;
  const body = req.body as { csv?: unknown } | undefined;
  if (body && typeof body.csv === "string" && body.csv.trim()) return body.csv;
  return null;
}

/**
 * POST /api/import
 * Parse the CSV, run AI extraction, and return the full result as JSON.
 */
export async function importCsv(req: Request, res: Response): Promise<void> {
  const input = getCsvInput(req);
  if (!input) {
    res.status(400).json({ error: "No CSV provided. Upload a file or send a `csv` field." });
    return;
  }

  const rows = parseCsv(input);
  logger.info(`Parsed ${rows.length} rows; starting extraction`);
  const result = await extractRecords(rows);
  logger.info(`Extraction complete: ${result.totalImported} imported, ${result.totalSkipped} skipped`);
  res.json(result);
}

/**
 * POST /api/import/stream
 * Same as importCsv but streams NDJSON progress events so the client can show a
 * live progress bar and incremental results.
 */
export async function importCsvStream(req: Request, res: Response): Promise<void> {
  const input = getCsvInput(req);
  if (!input) {
    res.status(400).json({ error: "No CSV provided. Upload a file or send a `csv` field." });
    return;
  }

  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const send = (event: StreamEvent) => {
    res.write(JSON.stringify(event) + "\n");
  };

  try {
    const rows = parseCsv(input);
    logger.info(`[stream] Parsed ${rows.length} rows; starting extraction`);
    await extractRecords(rows, send);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Extraction failed";
    logger.error("[stream] Import failed", message);
    send({ type: "error", message });
  } finally {
    res.end();
  }
}
