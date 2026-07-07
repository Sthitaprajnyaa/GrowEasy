import { env } from "../config/env.js";
import type { CrmRecord } from "../constants/crm.js";
import type { ImportResult, RawRow, SkippedRecord, StreamEvent } from "../types.js";
import { logger } from "../utils/logger.js";
import { chunk } from "./csv.service.js";
import { extractBatch } from "./gemini.service.js";
import { validateBatch } from "./validation.service.js";

/** Sleep helper for backoff. */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Extract CRM records from parsed CSV rows.
 *
 * Rows are split into batches and sent to the LLM with bounded concurrency.
 * Each batch is retried with exponential backoff; a batch that still fails has
 * all of its rows recorded as skipped rather than failing the whole import.
 *
 * `onEvent` receives streaming progress so the caller can forward it to the
 * client (used by the NDJSON endpoint). It is optional for the plain endpoint.
 */
export async function extractRecords(
  rows: RawRow[],
  onEvent?: (event: StreamEvent) => void
): Promise<ImportResult> {
  const batches = chunk(rows, env.BATCH_SIZE);
  const totalBatches = batches.length;
  const totalRows = rows.length;

  onEvent?.({ type: "start", totalRows, totalBatches });

  // Per-batch results, kept indexed so the final output preserves CSV order.
  const batchRecords: CrmRecord[][] = new Array(totalBatches).fill(null).map(() => []);
  const batchSkipped: SkippedRecord[][] = new Array(totalBatches).fill(null).map(() => []);

  let processedRows = 0;
  let completedBatches = 0;

  const runBatch = async (batchIndex: number): Promise<void> => {
    const batchRows = batches[batchIndex]!;
    const rowOffset = batchIndex * env.BATCH_SIZE + 1; // 1-based

    try {
      const modelOutputs = await withRetry(
        () => extractBatch(batchRows),
        env.MAX_RETRIES,
        batchIndex
      );
      const { records, skipped } = validateBatch(modelOutputs, batchRows, rowOffset);
      batchRecords[batchIndex] = records;
      batchSkipped[batchIndex] = skipped;

      if (records.length) onEvent?.({ type: "records", records });
      if (skipped.length) onEvent?.({ type: "skipped", skipped });
    } catch (err) {
      // Batch failed even after retries — skip its rows, keep the import alive.
      const message = err instanceof Error ? err.message : "Unknown extraction error";
      logger.error(`Batch ${batchIndex + 1}/${totalBatches} failed permanently`, message);
      const skipped: SkippedRecord[] = batchRows.map((data, i) => ({
        row: rowOffset + i,
        reason: `AI extraction failed for this batch: ${message}`,
        data,
      }));
      batchSkipped[batchIndex] = skipped;
      onEvent?.({ type: "skipped", skipped });
    } finally {
      completedBatches += 1;
      processedRows += batchRows.length;
      onEvent?.({
        type: "progress",
        processedRows,
        totalRows,
        batch: completedBatches,
        totalBatches,
      });
    }
  };

  await runWithConcurrency(
    batches.map((_, i) => i),
    env.BATCH_CONCURRENCY,
    runBatch
  );

  const records = batchRecords.flat();
  const skipped = batchSkipped.flat();

  const result: ImportResult = {
    records,
    skipped,
    totalImported: records.length,
    totalSkipped: skipped.length,
    totalRows,
  };

  onEvent?.({ type: "done", result });
  return result;
}

/** Retry an async op with exponential backoff (250ms, 500ms, 1s, ...). */
async function withRetry<T>(fn: () => Promise<T>, maxRetries: number, batchIndex: number): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        const delay = 250 * 2 ** attempt;
        logger.warn(
          `Batch ${batchIndex + 1} attempt ${attempt + 1} failed; retrying in ${delay}ms`
        );
        await sleep(delay);
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/** Run tasks with a fixed concurrency limit (simple worker pool). */
async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) {
      const item = queue.shift()!;
      await worker(item);
    }
  });
  await Promise.all(workers);
}
