/** Converts an array of flat objects to CSV and triggers a browser download.
 * This is the "Excel" half of "Exportable to PDF/Excel" — CSV opens directly in Excel/Sheets.
 * For PDF, printFriendlyDownload() below opens the browser print dialog (Save as PDF). */
export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) {
    alert("Nothing to export yet — adjust your filters and try again.");
    return;
  }
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Opens the browser's print dialog on the current page — pick "Save as PDF" as the destination.
 * Simpler and more reliable across environments than generating a PDF client-side. */
export function printFriendlyDownload() {
  window.print();
}
