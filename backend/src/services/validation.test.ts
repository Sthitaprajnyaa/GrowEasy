import { describe, expect, it } from "vitest";
import { isContactable, normaliseRecord, validateBatch } from "./validation.service.js";

describe("normaliseRecord", () => {
  it("keeps allowed enum values and blanks disallowed ones", () => {
    const rec = normaliseRecord({
      name: "John",
      email: "j@x.com",
      crm_status: "SALE_DONE",
      data_source: "eden_park",
    });
    expect(rec.crm_status).toBe("SALE_DONE");
    expect(rec.data_source).toBe("eden_park");

    const bad = normaliseRecord({ crm_status: "HOT_LEAD", data_source: "random_source" });
    expect(bad.crm_status).toBe("");
    expect(bad.data_source).toBe("");
  });

  it("blanks unparseable created_at but keeps valid dates", () => {
    expect(normaliseRecord({ created_at: "2026-05-13 14:20:48" }).created_at).toBe(
      "2026-05-13 14:20:48"
    );
    expect(normaliseRecord({ created_at: "not a date" }).created_at).toBe("");
  });

  it("escapes real newlines into literal \\n for CSV safety", () => {
    const rec = normaliseRecord({ crm_note: "line one\nline two", email: "a@b.com" });
    expect(rec.crm_note).toBe("line one\\nline two");
    expect(rec.crm_note.includes("\n")).toBe(false);
  });

  it("fills every field, defaulting missing ones to empty string", () => {
    const rec = normaliseRecord({ name: "Solo" });
    expect(rec.email).toBe("");
    expect(rec.city).toBe("");
    expect(Object.keys(rec)).toHaveLength(15);
  });
});

describe("isContactable", () => {
  it("requires an email or a mobile number", () => {
    expect(isContactable(normaliseRecord({ email: "a@b.com" }))).toBe(true);
    expect(isContactable(normaliseRecord({ mobile_without_country_code: "9876543210" }))).toBe(true);
    expect(isContactable(normaliseRecord({ name: "No Contact" }))).toBe(false);
  });
});

describe("validateBatch", () => {
  it("splits contactable and skipped rows with correct row numbers", () => {
    const outputs = [
      { name: "A", email: "a@x.com" },
      { name: "B" }, // no contact -> skipped
    ];
    const originals = [{ name: "A" }, { name: "B" }];
    const { records, skipped } = validateBatch(outputs, originals, 1);

    expect(records).toHaveLength(1);
    expect(records[0]!.name).toBe("A");
    expect(skipped).toHaveLength(1);
    expect(skipped[0]!.row).toBe(2);
    expect(skipped[0]!.reason).toMatch(/no email or mobile/i);
  });
});
