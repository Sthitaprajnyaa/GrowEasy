import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { errorHandler, notFound } from "./middleware/error.js";
import importRoutes from "./routes/import.routes.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.corsOrigins.includes("*") ? true : env.corsOrigins,
    })
  );
  // Allow raw CSV to be posted as JSON too (in addition to multipart uploads).
  app.use(express.json({ limit: `${env.MAX_FILE_SIZE_MB}mb` }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", model: env.GEMINI_MODEL });
  });

  app.use("/api", importRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
