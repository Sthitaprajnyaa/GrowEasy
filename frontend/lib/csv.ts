import Papa from "papaparse";
import { CRM_FIELDS } from "./constants";
import type { CrmRecord, CsvPreview } from "./types";

/**
 * Parse a File into a preview (headers + rows) entirely in the browser.
 * This is only used for the on-screen preview — no AI runs here.
 */
export function parseCsvFile(file: File): Promise<CsvPreview> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h, i) => (h?.trim() ? h.trim() : `column_${i + 1}`),
      complete: (results) => {
        const rows = (results.data || []).filter((r) =>
          Object.values(r).some((v) => (v ?? "").toString().trim() !== "")
        );
        const headers =
          results.meta.fields?.filter(Boolean) ??
          (rows[0] ? Object.keys(rows[0]) : []);
        resolve({
          headers,
          rows,
          totalRows: rows.length,
          fileName: file.name,
        });
      },
      error: (err) => reject(err),
    });
  });
}

/** Serialise extracted CRM records back into a downloadable CSV string. */
export function recordsToCsv(records: CrmRecord[]): string {
  return Papa.unparse({
    fields: [...CRM_FIELDS],
    data: records.map((r) => CRM_FIELDS.map((f) => r[f] ?? "")),
  });
}

/** Trigger a browser download of a text file. */
export function downloadTextFile(content: string, fileName: string, mime = "text/csv") {
  const blob = new Blob([content], { type: `${mime};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
