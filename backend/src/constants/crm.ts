/**
 * Canonical GrowEasy CRM schema. Everything downstream (prompt, validation,
 * JSON schema for the LLM) is derived from these definitions so there is a
 * single source of truth for the target format.
 */

export const CRM_FIELDS = [
  "created_at",
  "name",
  "email",
  "country_code",
  "mobile_without_country_code",
  "company",
  "city",
  "state",
  "country",
  "lead_owner",
  "crm_status",
  "crm_note",
  "data_source",
  "possession_time",
  "description",
] as const;

export type CrmField = (typeof CRM_FIELDS)[number];

/** Human-readable descriptions, injected into the prompt to guide mapping. */
export const CRM_FIELD_DESCRIPTIONS: Record<CrmField, string> = {
  created_at: "Lead creation date/time (must be parseable by JS `new Date()`).",
  name: "Full name of the lead.",
  email: "Primary email address.",
  country_code: "Phone country code, e.g. +91.",
  mobile_without_country_code: "Mobile number without the country code.",
  company: "Company / organisation name.",
  city: "City.",
  state: "State / province.",
  country: "Country.",
  lead_owner: "Person who owns/handles the lead (often an internal email).",
  crm_status: "Lead status. MUST be one of the allowed status values or blank.",
  crm_note: "Notes, remarks, follow-up comments, and overflow data.",
  data_source: "Lead source. MUST be one of the allowed source values or blank.",
  possession_time: "Property possession time (real-estate context).",
  description: "Any additional free-text description.",
};

export const CRM_STATUS_VALUES = [
  "GOOD_LEAD_FOLLOW_UP",
  "DID_NOT_CONNECT",
  "BAD_LEAD",
  "SALE_DONE",
] as const;

export type CrmStatus = (typeof CRM_STATUS_VALUES)[number];

export const DATA_SOURCE_VALUES = [
  "leads_on_demand",
  "meridian_tower",
  "eden_park",
  "varah_swamy",
  "sarjapur_plots",
] as const;

export type DataSource = (typeof DATA_SOURCE_VALUES)[number];

/** A single extracted CRM record. Every field is a string ("" when unknown). */
export type CrmRecord = Record<CrmField, string>;

/** Empty record with every field present as "". */
export function emptyRecord(): CrmRecord {
  return CRM_FIELDS.reduce((acc, field) => {
    acc[field] = "";
    return acc;
  }, {} as CrmRecord);
}
