"use client";

import { Loader2 } from "lucide-react";

interface ProgressBarProps {
  processed: number;
  total: number;
  batch: number;
  totalBatches: number;
}

/** Determinate progress bar shown while AI extraction is running. */
export default function ProgressBar({ processed, total, batch, totalBatches }: ProgressBarProps) {
  const pct = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 0;

  return (
    <div className="card animate-fade-in p-6">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
          AI is extracting CRM records…
        </div>
        <span className="text-sm font-semibold text-brand-600 dark:text-brand-400">{pct}%</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>
          {processed} / {total} rows
        </span>
        <span>
          Batch {batch} / {totalBatches}
        </span>
      </div>
    </div>
  );
}
