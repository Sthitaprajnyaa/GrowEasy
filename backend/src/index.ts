import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";

const app = createApp();

app.listen(env.PORT, () => {
  logger.info(`🚀 GrowEasy CSV Importer API listening on http://localhost:${env.PORT}`);
  logger.info(`   Model: ${env.GEMINI_MODEL} | Batch size: ${env.BATCH_SIZE} | Concurrency: ${env.BATCH_CONCURRENCY}`);
});
