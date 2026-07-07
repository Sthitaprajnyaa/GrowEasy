import type { CrmRecord } from "./constants/crm.js";

/** A raw CSV row keyed by its original (arbitrary) column headers. */
export type RawRow = Record<string, string>;

/** A record that was intentionally dropped, with the reason why. */
export interface SkippedRecord {
  /** 1-based row number in the original CSV (excluding the header row). */
  row: number;
  reason: string;
  data?: RawRow;
}

/** Final aggregated result returned by the import endpoint. */
export interface ImportResult {
  records: CrmRecord[];
  skipped: SkippedRecord[];
  totalImported: number;
  totalSkipped: number;
  totalRows: number;
}

/** Events emitted over the streaming (NDJSON) endpoint. */
export type StreamEvent =
  | { type: "start"; totalRows: number; totalBatches: number }
  | { type: "progress"; processedRows: number; totalRows: number; batch: number; totalBatches: number }
  | { type: "records"; records: CrmRecord[] }
  | { type: "skipped"; skipped: SkippedRecord[] }
  | { type: "done"; result: ImportResult }
  | { type: "error"; message: string };
