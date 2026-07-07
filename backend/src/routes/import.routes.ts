import { Router } from "express";
import { importCsv, importCsvStream } from "../controllers/import.controller.js";
import { uploadCsv } from "../middleware/upload.js";

const router = Router();

/** Wrap async handlers so rejected promises reach the error middleware. */
const asyncHandler =
  (fn: (req: any, res: any) => Promise<void>) =>
  (req: any, res: any, next: any) =>
    fn(req, res).catch(next);

// Full JSON result.
router.post("/import", uploadCsv, asyncHandler(importCsv));

// Streaming NDJSON result (progress events).
router.post("/import/stream", uploadCsv, asyncHandler(importCsvStream));

export default router;
