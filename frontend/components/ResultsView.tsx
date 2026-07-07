"use client";

import { useState } from "react";
import { CRM_FIELDS, CRM_FIELD_LABELS, STATUS_STYLES } from "@/lib/constants";
import type { CrmRecord, SkippedRecord } from "@/lib/types";

interface ResultsViewProps {
  records: CrmRecord[];
  skipped: SkippedRecord[];
}

/** Tabbed results: imported CRM records + skipped rows with reasons. */
export default function ResultsView({ records, skipped }: ResultsViewProps) {
  const [tab, setTab] = useState<"imported" | "skipped">("imported");

  return (
    <div className="animate-fade-in">
      <div className="mb-4 inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1 text-sm dark:border-slate-800 dark:bg-slate-800/60">
        <TabButton active={tab === "imported"} onClick={() => setTab("imported")}>
          Imported ({records.length})
        </TabButton>
        <TabButton active={tab === "skipped"} onClick={() => setTab("skipped")}>
          Skipped ({skipped.length})
        </TabButton>
      </div>

      {tab === "imported" ? (
        <RecordsTable records={records} />
      ) : (
        <SkippedTable skipped={skipped} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-md px-3 py-1.5 font-medium transition",
        active
          ? "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white"
          : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function RecordsTable({ records }: { records: CrmRecord[] }) {
  if (records.length === 0) {
    return <EmptyState message="No records were imported." />;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="scrollbar-thin max-h-[32rem] overflow-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-slate-100 text-xs uppercase tracking-wide text-slate-600 shadow-sm dark:bg-slate-800 dark:text-slate-300">
            <tr>
              <th className="sticky left-0 z-20 bg-slate-100 px-4 py-3 font-semibold dark:bg-slate-800">
                #
              </th>
              {CRM_FIELDS.map((f) => (
                <th key={f} className="whitespace-nowrap px-4 py-3 font-semibold">
                  {CRM_FIELD_LABELS[f]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {records.map((rec, i) => (
              <tr key={i} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="sticky left-0 z-10 bg-white px-4 py-2.5 font-mono text-xs text-slate-400 dark:bg-slate-900 dark:text-slate-500">
                  {i + 1}
                </td>
                {CRM_FIELDS.map((f) => (
                  <td
                    key={f}
                    className="max-w-[16rem] truncate px-4 py-2.5 text-slate-700 dark:text-slate-200"
                    title={rec[f]}
                  >
                    {f === "crm_status" && rec[f] ? (
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                          STATUS_STYLES[rec[f]] ?? "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {rec[f]}
                      </span>
                    ) : (
                      rec[f] || <span className="text-slate-300 dark:text-slate-600">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SkippedTable({ skipped }: { skipped: SkippedRecord[] }) {
  if (skipped.length === 0) {
    return <EmptyState message="No rows were skipped. 🎉" />;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="scrollbar-thin max-h-[32rem] overflow-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-slate-100 text-xs uppercase tracking-wide text-slate-600 shadow-sm dark:bg-slate-800 dark:text-slate-300">
            <tr>
              <th className="px-4 py-3 font-semibold">Row</th>
              <th className="px-4 py-3 font-semibold">Reason</th>
              <th className="px-4 py-3 font-semibold">Original Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {skipped.map((s, i) => (
              <tr key={i} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="px-4 py-2.5 font-mono text-xs text-slate-500 dark:text-slate-400">
                  {s.row}
                </td>
                <td className="px-4 py-2.5 text-rose-600 dark:text-rose-400">{s.reason}</td>
                <td className="max-w-[28rem] truncate px-4 py-2.5 text-slate-500 dark:text-slate-400">
                  {s.data ? Object.values(s.data).filter(Boolean).join(" · ") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
      {message}
    </div>
  );
}
