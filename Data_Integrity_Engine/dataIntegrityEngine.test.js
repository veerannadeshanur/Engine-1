import test from "node:test";
import assert from "node:assert/strict";
import { validateFxRows, validateEconomicRows, findDuplicates } from "./dataIntegrityEngine.js";

test("accepts a valid FX record and normalizes currency codes", () => {
  const result = validateFxRows([{ date: "2026-01-15", base: "usd", quote: "inr", rate: 86.5 }]);
  assert.equal(result.valid, true);
  assert.equal(result.validRows[0].base, "USD");
  assert.equal(result.validRows[0].quote, "INR");
});

test("rejects invalid FX date, currency and rate", () => {
  const result = validateFxRows([{ date: "2026-02-30", base: "US", quote: "INR", rate: -1 }]);
  assert.equal(result.valid, false);
  assert.ok(result.issues.length >= 3);
});

test("detects duplicate FX records", () => {
  const row = { date: "2026-01-15", base: "USD", quote: "INR", rate: 86.5 };
  const result = validateFxRows([row, row]);
  assert.equal(result.validRows.length, 1);
  assert.equal(result.rejectedCount, 1);
});

test("accepts a valid economic indicator record", () => {
  const result = validateEconomicRows([{
    countryCode: "IND", countryName: "India", indicatorCode: "FP.CPI.TOTL.ZG",
    indicatorName: "Inflation (annual %)", year: "2024", value: 5.2
  }]);
  assert.equal(result.valid, true);
  assert.equal(result.validRows[0].year, 2024);
  assert.equal(result.validRows[0].value, 5.2);
});

test("rejects invalid economic records", () => {
  const result = validateEconomicRows([{
    countryCode: "IN", countryName: "", indicatorCode: "", indicatorName: "",
    year: 1800, value: "not-a-number"
  }]);
  assert.equal(result.valid, false);
  assert.ok(result.issues.length >= 5);
});

test("detects duplicate values", () => {
  assert.deepEqual(findDuplicates(["USD", "INR", "USD", "EUR", "INR"]), ["USD", "INR"]);
});
