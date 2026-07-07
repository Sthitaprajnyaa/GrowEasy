/* Tiny structured logger — avoids a heavy dependency while keeping output tidy. */

type Level = "info" | "warn" | "error" | "debug";

function log(level: Level, message: string, meta?: unknown) {
  const time = new Date().toISOString();
  const base = `[${time}] ${level.toUpperCase()} ${message}`;
  // eslint-disable-next-line no-console
  const sink = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  if (meta !== undefined) {
    sink(base, meta);
  } else {
    sink(base);
  }
}

export const logger = {
  info: (msg: string, meta?: unknown) => log("info", msg, meta),
  warn: (msg: string, meta?: unknown) => log("warn", msg, meta),
  error: (msg: string, meta?: unknown) => log("error", msg, meta),
  debug: (msg: string, meta?: unknown) => {
    if (process.env.DEBUG) log("debug", msg, meta);
  },
};
