/** CRM schema mirrored from the backend — the canonical target columns. */
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

/** Friendly column headers for the results table. */
export const CRM_FIELD_LABELS: Record<CrmField, string> = {
  created_at: "Created At",
  name: "Name",
  email: "Email",
  country_code: "Code",
  mobile_without_country_code: "Mobile",
  company: "Company",
  city: "City",
  state: "State",
  country: "Country",
  lead_owner: "Lead Owner",
  crm_status: "Status",
  crm_note: "Note",
  data_source: "Source",
  possession_time: "Possession",
  description: "Description",
};

/** Tailwind classes for status badges. */
export const STATUS_STYLES: Record<string, string> = {
  GOOD_LEAD_FOLLOW_UP:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  DID_NOT_CONNECT:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  BAD_LEAD: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  SALE_DONE: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
};

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:4000";
