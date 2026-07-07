import {
  CRM_FIELDS,
  CRM_FIELD_DESCRIPTIONS,
  CRM_STATUS_VALUES,
  DATA_SOURCE_VALUES,
} from "../constants/crm.js";
import type { RawRow } from "../types.js";

/**
 * System instruction: fixed guidance describing WHO the model is and the rules
 * it must follow. Kept separate from the per-batch data so it can be cached and
 * reasoned about independently.
 */
export const SYSTEM_INSTRUCTION = `You are a meticulous data-mapping engine for the GrowEasy CRM.
Your job: read messy lead rows exported from ANY source (Facebook Lead Ads, Google Ads,
Excel sheets, real-estate CRMs, marketing agencies, hand-made spreadsheets) and map them
into GrowEasy's fixed CRM schema.

You never invent data. If a value is not present or cannot be confidently inferred, you
leave that field as an empty string "". You map by MEANING, not by exact column names —
"Full Name", "Lead Name", "customer", "नाम" all map to \`name\`; "Phone", "Contact No",
"Mobile", "WhatsApp" all map to the mobile fields; and so on.`;

const fieldList = CRM_FIELDS.map(
  (f) => `- ${f}: ${CRM_FIELD_DESCRIPTIONS[f]}`
).join("\n");

/** The detailed rulebook, appended to every batch prompt. */
const RULES = `TARGET FIELDS (extract as many as possible for each row):
${fieldList}

STRICT RULES:

1. crm_status — MUST be exactly one of:
${CRM_STATUS_VALUES.map((v) => `   - ${v}`).join("\n")}
   Map the row's status/stage/disposition to the closest value. If none fits
   confidently, leave crm_status as "".

2. data_source — MUST be exactly one of:
${DATA_SOURCE_VALUES.map((v) => `   - ${v}`).join("\n")}
   If none matches confidently, leave data_source as "".

3. created_at — Output a value that JavaScript's \`new Date(value)\` can parse.
   Prefer the format "YYYY-MM-DD HH:mm:ss". Convert other date formats accordingly.
   If there is no date, leave it "".

4. country_code / mobile_without_country_code — Split phone numbers. Put the country
   code (e.g. "+91") in country_code and the rest of the digits in
   mobile_without_country_code. If the country code is unknown, leave country_code "".

5. Multiple emails — Use the FIRST email for \`email\`. Append every remaining email
   into \`crm_note\` (e.g. "Other emails: a@x.com, b@y.com").

6. Multiple mobile numbers — Use the FIRST number for the mobile fields. Append every
   remaining number into \`crm_note\` (e.g. "Other phones: 98..., 99...").

7. crm_note — Use it as the catch-all for remarks, follow-up notes, extra comments,
   extra emails/phones, and any useful info that doesn't fit another field. Combine
   multiple notes with "; ".

8. CSV safety — Each record must stay a single logical row. Replace any real line
   breaks inside a value with the literal two-character sequence \\n. Do not output
   raw newlines inside field values.

9. Skipping — If a row has NEITHER an email NOR any mobile number, set every field to
   "" for that row. (The backend will drop such rows.) Do not fabricate contact info.

10. Output — Preserve input order. Return exactly one object per input row, in the
    same order. Every object MUST contain all target field keys.`;

/**
 * Build the per-batch user prompt. Rows are handed to the model with a stable
 * index so we can align the response back to the original rows.
 */
export function buildBatchPrompt(rows: RawRow[]): string {
  const indexed = rows.map((row, i) => ({ index: i, data: row }));
  return `${RULES}

Here are ${rows.length} lead row(s) to map. Each has an "index" and the raw "data"
exactly as it appeared in the source file:

${JSON.stringify(indexed, null, 2)}

Return a JSON array of ${rows.length} objects (one per row, in the same order).`;
}
