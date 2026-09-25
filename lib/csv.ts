type CsvValue = string | number | boolean | Date | null | undefined;

/**
 * One CSV cell (RFC 4180): quoted when it holds a comma, quote or line
 * break. A cell starting with = + - @ or a tab is prefixed with ' so a
 * spreadsheet shows it as text instead of running it as a formula — export
 * files hold client-typed text (names, notes), which must never execute.
 */
function cell(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  let text = value instanceof Date ? value.toISOString() : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Rows to CSV text, header first. The byte-order mark makes Excel read the
 * file as UTF-8, so names with accents survive.
 */
export function toCsv<T extends Record<string, CsvValue>>(
  columns: readonly (keyof T & string)[],
  rows: readonly T[],
): string {
  const lines = [
    columns.map(cell).join(","),
    ...rows.map((row) => columns.map((column) => cell(row[column])).join(",")),
  ];
  return `﻿${lines.join("\r\n")}\r\n`;
}
