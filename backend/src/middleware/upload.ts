import multer from "multer";
import { env } from "../config/env.js";

/**
 * In-memory CSV upload. We keep the file in a buffer (no disk writes) since we
 * parse it immediately and don't persist anything. `.csv` files and common CSV
 * mime types are accepted.
 */
export const uploadCsv = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxFileSizeBytes, files: 1 },
  fileFilter: (_req, file, cb) => {
    const isCsv =
      file.originalname.toLowerCase().endsWith(".csv") ||
      ["text/csv", "application/csv", "application/vnd.ms-excel", "text/plain"].includes(
        file.mimetype
      );
    if (isCsv) {
      cb(null, true);
    } else {
      cb(new Error("Only .csv files are accepted."));
    }
  },
}).single("file");
