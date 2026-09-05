import { GlobalConfig, Material, Product } from "../types";
import { calculateProductAnalysis, getMaterialCost } from "./calculations";

export type MatrixViewMode = "retail" | "wholesale" | "combined";

export interface MatrixCellResult {
  isApplicable: boolean;
  reason?: string;
  fabricCost: number;
  notionsCost: number;
  overheadAllocation: number;
  laborAllocation: number;
  costFloor: number;
  retailPrice: number;
  wholesalePrice: number;
  retailMargin: number;
  wholesaleMargin: number;
  retailProfit: number;
  wholesaleProfit: number;
}

/**
 * Calculates dynamic pricing for a specific product and fabric cell through the root calculation engine.
 */
export function calculateMatrixCell(
  product: Product,
  fabric: Material,
  config: GlobalConfig
): MatrixCellResult {
  // 1. Validate fabric quantity
  if (!product.fabricQuantity || product.fabricQuantity <= 0) {
    return {
      isApplicable: false,
      reason: "Sin consumo de tela definido",
      fabricCost: 0,
      notionsCost: 0,
      overheadAllocation: 0,
      laborAllocation: 0,
      costFloor: 0,
      retailPrice: 0,
      wholesalePrice: 0,
      retailMargin: 0,
      wholesaleMargin: 0,
      retailProfit: 0,
      wholesaleProfit: 0,
    };
  }

  // 2. Validate fabric category
  if (fabric.category !== "fabric") {
    return {
      isApplicable: false,
      reason: "El material no pertenece a la categoría tela",
      fabricCost: 0,
      notionsCost: 0,
      overheadAllocation: 0,
      laborAllocation: 0,
      costFloor: 0,
      retailPrice: 0,
      wholesalePrice: 0,
      retailMargin: 0,
      wholesaleMargin: 0,
      retailProfit: 0,
      wholesaleProfit: 0,
    };
  }

  // 3. Check allowed fabrics filter
  if (
    product.allowedFabricIds &&
    product.allowedFabricIds.length > 0 &&
    !product.allowedFabricIds.includes(fabric.id)
  ) {
    return {
      isApplicable: false,
      reason: "Tela no permitida para este producto",
      fabricCost: 0,
      notionsCost: 0,
      overheadAllocation: 0,
      laborAllocation: 0,
      costFloor: 0,
      retailPrice: 0,
      wholesalePrice: 0,
      retailMargin: 0,
      wholesaleMargin: 0,
      retailProfit: 0,
      wholesaleProfit: 0,
    };
  }

  // 4. Calculate root product analysis overriding with this fabric
  const analysis = calculateProductAnalysis(product, config, fabric.id);
  const fabricCost = getMaterialCost(
    fabric,
    product.fabricQuantity,
    config.materials,
    new Set()
  );
  const notionsCost = Math.max(0, analysis.materialCost - fabricCost);

  return {
    isApplicable: true,
    fabricCost,
    notionsCost,
    overheadAllocation: analysis.overheadAllocation,
    laborAllocation: analysis.laborAllocation,
    costFloor: analysis.costFloor,
    retailPrice: analysis.recommendedPrice,
    wholesalePrice: analysis.recommendedWholesalePrice,
    retailMargin: analysis.appliedMargin,
    wholesaleMargin: analysis.appliedWholesaleMargin,
    retailProfit: analysis.profitPerUnit,
    wholesaleProfit: analysis.wholesaleProfitPerUnit,
  };
}

function escapeCsv(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

/**
 * Generates and downloads a clean CSV representation of the pricing matrix.
 */
export function exportMatrixToCsv(
  products: Product[],
  fabrics: Material[],
  config: GlobalConfig,
  mode: MatrixViewMode
): string {
  const fabricList = fabrics.filter((f) => f.category === "fabric");

  const headerRow = ["Prenda", "Consumo (m)"];
  if (mode === "combined") {
    fabricList.forEach((f) => {
      headerRow.push(`${f.name} - Minorista (Bs)`);
      headerRow.push(`${f.name} - Mayorista (Bs)`);
    });
  } else if (mode === "retail") {
    fabricList.forEach((f) => {
      headerRow.push(`${f.name} - Minorista (Bs)`);
    });
  } else {
    fabricList.forEach((f) => {
      headerRow.push(`${f.name} - Mayorista (Bs)`);
    });
  }

  const csvRows: string[] = [headerRow.map(escapeCsv).join(",")];

  for (const prod of products) {
    const row: string[] = [
      prod.name,
      prod.fabricQuantity ? `${prod.fabricQuantity} m` : "—",
    ];

    for (const fabric of fabricList) {
      const cell = calculateMatrixCell(prod, fabric, config);
      if (!cell.isApplicable) {
        if (mode === "combined") {
          row.push("—");
          row.push("—");
        } else {
          row.push("—");
        }
      } else {
        if (mode === "combined") {
          row.push(cell.retailPrice.toFixed(2));
          row.push(cell.wholesalePrice.toFixed(2));
        } else if (mode === "retail") {
          row.push(cell.retailPrice.toFixed(2));
        } else {
          row.push(cell.wholesalePrice.toFixed(2));
        }
      }
    }
    csvRows.push(row.map(escapeCsv).join(","));
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `azafran_matriz_precios_${mode}_${dateStr}.csv`;
  const csvContent = "\uFEFF" + csvRows.join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return filename;
}
