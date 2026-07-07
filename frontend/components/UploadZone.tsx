"use client";

import { FileText, UploadCloud } from "lucide-react";
import { useCallback, useRef, useState } from "react";

interface UploadZoneProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

/** Drag & drop + click-to-browse CSV upload area. */
export default function UploadZone({ onFileSelected, disabled }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      setError(null);
      const file = files?.[0];
      if (!file) return;
      const isCsv =
        file.name.toLowerCase().endsWith(".csv") ||
        ["text/csv", "application/vnd.ms-excel", "text/plain"].includes(file.type);
      if (!isCsv) {
        setError("Please upload a .csv file.");
        return;
      }
      onFileSelected(file);
    },
    [onFileSelected]
  );

  return (
    <div className="animate-fade-in">
      <div
        role="button"
        tabIndex={0}
        aria-disabled={disabled}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled) inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!disabled) handleFiles(e.dataTransfer.files);
        }}
        className={[
          "group relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed px-6 py-16 text-center shadow-sm transition duration-200",
          dragOver
            ? "scale-[1.01] border-brand-500 bg-brand-50 shadow-brand-500/10 dark:border-brand-400 dark:bg-brand-500/10"
            : "border-slate-300 bg-white/80 backdrop-blur hover:-translate-y-0.5 hover:border-brand-400 hover:bg-brand-50/40 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/60 dark:hover:border-brand-500 dark:hover:bg-slate-800/50",
          disabled ? "pointer-events-none opacity-60" : "",
        ].join(" ")}
      >
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-100 to-brand-200 text-brand-600 shadow-inner transition duration-200 group-hover:scale-110 group-hover:rotate-3 dark:from-brand-500/20 dark:to-brand-500/5 dark:text-brand-300">
          <UploadCloud className="h-7 w-7" />
        </div>
        <p className="text-base font-semibold text-slate-800 dark:text-slate-100">
          Drag & drop your CSV here
        </p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          or <span className="font-medium text-brand-600 dark:text-brand-400">browse</span> to
          choose a file
        </p>
        <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
          <FileText className="h-3.5 w-3.5" />
          Any CSV layout — Facebook, Google Ads, Excel, CRM exports…
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {error && (
        <p className="mt-3 text-center text-sm font-medium text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
}
