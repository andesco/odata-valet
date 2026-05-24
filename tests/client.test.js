import { describe, it, expect } from 'vitest';
import { escapeHtml, buildFormula } from '../public/formulas.js';

describe('escapeHtml', () => {
  it('escapes angle brackets', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
  });

  it('escapes ampersands', () => {
    expect(escapeHtml('&')).toBe('&amp;');
  });

  it('escapes double quotes', () => {
    expect(escapeHtml('"quoted"')).toBe('&quot;quoted&quot;');
  });

  it('leaves safe text unchanged', () => {
    expect(escapeHtml('safe text')).toBe('safe text');
  });

  it('escapes all four characters together', () => {
    expect(escapeHtml('<>&"')).toBe('&lt;&gt;&amp;&quot;');
  });
});

describe('buildFormula', () => {
  it('builds XLOOKUP formula with simple table name', () => {
    expect(buildFormula('Rates', 'USD_CAD'))
      .toBe('=XLOOKUP(A1, Rates[Date], Rates[USD_CAD], 0.0000, -1)');
  });

  it('builds formula with spaces in table name', () => {
    expect(buildFormula('My Table', 'EUR_CAD'))
      .toBe('=XLOOKUP(A1, My Table[Date], My Table[EUR_CAD], 0.0000, -1)');
  });

  it('builds formula with an explicit date reference', () => {
    expect(buildFormula('Query', 'USD_CAD', 'INDEX(A:A,ROW())'))
      .toBe('=XLOOKUP(INDEX(A:A,ROW()), Query[Date], Query[USD_CAD], 0.0000, -1)');
  });
});
