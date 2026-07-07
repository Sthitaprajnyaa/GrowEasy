import { describe, expect, it } from "vitest";
import { chunk, CsvParseError, parseCsv } from "./csv.service.js";

describe("parseCsv", () => {
  it("parses rows keyed by arbitrary headers", () => {
    const rows = parseCsv("Full Name,Phone\nJohn Doe,9876543210\nJane,9999999999");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ "Full Name": "John Doe", Phone: "9876543210" });
  });

  it("names blank headers and de-duplicates repeated ones", () => {
    const rows = parseCsv("name,,name\nA,B,C");
    expect(rows[0]).toEqual({ name: "A", column_2: "B", name_2: "C" });
  });

  it("drops fully empty rows", () => {
    const rows = parseCsv("a,b\n1,2\n,\n3,4");
    expect(rows).toHaveLength(2);
  });

  it("throws on empty input", () => {
    expect(() => parseCsv("   ")).toThrow(CsvParseError);
  });
});

describe("chunk", () => {
  it("splits into fixed-size chunks", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
});
