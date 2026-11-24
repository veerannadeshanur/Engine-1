# Data Integrity Engine

Separate module for the International Currency & Economic Trend Tracker.

## Files
- `dataIntegrityEngine.js` — validates and normalizes Frankfurter exchange-rate rows and World Bank economic-indicator rows; detects duplicate/conflicting records.
- `dataIntegrityEngine.test.js` — automated tests using Node.js built-in test runner.

## Add to your project
Copy both files into:
`currency-economic-tracker/server/src/engines/`

The server already uses ES modules (`"type": "module"`), so no additional dependency is required.

## Run tests
From the `currency-economic-tracker/server` directory:

```bash
node --test src/engines/dataIntegrityEngine.test.js
```

## Use in existing routes
Import the functions where API data is fetched:

```js
import {
  validateFxRows,
  validateEconomicRows
} from "./engines/dataIntegrityEngine.js";
```

For FX data, call `validateFxRows(rows)` after fetching and before `saveFxRows(rows)`.
For economic data, call `validateEconomicRows(rows)` after fetching and before `saveEconomicRows(rows)`.

Example:

```js
const check = validateFxRows(rows);
if (check.rejectedCount > 0) {
  console.warn("FX data integrity issues:", check.issues);
}
await saveFxRows(check.validRows);
```

Use `validateEconomicRows(rows)` in the same way with `saveEconomicRows`.
The engine is standalone: existing routes are not modified automatically. Review its `issues` before deciding whether to reject an entire API response or save only clean records.
