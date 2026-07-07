import "dotenv/config";
import { z } from "zod";

/**
 * Parse and validate environment variables once at startup. Fail fast with a
 * readable message if something required is missing or malformed.
 */
const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),

  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),

  BATCH_SIZE: z.coerce.number().int().positive().max(100).default(15),
  BATCH_CONCURRENCY: z.coerce.number().int().positive().max(20).default(3),
  MAX_RETRIES: z.coerce.number().int().nonnegative().max(10).default(3),
  MAX_FILE_SIZE_MB: z.coerce.number().positive().default(10),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  // eslint-disable-next-line no-console
  console.error(`\n❌ Invalid environment configuration:\n${issues}\n`);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  corsOrigins: parsed.data.CORS_ORIGIN.split(",").map((o) => o.trim()),
  maxFileSizeBytes: parsed.data.MAX_FILE_SIZE_MB * 1024 * 1024,
};

export type Env = typeof env;
