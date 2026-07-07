import { GoogleGenAI, Type } from "@google/genai";
import { env } from "../config/env.js";
import { CRM_FIELDS } from "../constants/crm.js";
import { SYSTEM_INSTRUCTION, buildBatchPrompt } from "../prompts/extraction.prompt.js";
import type { RawRow } from "../types.js";
import { logger } from "../utils/logger.js";

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

/**
 * Response schema forces Gemini to return a JSON array of objects that each
 * contain every CRM field as a string — no missing keys, no stray keys.
 */
const RESPONSE_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: Object.fromEntries(
      CRM_FIELDS.map((f) => [f, { type: Type.STRING }])
    ),
    required: [...CRM_FIELDS],
    propertyOrdering: [...CRM_FIELDS],
  },
};

export class GeminiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeminiError";
  }
}

/**
 * Send one batch of raw rows to Gemini and return the parsed JSON array.
 * Returns loosely-typed objects; validation/normalisation happens separately.
 */
export async function extractBatch(rows: RawRow[]): Promise<Record<string, unknown>[]> {
  const prompt = buildBatchPrompt(rows);

  const response = await ai.models.generateContent({
    model: env.GEMINI_MODEL,
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  const text = response.text;
  if (!text) {
    throw new GeminiError("Gemini returned an empty response.");
  }

  const parsed = safeParseJsonArray(text);
  if (!parsed) {
    logger.warn("Failed to parse Gemini JSON output", { sample: text.slice(0, 300) });
    throw new GeminiError("Gemini returned malformed JSON.");
  }
  return parsed;
}

/**
 * Parse a JSON array from model output, tolerating markdown code fences and
 * stray text around the array.
 */
function safeParseJsonArray(text: string): Record<string, unknown>[] | null {
  const cleaned = text
    .replace(/^\s*```(?:json)?/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  const tryParse = (s: string): unknown => {
    try {
      return JSON.parse(s);
    } catch {
      return undefined;
    }
  };

  let value = tryParse(cleaned);
  if (!Array.isArray(value)) {
    // Fall back to extracting the outermost [ ... ] block.
    const start = cleaned.indexOf("[");
    const end = cleaned.lastIndexOf("]");
    if (start !== -1 && end > start) {
      value = tryParse(cleaned.slice(start, end + 1));
    }
  }

  return Array.isArray(value) ? (value as Record<string, unknown>[]) : null;
}
