import { API_BASE_URL } from "./constants";
import type { StreamEvent } from "./types";

/**
 * Upload a CSV file to the streaming import endpoint and invoke `onEvent` for
 * every NDJSON progress event as it arrives. Uses the fetch streaming body so
 * the UI can show real per-batch progress and incremental results.
 */
export async function importCsvStream(
  file: File,
  onEvent: (event: StreamEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/api/import/stream`, {
    method: "POST",
    body: formData,
    signal,
  });

  if (!response.ok || !response.body) {
    let message = `Request failed (${response.status})`;
    try {
      const data = await response.json();
      if (data?.error) message = data.error;
    } catch {
      /* keep default message */
    }
    throw new Error(message);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? ""; // keep the trailing partial line

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        onEvent(JSON.parse(trimmed) as StreamEvent);
      } catch {
        // Ignore malformed partial lines; the next chunk usually completes them.
      }
    }
  }

  // Flush any remaining buffered line.
  const tail = buffer.trim();
  if (tail) {
    try {
      onEvent(JSON.parse(tail) as StreamEvent);
    } catch {
      /* ignore */
    }
  }
}

/** Simple health check used to surface a clear "backend offline" message. */
export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, { cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}
