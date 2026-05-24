export function escapeHtml(s) {
  return s.replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
}

export function buildFormula(tableName, col, dateReference = 'A1') {
  return `=XLOOKUP(${dateReference}, ${tableName}[Date], ${tableName}[${col}], 0.0000, -1)`;
}
