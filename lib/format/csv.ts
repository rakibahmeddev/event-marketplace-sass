/**
 * One CSV cell. Values starting with = + - @ tab or CR are prefixed with ' so spreadsheet apps
 * don't run them as formulas (CSV injection); quotes are doubled and every cell is quoted.
 */
export function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** Rows → CSV text with a UTF-8 BOM (Excel needs it for non-ASCII names) and CRLF line ends. */
export function toCsv(rows: string[][]): string {
  return '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
