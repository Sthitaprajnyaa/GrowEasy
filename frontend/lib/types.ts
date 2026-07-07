import type { CrmField } from "./constants";

export type CrmRecord = Record<CrmField, string>;

export interface SkippedRecord {
  row: number;
  reason: string;
  data?: Record<string, string>;
}

export interface ImportResult {
  records: CrmRecord[];
  skipped: SkippedRecord[];
  totalImported: number;
  totalSkipped: number;
  totalRows: number;
}

/** Streaming events emitted by the backend NDJSON endpoint. */
export type StreamEvent =
  | { type: "start"; totalRows: number; totalBatches: number }
  | {
      type: "progress";
      processedRows: number;
      totalRows: number;
      batch: number;
      totalBatches: number;
    }
  | { type: "records"; records: CrmRecord[] }
  | { type: "skipped"; skipped: SkippedRecord[] }
  | { type: "done"; result: ImportResult }
  | { type: "error"; message: string };

/** Client-side representation of the parsed CSV preview. */
export interface CsvPreview {
  headers: string[];
  rows: Record<string, string>[];
  totalRows: number;
  fileName: string;
}
