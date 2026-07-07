"use client";

interface PreviewTableProps {
  headers: string[];
  rows: Record<string, string>[];
  maxRows?: number;
}

/**
 * Responsive preview of the raw uploaded CSV. Sticky header, both-axis scroll.
 * Renders at most `maxRows` for performance; the full file is still sent to AI.
 */
export default function PreviewTable({ headers, rows, maxRows = 50 }: PreviewTableProps) {
  const visible = rows.slice(0, maxRows);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="scrollbar-thin max-h-[28rem] overflow-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-slate-100 text-xs uppercase tracking-wide text-slate-600 shadow-sm dark:bg-slate-800 dark:text-slate-300">
            <tr>
              <th className="sticky left-0 z-20 whitespace-nowrap bg-slate-100 px-4 py-3 font-semibold dark:bg-slate-800">
                #
              </th>
              {headers.map((h) => (
                <th key={h} className="whitespace-nowrap px-4 py-3 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {visible.map((row, i) => (
              <tr
                key={i}
                className="transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <td className="sticky left-0 z-10 bg-white px-4 py-2.5 font-mono text-xs text-slate-400 group-hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-500">
                  {i + 1}
                </td>
                {headers.map((h) => (
                  <td
                    key={h}
                    className="max-w-[16rem] truncate px-4 py-2.5 text-slate-700 dark:text-slate-200"
                    title={row[h] ?? ""}
                  >
                    {row[h] ?? ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > maxRows && (
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-2 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
          Showing first {maxRows} of {rows.length} rows — all rows will be processed.
        </div>
      )}
    </div>
  );
}
