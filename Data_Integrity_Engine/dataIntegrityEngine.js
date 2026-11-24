/**
 * Data Integrity Engine
 * For International Currency & Economic Trend Tracker.
 *
 * Checks and cleans data received from Frankfurter (FX) and World Bank
 * before it is stored or returned by the API.
 */

const CURRENCY_CODE = /^[A-Z]{3}$/;
const COUNTRY_CODE = /^[A-Z]{3}$/;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function isRealDate(value) {
  if (typeof value !== "string" || !DATE_ONLY.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function addIssue(issues, index, field, message) {
  issues.push({ index, field, message });
}

/**
 * Validate and normalize Frankfurter FX rows:
 * { date, base, quote, rate }
 */
export function validateFxRows(rows) {
  const issues = [];
  const validRows = [];
  const seen = new Map();

  if (!Array.isArray(rows)) {
    return { valid: false, validRows, rejectedCount: 0,
      issues: [{ index: null, field: "rows", message: "FX data must be an array." }] };
  }

  rows.forEach((row, index) => {
    const before = issues.length;
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      addIssue(issues, index, "row", "Each FX record must be an object.");
      return;
    }

    const date = String(row.date ?? "");
    const base = String(row.base ?? "").toUpperCase();
    const quote = String(row.quote ?? "").toUpperCase();
    const rate = Number(row.rate);

    if (!isRealDate(date)) addIssue(issues, index, "date", "Date must be a real YYYY-MM-DD date.");
    if (!CURRENCY_CODE.test(base)) addIssue(issues, index, "base", "Base currency must be a three-letter code.");
    if (!CURRENCY_CODE.test(quote)) addIssue(issues, index, "quote", "Quote currency must be a three-letter code.");
    if (base && quote && base === quote) addIssue(issues, index, "quote", "Base and quote currencies must be different.");
    if (!isFiniteNumber(rate) || rate <= 0) addIssue(issues, index, "rate", "Exchange rate must be a finite number greater than zero.");

    if (issues.length !== before) return;

    const normalized = { ...row, date, base, quote, rate };
    const key = `${date}|${base}|${quote}`;
    if (seen.has(key)) {
      const previous = seen.get(key);
      if (previous.rate !== rate) {
        addIssue(issues, index, "rate", "Conflicting duplicate FX record for the same date and currency pair.");
      } else {
        addIssue(issues, index, "row", "Duplicate FX record.");
      }
      return;
    }
    seen.set(key, normalized);
    validRows.push(normalized);
  });

  return { valid: issues.length === 0, validRows, rejectedCount: rows.length - validRows.length, issues };
}

/**
 * Validate and normalize World Bank indicator rows:
 * { countryCode, countryName, indicatorCode, indicatorName, year, value }
 */
export function validateEconomicRows(rows) {
  const issues = [];
  const validRows = [];
  const seen = new Map();

  if (!Array.isArray(rows)) {
    return { valid: false, validRows, rejectedCount: 0,
      issues: [{ index: null, field: "rows", message: "Economic data must be an array." }] };
  }

  rows.forEach((row, index) => {
    const before = issues.length;
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      addIssue(issues, index, "row", "Each economic record must be an object.");
      return;
    }

    const countryCode = String(row.countryCode ?? "").toUpperCase();
    const countryName = String(row.countryName ?? "").trim();
    const indicatorCode = String(row.indicatorCode ?? "").trim();
    const indicatorName = String(row.indicatorName ?? "").trim();
    const year = Number(row.year);
    const value = row.value === null ? null : Number(row.value);

    if (!COUNTRY_CODE.test(countryCode)) addIssue(issues, index, "countryCode", "Country code must be a three-letter ISO code.");
    if (!countryName) addIssue(issues, index, "countryName", "Country name is required.");
    if (!indicatorCode) addIssue(issues, index, "indicatorCode", "Indicator code is required.");
    if (!indicatorName) addIssue(issues, index, "indicatorName", "Indicator name is required.");
    if (!Number.isInteger(year) || year < 1900 || year > new Date().getUTCFullYear() + 1) {
      addIssue(issues, index, "year", "Observation year is invalid.");
    }
    if (row.value !== null && !isFiniteNumber(value)) {
      addIssue(issues, index, "value", "Indicator value must be a finite number or null.");
    }

    if (issues.length !== before) return;

    const normalized = { ...row, countryCode, countryName, indicatorCode, indicatorName, year, value };
    const key = `${countryCode}|${indicatorCode}|${year}`;
    if (seen.has(key)) {
      const previous = seen.get(key);
      const message = previous.value === value
        ? "Duplicate economic observation."
        : "Conflicting duplicate economic observation.";
      addIssue(issues, index, "value", message);
      return;
    }
    seen.set(key, normalized);
    validRows.push(normalized);
  });

  return { valid: issues.length === 0, validRows, rejectedCount: rows.length - validRows.length, issues };
}

/** Check that all values in an array are unique. */
export function findDuplicates(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    else seen.add(value);
  }
  return [...duplicates];
}
