import { jsPDF } from "jspdf";
import autoTable, { RowInput } from "jspdf-autotable";
import { GlobalConfig, Material, Product } from "../types";
import { MatrixViewMode, calculateMatrixCell } from "./pricingMatrix";

const MODE_LABELS: Record<MatrixViewMode, string> = {
  retail: "Modalidad: Minorista",
  wholesale: "Modalidad: Mayorista",
  combined: "Modalidad: Combinada (Minorista / Mayorista)",
};

/**
 * Generates and triggers a direct browser download of the Pricing Matrix as a landscape PDF.
 */
export function exportMatrixToPdf(
  products: Product[],
  fabrics: Material[],
  config: GlobalConfig,
  mode: MatrixViewMode
): string {
  const fabricList = fabrics.filter((f) => f.category === "fabric");

  // Create document in landscape A4 format
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;

  // Header: Brand & Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(30, 30, 30);
  doc.text("AZAFRÁN CHEFWEAR | Matriz de Precios Operativa", marginX, 15);

  // Header: Subtitle / Active Mode & Timestamp
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);

  const modeText = MODE_LABELS[mode] || "Modalidad Operativa";
  const now = new Date();
  const formattedDate = new Intl.DateTimeFormat("es-BO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);

  doc.text(`${modeText}  •  Generado el: ${formattedDate}`, marginX, 21);

  // Accent Line under header
  doc.setDrawColor(234, 88, 12); // Orange accent
  doc.setLineWidth(0.6);
  doc.line(marginX, 24, pageWidth - marginX, 24);

  // Table Structure
  const headRow: string[] = ["Prenda", "Consumo (m)"];
  if (mode === "combined") {
    fabricList.forEach((f) => {
      headRow.push(`${f.name}\nMinorista`);
      headRow.push(`${f.name}\nMayorista`);
    });
  } else if (mode === "retail") {
    fabricList.forEach((f) => {
      headRow.push(`${f.name}\nMinorista`);
    });
  } else {
    fabricList.forEach((f) => {
      headRow.push(`${f.name}\nMayorista`);
    });
  }

  const tableBody: RowInput[] = [];

  for (const prod of products) {
    const row: string[] = [
      prod.name,
      prod.fabricQuantity ? `${prod.fabricQuantity} m` : "—",
    ];

    for (const fabric of fabricList) {
      const cell = calculateMatrixCell(prod, fabric, config);
      if (!cell.isApplicable) {
        if (mode === "combined") {
          row.push("No aplica");
          row.push("No aplica");
        } else {
          row.push("No aplica");
        }
      } else {
        if (mode === "combined") {
          row.push(`Bs ${cell.retailPrice.toFixed(2)}`);
          row.push(`Bs ${cell.wholesalePrice.toFixed(2)}`);
        } else if (mode === "retail") {
          row.push(`Bs ${cell.retailPrice.toFixed(2)}`);
        } else {
          row.push(`Bs ${cell.wholesalePrice.toFixed(2)}`);
        }
      }
    }
    tableBody.push(row);
  }

  // Draw table using autoTable
  autoTable(doc, {
    startY: 28,
    margin: { left: marginX, right: marginX, bottom: 16 },
    head: [headRow],
    body: tableBody,
    theme: "striped",
    headStyles: {
      fillColor: [28, 25, 23], // stone-900
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
      valign: "middle",
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [40, 40, 40],
      valign: "middle",
      cellPadding: 2,
    },
    alternateRowStyles: {
      fillColor: [248, 248, 248],
    },
    columnStyles: {
      0: { halign: "left", fontStyle: "bold", minCellWidth: 28 },
      1: { halign: "center", minCellWidth: 16 },
    },
    styles: {
      overflow: "linebreak",
      cellWidth: "auto",
      lineWidth: 0.1,
      lineColor: [220, 220, 220],
    },
  });

  // Stamp Footers across all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);

    // Left Footer
    doc.text(
      "Azafrán Chefwear - Documento Operativo Interno",
      marginX,
      pageHeight - 8
    );

    // Right Footer: Page counter
    const pageStr = `Página ${i} de ${totalPages}`;
    doc.text(
      pageStr,
      pageWidth - marginX - doc.getTextWidth(pageStr),
      pageHeight - 8
    );
  }

  // Save and download directly
  const dateStr = now.toISOString().slice(0, 10);
  const filename = `azafran_matriz_precios_${mode}_${dateStr}.pdf`;
  doc.save(filename);

  return filename;
}
