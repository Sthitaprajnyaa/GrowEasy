import {
  CRM_FIELDS,
  CRM_STATUS_VALUES,
  DATA_SOURCE_VALUES,
  emptyRecord,
  type CrmRecord,
  type CrmStatus,
  type DataSource,
} from "../constants/crm.js";
import type { RawRow, SkippedRecord } from "../types.js";

const STATUS_SET = new Set<string>(CRM_STATUS_VALUES);
const SOURCE_SET = new Set<string>(DATA_SOURCE_VALUES);

/**
 * Turn one loosely-typed LLM object into a clean CrmRecord. This is the safety
 * net that enforces the assignment rules regardless of what the model returned:
 * enum whitelisting, date parseability, and CSV-safe single-line values.
 */
export function normaliseRecord(raw: Record<string, unknown>): CrmRecord {
  const record = emptyRecord();

  for (const field of CRM_FIELDS) {
    record[field] = toCleanString(raw[field]);
  }

  // Enforce allowed enums — anything outside the whitelist is blanked.
  if (!STATUS_SET.has(record.crm_status)) {
    record.crm_status = "";
  } else {
    record.crm_status = record.crm_status as CrmStatus;
  }

  if (!SOURCE_SET.has(record.data_source)) {
    record.data_source = "";
  } else {
    record.data_source = record.data_source as DataSource;
  }

  // created_at must be parseable by `new Date()`; blank it otherwise.
  if (record.created_at && Number.isNaN(new Date(record.created_at).getTime())) {
    record.created_at = "";
  }

  return record;
}

/** True when a record has no way to be contacted (no email and no mobile). */
export function isContactable(record: CrmRecord): boolean {
  return Boolean(record.email.trim() || record.mobile_without_country_code.trim());
}

export interface ValidatedBatch {
  records: CrmRecord[];
  skipped: SkippedRecord[];
}

/**
 * Validate a batch of model outputs against the originating raw rows.
 * `rowOffset` is the 1-based row number of the first row in this batch.
 */
export function validateBatch(
  modelOutputs: Record<string, unknown>[],
  originalRows: RawRow[],
  rowOffset: number
): ValidatedBatch {
  const records: CrmRecord[] = [];
  const skipped: SkippedRecord[] = [];

  originalRows.forEach((originalRow, i) => {
    const rowNumber = rowOffset + i;
    const modelOutput = modelOutputs[i];

    if (!modelOutput || typeof modelOutput !== "object") {
      skipped.push({ row: rowNumber, reason: "No AI output for this row.", data: originalRow });
      return;
    }

    const record = normaliseRecord(modelOutput);

    if (!isContactable(record)) {
      skipped.push({
        row: rowNumber,
        reason: "No email or mobile number found.",
        data: originalRow,
      });
      return;
    }

    records.push(record);
  });

  return { records, skipped };
}

/** Coerce an unknown value to a trimmed, CSV-safe single-line string. */
function toCleanString(value: unknown): string {
  if (value == null) return "";
  const str = typeof value === "string" ? value : String(value);
  // Collapse real line breaks into the literal escape sequence so each record
  // stays a single CSV row (assignment rule #6).
  return str.replace(/\r\n|\r|\n/g, "\\n").trim();
}
