"use client";

import { CheckCircle2, Database, ListChecks, XCircle } from "lucide-react";

interface StatsCardsProps {
  totalRows: number;
  imported: number;
  skipped: number;
}

/** Summary cards: total rows, imported, skipped. */
export default function StatsCards({ totalRows, imported, skipped }: StatsCardsProps) {
  const cards = [
    {
      label: "Total Rows",
      value: totalRows,
      icon: Database,
      accent: "text-slate-600 dark:text-slate-300",
      ring: "bg-slate-100 dark:bg-slate-800",
    },
    {
      label: "Imported",
      value: imported,
      icon: CheckCircle2,
      accent: "text-emerald-600 dark:text-emerald-400",
      ring: "bg-emerald-100 dark:bg-emerald-500/15",
    },
    {
      label: "Skipped",
      value: skipped,
      icon: XCircle,
      accent: "text-rose-600 dark:text-rose-400",
      ring: "bg-rose-100 dark:bg-rose-500/15",
    },
    {
      label: "Success Rate",
      value: totalRows ? `${Math.round((imported / totalRows) * 100)}%` : "—",
      icon: ListChecks,
      accent: "text-brand-600 dark:text-brand-400",
      ring: "bg-brand-100 dark:bg-brand-500/15",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="animate-fade-in rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {c.label}
            </span>
            <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${c.ring}`}>
              <c.icon className={`h-4 w-4 ${c.accent}`} />
            </span>
          </div>
          <p className={`mt-2 text-2xl font-bold ${c.accent}`}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}
