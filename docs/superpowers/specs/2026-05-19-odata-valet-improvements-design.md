# OData Valet Improvements — Design

**Date:** 2026-05-19  
**Scope:** Error hardening, URL builder UI, Excel formula generation

---

## 1. Error Hardening (Worker)

**Problem:** The `catch` block in `exchange-rate-worker.js` returns `error.message` and `error.stack` in the 500 response, exposing internals to public callers.

**Change:** Replace the exposed error details with a generic message. Log the real error internally via `console.error(error)` so it remains visible in Cloudflare logs (`wrangler tail`).

**Before:**
```json
{ "error": "..message..", "stack": "..stack.." }
```

**After:**
```json
{ "error": "Internal server error" }
```

No changes to response status (still 500) or headers.

---

## 2. URL Builder UI (index.html)

**Problem:** The connection/table name is hardcoded as `Query` in the static instructions. Users have no way to specify or be reminded to set a custom name when loading in Excel. The static XLOOKUP example uses hardcoded column names unrelated to the user's currency selections.

**Changes:**

- Add a **Connection name** text input to the form (default value: `Rates`). This is the name the user will assign in Excel's "Load to" dialog.
- Update the "How to use in Excel" step 3 to read: *"in the Load dialog, name your table: `[connection name]`"* — dynamically reflecting whatever is typed in the input.
- Remove the static XLOOKUP `<details>` block at the bottom of the page (replaced by Section 3 below).

---

## 3. Formula Generation (index.html)

**Problem:** Users must manually construct a 5-argument XLOOKUP from memory, knowing the exact column names produced by their currency selections. This is the primary friction point vs. Excel's built-in currency data type.

**Change:** Add a **Formulas** section below the URL output. It generates one XLOOKUP formula per currency pair, live-updating as currencies and connection name change.

**Layout per pair:**
```
USD → CAD    =XLOOKUP(A2, Rates[Date], Rates[USD_CAD], 0, -1)   [Copy]
CAD → USD    =XLOOKUP(A2, Rates[Date], Rates[CAD_USD], 0, -1)   [Copy]
```

**Behaviour:**
- Each row has an independent **Copy** button (same copy-then-reset pattern as the URL copy button)
- Formulas update live on any currency checkbox change or connection name change
- Section is hidden when no currencies are selected
- `0.0000` simplified to `0` (equivalent in Excel, cleaner to read)
- Formula always uses `A2` as the date cell reference (with a note that `INDEX(A:A,ROW())` works for column-wide use)

---

## Out of Scope

- Caching (KV or HTTP) — no KV binding configured; separate concern
- OData v4 / JSON format support
- Single-direction currency pairs
- Excel template download
