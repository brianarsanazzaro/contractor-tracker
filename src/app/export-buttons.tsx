"use client";

import { useCallback } from "react";

interface ExportData {
  title: string;
  headers: string[];
  rows: (string | number)[][];
}

export function ExportButtons({ getData }: { getData: () => ExportData }) {
  const exportExcel = useCallback(async () => {
    const XLSX = await import("xlsx");
    const { title, headers, rows } = getData();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    // Auto-size columns
    const colWidths = headers.map((h, i) => {
      const maxLen = Math.max(
        h.length,
        ...rows.map((r) => String(r[i] ?? "").length)
      );
      return { wch: Math.min(maxLen + 2, 40) };
    });
    ws["!cols"] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31));
    XLSX.writeFile(wb, `${title.replace(/[^a-zA-Z0-9 -]/g, "")}.xlsx`);
  }, [getData]);

  const exportPdf = useCallback(async () => {
    const { default: jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const { title, headers, rows } = getData();

    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text(title, 14, 15);

    autoTable(doc, {
      head: [headers],
      body: rows.map((r) => r.map((c) => String(c))),
      startY: 22,
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`${title.replace(/[^a-zA-Z0-9 -]/g, "")}.pdf`);
  }, [getData]);

  return (
    <div className="flex gap-2">
      <button
        onClick={exportExcel}
        className="px-3 py-1.5 text-xs font-medium rounded bg-green-600 text-white hover:bg-green-700"
      >
        Export Excel
      </button>
      <button
        onClick={exportPdf}
        className="px-3 py-1.5 text-xs font-medium rounded bg-red-600 text-white hover:bg-red-700"
      >
        Export PDF
      </button>
    </div>
  );
}
