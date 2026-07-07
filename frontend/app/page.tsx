"use client";

import {
  ArrowRight,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  RotateCcw,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { useCallback, useState } from "react";
import PreviewTable from "@/components/PreviewTable";
import ProgressBar from "@/components/ProgressBar";
import ResultsView from "@/components/ResultsView";
import StatsCards from "@/components/StatsCards";
import ThemeToggle from "@/components/ThemeToggle";
import UploadZone from "@/components/UploadZone";
import { importCsvStream } from "@/lib/api";
import { downloadTextFile, parseCsvFile, recordsToCsv } from "@/lib/csv";
import type { CrmRecord, CsvPreview, ImportResult, SkippedRecord } from "@/lib/types";

type Step = "upload" | "preview" | "processing" | "results";

const STEPS: { key: Step; label: string }[] = [
  { key: "upload", label: "Upload" },
  { key: "preview", label: "Preview" },
  { key: "processing", label: "Extract" },
  { key: "results", label: "Results" },
];

export default function Home() {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Live extraction state.
  const [progress, setProgress] = useState({ processed: 0, total: 0, batch: 0, totalBatches: 0 });
  const [records, setRecords] = useState<CrmRecord[]>([]);
  const [skipped, setSkipped] = useState<SkippedRecord[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleFileSelected = useCallback(async (selected: File) => {
    setError(null);
    setFile(selected);
    try {
      const parsed = await parseCsvFile(selected);
      if (parsed.totalRows === 0) {
        setError("This CSV has no data rows.");
        setFile(null);
        return;
      }
      setPreview(parsed);
      setStep("preview");
    } catch {
      setError("Could not read this CSV file. Please check the format.");
      setFile(null);
    }
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!file) return;
    setError(null);
    setRecords([]);
    setSkipped([]);
    setResult(null);
    setProgress({ processed: 0, total: preview?.totalRows ?? 0, batch: 0, totalBatches: 0 });
    setStep("processing");

    try {
      await importCsvStream(file, (event) => {
        switch (event.type) {
          case "start":
            setProgress((p) => ({ ...p, total: event.totalRows, totalBatches: event.totalBatches }));
            break;
          case "progress":
            setProgress({
              processed: event.processedRows,
              total: event.totalRows,
              batch: event.batch,
              totalBatches: event.totalBatches,
            });
            break;
          case "records":
            setRecords((prev) => [...prev, ...event.records]);
            break;
          case "skipped":
            setSkipped((prev) => [...prev, ...event.skipped]);
            break;
          case "done":
            setResult(event.result);
            setRecords(event.result.records);
            setSkipped(event.result.skipped);
            setStep("results");
            break;
          case "error":
            setError(event.message);
            setStep("preview");
            break;
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong during import.");
      setStep("preview");
    }
  }, [file, preview]);

  const handleReset = useCallback(() => {
    setStep("upload");
    setFile(null);
    setPreview(null);
    setError(null);
    setRecords([]);
    setSkipped([]);
    setResult(null);
    setProgress({ processed: 0, total: 0, batch: 0, totalBatches: 0 });
  }, []);

  const handleDownload = useCallback(() => {
    if (!records.length) return;
    downloadTextFile(recordsToCsv(records), "groweasy-crm-leads.csv");
  }, [records]);

  const activeIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-white">
              <FileSpreadsheet className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold leading-tight text-slate-900 dark:text-white">
                GrowEasy
              </p>
              <p className="text-xs leading-tight text-slate-500 dark:text-slate-400">
                AI CSV Importer
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Hero */}
        <div className="mb-8 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
            <Sparkles className="h-3.5 w-3.5" />
            Powered by Gemini
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            Import leads from <span className="text-brand-600 dark:text-brand-400">any</span> CSV
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-slate-600 sm:text-base dark:text-slate-400">
            Upload a messy export from Facebook, Google Ads, Excel, or any CRM. AI maps the
            columns into GrowEasy CRM format — no manual mapping required.
          </p>
        </div>

        {/* Stepper */}
        <div className="mx-auto mb-8 flex max-w-lg items-center justify-between">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <span
                  className={[
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition",
                    i < activeIndex
                      ? "bg-brand-500 text-white"
                      : i === activeIndex
                        ? "bg-brand-500 text-white ring-4 ring-brand-100 dark:ring-brand-500/20"
                        : "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-500",
                  ].join(" ")}
                >
                  {i < activeIndex ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                </span>
                <span
                  className={[
                    "text-xs font-medium",
                    i <= activeIndex
                      ? "text-slate-700 dark:text-slate-200"
                      : "text-slate-400 dark:text-slate-500",
                  ].join(" ")}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={[
                    "mx-2 h-0.5 flex-1 rounded transition",
                    i < activeIndex ? "bg-brand-500" : "bg-slate-200 dark:bg-slate-800",
                  ].join(" ")}
                />
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="mx-auto mb-6 flex max-w-2xl items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Step content */}
        {step === "upload" && (
          <div className="mx-auto max-w-2xl">
            <UploadZone onFileSelected={handleFileSelected} />
          </div>
        )}

        {step === "preview" && preview && (
          <div className="animate-fade-in space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Preview: {preview.fileName}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {preview.totalRows} rows · {preview.headers.length} columns detected
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <RotateCcw className="h-4 w-4" />
                  Change file
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600"
                >
                  Confirm & Import
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            <PreviewTable headers={preview.headers} rows={preview.rows} />
          </div>
        )}

        {step === "processing" && (
          <div className="mx-auto max-w-3xl space-y-6">
            <ProgressBar
              processed={progress.processed}
              total={progress.total}
              batch={progress.batch}
              totalBatches={progress.totalBatches}
            />
            {(records.length > 0 || skipped.length > 0) && (
              <>
                <StatsCards
                  totalRows={progress.total}
                  imported={records.length}
                  skipped={skipped.length}
                />
                <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                  Results are streaming in live…
                </p>
              </>
            )}
          </div>
        )}

        {step === "results" && result && (
          <div className="animate-fade-in space-y-6">
            <StatsCards
              totalRows={result.totalRows}
              imported={result.totalImported}
              skipped={result.totalSkipped}
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Extracted CRM Records
              </h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={!records.length}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Download className="h-4 w-4" />
                  Download CSV
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600"
                >
                  <RotateCcw className="h-4 w-4" />
                  Import another
                </button>
              </div>
            </div>
            <ResultsView records={records} skipped={skipped} />
          </div>
        )}
      </main>

      <footer className="mx-auto max-w-6xl px-4 py-8 text-center text-xs text-slate-400 sm:px-6 dark:text-slate-600">
        GrowEasy AI CSV Importer · Built with Next.js, Express &amp; Gemini
      </footer>
    </div>
  );
}
