import type { NextFunction, Request, Response } from "express";
import { MulterError } from "multer";
import { logger } from "../utils/logger.js";

/** 404 handler for unknown routes. */
export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: "Not found" });
}

/** Central error handler — turns thrown errors into clean JSON responses. */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) {
  if (err instanceof MulterError) {
    const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    res.status(status).json({ error: `Upload error: ${err.message}` });
    return;
  }

  const message = err instanceof Error ? err.message : "Internal server error";
  const status = (err as { status?: number })?.status ?? 400;
  logger.error("Request failed", message);
  res.status(status >= 400 && status < 600 ? status : 500).json({ error: message });
}
