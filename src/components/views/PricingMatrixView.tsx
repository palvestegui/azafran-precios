import React, { useState } from "react";
import { GlobalConfig, Product } from "../../types";
import { MatrixViewMode, exportMatrixToCsv } from "../../utils/pricingMatrix";
import { exportMatrixToPdf } from "../../utils/matrixPdfExport";
import { PricingMatrixTable } from "../pricing/PricingMatrixTable";
import {
  FileSpreadsheet,
  Printer,
  ShoppingBag,
  Store,
  Layers,
  CheckCircle2,
  Sliders,
  Calculator,
} from "lucide-react";

interface PricingMatrixViewProps {
  config: GlobalConfig;
  onChange?: (newConfig: GlobalConfig) => void;
}

export const PricingMatrixView: React.FC<PricingMatrixViewProps> = ({
  config,
  onChange,
}) => {
  const [mode, setMode] = useState<MatrixViewMode>("combined");
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  const fabrics = config.materials.filter((m) => m.category === "fabric");
  const products = config.products;

  const handleExportCsv = () => {
    try {
      const filename = exportMatrixToCsv(products, fabrics, config, mode);
      setExportSuccess(`Matriz exportada exitosamente como ${filename}`);
      setTimeout(() => setExportSuccess(null), 3500);
    } catch {
      // ignore
    }
  };

  const handleExportPdf = () => {
    try {
      const filename = exportMatrixToPdf(products, fabrics, config, mode);
      setExportSuccess(`Matriz descargada exitosamente en PDF como ${filename}`);
      setTimeout(() => setExportSuccess(null), 3500);
    } catch {
      // ignore
    }
  };

  const handleUpdateProductMeters = (productId: string, newMeters: number) => {
    if (!onChange) return;
    const updatedProducts = config.products.map((p: Product) =>
      p.id === productId ? { ...p, fabricQuantity: newMeters } : p
    );
    onChange({
      ...config,
      products: updatedProducts,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-stone-800 pb-5 print:border-none print:pb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 print:hidden">
              <Calculator className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl md:text-2xl font-black italic tracking-tight text-white print:text-black">
                Matriz de Precios
              </h2>
              <p className="text-xs text-stone-400 font-mono print:text-stone-600">
                Cotización matricial cruzada en tiempo real de prendas vs telas operativas.
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher Pill & Actions */}
        <div className="flex flex-wrap items-center gap-2.5 print:hidden">
          {/* 3-Mode Pill Switcher */}
          <div className="inline-flex p-1 bg-stone-900 border border-stone-800 rounded-xl shadow-inner font-mono text-xs">
            <button
              onClick={() => setMode("retail")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                mode === "retail"
                  ? "bg-emerald-500 text-black font-bold shadow"
                  : "text-stone-400 hover:text-white"
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>Vista Minorista</span>
            </button>
            <button
              onClick={() => setMode("wholesale")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                mode === "wholesale"
                  ? "bg-blue-500 text-black font-bold shadow"
                  : "text-stone-400 hover:text-white"
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Vista Mayorista</span>
            </button>
            <button
              onClick={() => setMode("combined")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                mode === "combined"
                  ? "bg-orange-500 text-black font-bold shadow"
                  : "text-stone-400 hover:text-white"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Vista Combinada</span>
            </button>
          </div>

          {/* Action Buttons */}
          <button
            onClick={handleExportCsv}
            title="Descargar matriz en formato CSV para Excel"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-200 hover:text-orange-400 hover:border-orange-500/30 transition-all text-xs font-mono font-medium shadow-sm active:scale-95"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-orange-500" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>

          <button
            onClick={handleExportPdf}
            title="Generar y descargar matriz en formato PDF (Horizontal)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-200 hover:text-orange-400 hover:border-orange-500/30 transition-all text-xs font-mono font-medium shadow-sm active:scale-95"
          >
            <Printer className="w-3.5 h-3.5 text-orange-500" />
            <span className="hidden sm:inline">Imprimir / PDF</span>
          </button>
        </div>
      </div>

      {/* Export notification toast */}
      {exportSuccess && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{exportSuccess}</span>
        </div>
      )}

      {/* System Parameter Pills / KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:hidden">
        <div className="p-3 bg-stone-900/50 border border-stone-800/80 rounded-xl">
          <div className="text-[10px] text-stone-500 uppercase font-mono font-semibold">
            Prendas Activas
          </div>
          <div className="text-base font-bold text-stone-100 font-mono mt-0.5">
            {products.length} productos
          </div>
        </div>

        <div className="p-3 bg-stone-900/50 border border-stone-800/80 rounded-xl">
          <div className="text-[10px] text-stone-500 uppercase font-mono font-semibold">
            Telas Operativas
          </div>
          <div className="text-base font-bold text-orange-400 font-mono mt-0.5">
            {fabrics.length} variantes
          </div>
        </div>

        <div className="p-3 bg-stone-900/50 border border-stone-800/80 rounded-xl">
          <div className="text-[10px] text-stone-500 uppercase font-mono font-semibold">
            Margen Minorista Base
          </div>
          <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">
            {config.profitMargin}%
          </div>
        </div>

        <div className="p-3 bg-stone-900/50 border border-stone-800/80 rounded-xl">
          <div className="text-[10px] text-stone-500 uppercase font-mono font-semibold">
            Margen Mayorista Base
          </div>
          <div className="text-base font-bold text-blue-400 font-mono mt-0.5">
            {config.wholesaleMargin || 20}%
          </div>
        </div>
      </div>

      {/* Pricing Matrix Table */}
      <PricingMatrixTable
        products={products}
        fabrics={fabrics}
        config={config}
        mode={mode}
        onUpdateProductMeters={handleUpdateProductMeters}
      />

      {/* Transparent Calculation Footer / Operational Guide */}
      <div className="p-4 bg-stone-900/40 border border-stone-800/60 rounded-xl text-xs font-mono text-stone-400 space-y-2 print:hidden">
        <div className="flex items-center gap-1.5 text-stone-300 font-bold">
          <Sliders className="w-3.5 h-3.5 text-orange-400" />
          <span>Fórmulas del Motor de Precios Dinámico</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] text-stone-400">
          <div className="p-2.5 rounded-lg bg-stone-950/40 border border-stone-800/40">
            <span className="text-orange-400 font-semibold block mb-1">
              1. Costo Materiales
            </span>
            <span>
              Tela = Metros × Precio/m × (1 + Merma). Avíos = Suma de insumos de receta convertidos.
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-stone-950/40 border border-stone-800/40">
            <span className="text-orange-400 font-semibold block mb-1">
              2. Asignación Indirecta
            </span>
            <span>
              Costo Fijo = (Pagos Fijos + Gastos Diarios + Planilla) / Capacidad ({config.productionCapacity} u/mes).
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-stone-950/40 border border-stone-800/40">
            <span className="text-orange-400 font-semibold block mb-1">
              3. Precio Minorista / Mayorista
            </span>
            <span>
              Piso = Materiales + Indirectos. Precio = Piso / (1 - Margen %).
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
