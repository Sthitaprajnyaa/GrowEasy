import { parse } from "csv-parse/sync";
import type { RawRow } from "../types.js";

export class CsvParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CsvParseError";
  }
}

/**
 * Parse a CSV buffer/string into an array of rows keyed by their original
 * headers. We deliberately keep every column as a trimmed string and make no
 * assumptions about which columns exist — that mapping is the AI's job.
 */
export function parseCsv(input: string | Buffer): RawRow[] {
  const text = typeof input === "string" ? input : input.toString("utf-8");

  if (!text.trim()) {
    throw new CsvParseError("The uploaded file is empty.");
  }

  let rows: Record<string, unknown>[];
  try {
    rows = parse(text, {
      columns: (header: string[]) => normaliseHeaders(header),
      skip_empty_lines: true,
      relax_column_count: true, // tolerate ragged rows instead of throwing
      trim: true,
      bom: true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown parse error";
    throw new CsvParseError(`Could not parse CSV: ${message}`);
  }

  if (rows.length === 0) {
    throw new CsvParseError("No data rows found in the CSV (only a header?).");
  }

  // Coerce every cell to a trimmed string and drop fully-empty rows.
  const cleaned: RawRow[] = [];
  for (const row of rows) {
    const entry: RawRow = {};
    let hasValue = false;
    for (const [key, value] of Object.entries(row)) {
      const str = value == null ? "" : String(value).trim();
      entry[key] = str;
      if (str) hasValue = true;
    }
    if (hasValue) cleaned.push(entry);
  }

  if (cleaned.length === 0) {
    throw new CsvParseError("The CSV contains headers but no non-empty rows.");
  }

  return cleaned;
}

/**
 * De-duplicate blank/duplicate headers so downstream keying is stable.
 * Blank headers become `column_1`, `column_2`, ...; duplicates get a suffix.
 */
function normaliseHeaders(header: string[]): string[] {
  const seen = new Map<string, number>();
  return header.map((raw, index) => {
    let name = (raw ?? "").trim();
    if (!name) name = `column_${index + 1}`;
    const count = seen.get(name) ?? 0;
    seen.set(name, count + 1);
    return count === 0 ? name : `${name}_${count + 1}`;
  });
}

/** Split an array into fixed-size chunks. */
export function chunk<T>(items: T[], size: number): T[][] {
  if (size <= 0) throw new Error("chunk size must be > 0");
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}
