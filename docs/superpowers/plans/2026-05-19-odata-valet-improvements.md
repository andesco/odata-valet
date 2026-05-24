# OData Valet Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sanitize public error responses, add a configurable Excel table name to the URL builder, and generate ready-to-copy XLOOKUP formulas per currency pair.

**Architecture:** Two files change — `exchange-rate-worker.js` gets a one-line error fix, and `public/index.html` gets a new fieldset (connection name), dynamic Excel instructions, and a live formula-generation section. No new files, no new dependencies.

**Tech Stack:** Vanilla JavaScript, Cloudflare Workers, Pico CSS 2, Wrangler 4

---

### Task 1: Sanitize 500 error response in worker

**Files:**
- Modify: `exchange-rate-worker.js:293-304`

- [ ] **Step 1: Locate the catch block**

In `exchange-rate-worker.js`, find the `catch` block near line 293:

```javascript
} catch (error) {
  return new Response(JSON.stringify({
    error: error.message,
    stack: error.stack
  }), {
    status: 500,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
```

- [ ] **Step 2: Replace with sanitized response**

```javascript
} catch (error) {
  console.error(error);
  return new Response(JSON.stringify({
    error: 'Internal server error'
  }), {
    status: 500,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
```

- [ ] **Step 3: Verify locally**

```bash
npm run dev
```

Hit the normal endpoint to confirm it still works:

```bash
curl "http://localhost:8787/ExchangeRates?fx=USD&weeks=1"
```

Expected: valid XML response. To verify the sanitized error path, temporarily break `data.observations` (e.g. rename it) inside the try block, hit the same URL, confirm response is `{"error":"Internal server error"}` with no stack trace, then revert the temporary change.

- [ ] **Step 4: Commit**

```bash
git add exchange-rate-worker.js
git commit -m "fix: sanitize 500 error responses, log internally"
```

---

### Task 2: Add connection name input and dynamic Excel instructions

**Files:**
- Modify: `public/index.html`

- [ ] **Step 1: Add connection name fieldset to the form**

In `public/index.html`, locate the closing `</fieldset>` of the Period section (around line 134) and the `<article id="urlOutput">` that follows. Insert a new fieldset between them:

```html
      <fieldset>
        <legend>Excel Table Name</legend>
        <input type="text" id="connectionName" value="Rates" placeholder="Rates" style="max-width: 12rem;">
        <small>Name you'll assign in Excel's <em>Close &amp; Load To…</em> dialog.</small>
      </fieldset>
```

- [ ] **Step 2: Update Excel instructions step 3 to be dynamic**

In the "How to use in Excel" `<ol>` (outside the form, around line 147), find:

```html
        <li>select: Close and load</li>
```

Replace with:

```html
        <li>select <strong>Close &amp; Load To…</strong>, name the table: <code id="tableNameDisplay">Rates</code></li>
```

- [ ] **Step 3: Add `connectionNameInput` variable in the script**

In the `<script>` block, after the existing variable declarations (after `const dateRangeOptions = ...`), add:

```javascript
const connectionNameInput = document.getElementById('connectionName');
```

- [ ] **Step 4: Verify in browser**

```bash
npm run dev
```

Open `http://localhost:8787`. Confirm:
- A "Excel Table Name" fieldset appears with an input defaulting to `Rates`
- Step 3 in the Excel instructions reads: *"select Close & Load To…, name the table: `Rates`"*
- The page has no JS errors in the browser console

- [ ] **Step 5: Commit**

```bash
git add public/index.html
git commit -m "feat: add connection name input and dynamic Excel table name instruction"
```

---

### Task 3: Add formula generation section

**Files:**
- Modify: `public/index.html`

- [ ] **Step 1: Add formulas article HTML**

In `public/index.html`, find the closing `</ol>` of the "How to use in Excel" steps. Immediately after `</ol>`, insert:

```html
      <article id="formulasOutput" style="display:none;">
        <header>Formulas:</header>
        <div id="formulasList"></div>
        <footer><small>Replace <code>A2</code> with your date cell, or use <code>INDEX(A:A,ROW())</code> for a whole column.</small></footer>
      </article>
```

- [ ] **Step 2: Remove the static XLOOKUP details block**

Find and delete this entire block (the `<details>` element that follows the `</ol>`):

```html
      <details open>
      <p><summary><code>=XLOOKUP(A2, Query[Date], Query[USD_CAD], 0.0000, -1)</code></summary></p>
      <ul>
        <li>date cell: <code>A2</code> <small><strong>OR</strong></small> <code>INDEX(A:A,ROW())</code></li>
        <li>imported table name: <code>Query</code></li>
        <li>date column: <code>[Date]</code></li>
        <li>exchange rate column: <code>[USD_CAD]</code></li>
        <li>returned value when no match found: <code>0.0000</code></li>
        <li>find previous business day: <code>-1</code></li>
      </ul>
      </details>
```

- [ ] **Step 3: Add `updateFormulas()` function to the script**

In the `<script>` block, after the `updateUrl()` function definition, add:

```javascript
function updateFormulas() {
  const currencies = Array.from(document.querySelectorAll('input[name="currency"]:checked'))
    .map(cb => cb.value);
  const tableName = (connectionNameInput.value || 'Rates').trim();
  const formulasOutput = document.getElementById('formulasOutput');
  const formulasList = document.getElementById('formulasList');
  const tableNameDisplay = document.getElementById('tableNameDisplay');

  if (tableNameDisplay) tableNameDisplay.textContent = tableName;

  if (currencies.length === 0) {
    formulasOutput.style.display = 'none';
    return;
  }

  formulasOutput.style.display = '';

  const rows = currencies.flatMap(curr => [
    { label: `${curr} → CAD`, col: `${curr}_CAD` },
    { label: `CAD → ${curr}`, col: `CAD_${curr}` },
  ]).map(({ label, col }) => {
    const formula = `=XLOOKUP(A2, ${tableName}[Date], ${tableName}[${col}], 0, -1)`;
    return `<div style="display:flex; align-items:center; gap:1rem; margin-bottom:0.5rem;">
      <span style="min-width:8em; color:var(--pico-muted-color);">${label}</span>
      <code style="flex:1;">${formula}</code>
      <button type="button" class="copy-formula outline secondary" style="width:auto; padding:0.25rem 0.75rem;" data-formula="${formula}">Copy</button>
    </div>`;
  });

  formulasList.innerHTML = rows.join('');

  formulasList.querySelectorAll('.copy-formula').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.formula);
        btn.textContent = 'Copied!';
        setTimeout(() => btn.textContent = 'Copy', 2000);
      } catch {
        alert('Failed to copy formula');
      }
    });
  });
}
```

- [ ] **Step 4: Wire `updateFormulas()` into event listeners**

Find these two lines:

```javascript
form.addEventListener('change', updateUrl);
form.addEventListener('input', updateUrl);
```

Replace with:

```javascript
form.addEventListener('change', () => { updateUrl(); updateFormulas(); });
form.addEventListener('input', () => { updateUrl(); updateFormulas(); });
```

Find the period radio change handler:

```javascript
document.querySelectorAll('input[name="periodType"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    updatePeriodVisibility();
    updateUrl();
  });
});
```

Replace with:

```javascript
document.querySelectorAll('input[name="periodType"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    updatePeriodVisibility();
    updateUrl();
    updateFormulas();
  });
});
```

- [ ] **Step 5: Call `updateFormulas()` in the initialize block**

Find:

```javascript
// Initialize
updatePeriodVisibility();
updateUrl();
```

Replace with:

```javascript
// Initialize
updatePeriodVisibility();
updateUrl();
updateFormulas();
```

- [ ] **Step 6: Verify in browser**

```bash
npm run dev
```

Open `http://localhost:8787`. Confirm:
- With EUR, GBP, USD checked (defaults) and table name `Rates`, a "Formulas:" section appears with 6 rows (2 per currency)
- Each row: label, formula, Copy button — e.g. `=XLOOKUP(A2, Rates[Date], Rates[EUR_CAD], 0, -1)`
- Changing the table name input updates all formulas and the step-3 instruction live
- Unchecking all currencies hides the formulas section
- The old static XLOOKUP details block is gone
- Each Copy button copies its formula and briefly shows "Copied!"
- No JS errors in the browser console

- [ ] **Step 7: Commit**

```bash
git add public/index.html
git commit -m "feat: live XLOOKUP formula generation per currency pair"
```
