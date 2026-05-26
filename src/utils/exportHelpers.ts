/**
 * Shared export utilities for CSV and file download operations.
 */

/**
 * Converts an array of flat objects to a CSV string with proper escaping.
 * Handles commas, quotes, and newlines inside cell values.
 */
export function convertToCSV(data: Record<string, any>[]): string {
  if (data.length === 0) return "";

  const headers = Object.keys(data[0]);

  const escapeCell = (value: any): string => {
    if (value === null || value === undefined) return "";
    const str = String(value);
    // Wrap in quotes if contains comma, quote, or newline
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };

  const headerRow = headers.map(escapeCell).join(",");
  const rows = data.map((row) =>
    headers.map((h) => escapeCell(row[h])).join(",")
  );

  return [headerRow, ...rows].join("\n");
}

/**
 * Triggers an instant browser download for a given content blob.
 * Works for both text (CSV) and binary (XLSX) content.
 */
export function downloadFile(
  content: any,
  filename: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generates a timestamped filename for exports.
 * Example: GoalCryst_all_dispositions_2026-05-26.xlsx
 */
export function getExportFilename(reportId: string, format: "csv" | "xlsx"): string {
  const date = new Date().toISOString().split("T")[0];
  return `GoalCryst_${reportId}_${date}.${format}`;
}
