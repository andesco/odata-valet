# Tests Design

**Date:** 2026-05-19

---

## Goal

Add a test suite that runs `npm test` and covers both the live worker endpoints and the security-critical client-side JS functions.

---

## Architecture

Vitest as the single test runner for two test files. Worker tests hit the live deployed service. Client-side JS tests are unit tests against an extracted pure function module.

**New files:**
- `vitest.config.js` — minimal Vitest config
- `tests/worker.test.js` — live HTTP tests against `https://odatavalet.andrewe.ca`
- `tests/client.test.js` — unit tests for `escapeHtml` and formula string generation
- `public/formulas.js` — extracted pure functions (`escapeHtml`); imported by both `index.html` and `client.test.js`

**Modified files:**
- `public/index.html` — replace inline `escapeHtml` definition with `import` from `./formulas.js`
- `package.json` — add `vitest` dev dependency and `"test": "vitest run"` script

---

## Worker Tests (`tests/worker.test.js`)

Live fetch against `https://odatavalet.andrewe.ca`. If the service is down, tests fail — that's acceptable.

| Test | Request | Expected |
|------|---------|----------|
| Valid USD 1 week | `GET /ExchangeRates?fx=USD&weeks=1` | 200, Content-Type includes `atom+xml`, body contains `<feed`, `USD_CAD`, `CAD_USD` |
| Valid multi-currency | `GET /ExchangeRates?fx=USD,EUR&months=1` | 200, body contains `EUR_CAD`, `CAD_EUR` |
| Missing fx | `GET /ExchangeRates?weeks=1` | 400 |
| Missing period | `GET /ExchangeRates?fx=USD` | 400 |
| Metadata | `GET /$metadata?fx=USD` | 200, body contains `USD_CAD` property name |
| Unknown path | `GET /notfound` | 404 |
| CORS header | Any `GET /ExchangeRates?fx=USD&weeks=1` | Response has `Access-Control-Allow-Origin: *` |

---

## Client Tests (`tests/client.test.js`)

Unit tests — no network, no DOM.

**`escapeHtml` (imported from `public/formulas.js`):**
- `escapeHtml('<script>')` → `'&lt;script&gt;'`
- `escapeHtml('&')` → `'&amp;'`
- `escapeHtml('"quoted"')` → `'&quot;quoted&quot;'`
- `escapeHtml('safe text')` → `'safe text'` (no change)
- `escapeHtml('<>&"')` → `'&lt;&gt;&amp;&quot;'` (all four characters together)

**Formula string generation (inline in test, not extracted):**
- `=XLOOKUP(A2, Rates[Date], Rates[USD_CAD], 0.0000, -1)` — verify format with a table name of `Rates` and column `USD_CAD`
- `=XLOOKUP(A2, My Table[Date], My Table[EUR_CAD], 0.0000, -1)` — verify spaces in table name pass through correctly

---

## `public/formulas.js`

```js
export function escapeHtml(s) {
  return s.replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
}
```

`public/index.html` changes its `<script>` tag to `<script type="module">` and adds:
```js
import { escapeHtml } from './formulas.js';
```
The inline `escapeHtml` definition is removed.

---

## Out of Scope

- Testing against `wrangler dev` (local)
- Mocking the Bank of Canada API
- Testing the full OData XML structure beyond column name presence
- DOM/browser automation for `index.html` interactions
