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
  Info
} from "lucide-react";

interface PricingMatrixViewProps {
  config: GlobalConfig;
  onChange?: (newConfig: GlobalConfig) => void;
}

export const PricingMatrixView: React.FC<PricingMatrixViewProps> = ({ config, onChange }) => {
  const [mode, setMode] = useState<MatrixViewMode>("combined");
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [showFormulas, setShowFormulas] = useState(false);

  const fabrics = config.materials.filter((m) => m.category === "fabric");
  const products = config.products;

  const handleExportCsv = () => {
    try {
      const filename = exportMatrixToCsv(products, fabrics, config, mode);
      setExportSuccess(`Matriz exportada exitosamente como ${filename}`);
      setTimeout(() => setExportSuccess(null), 3500);
    } catch {}
  };

  const handleExportPdf = () => {
    try {
      const filename = exportMatrixToPdf(products, fabrics, config, mode);
      setExportSuccess(`Matriz descargada exitosamente en PDF como ${filename}`);
      setTimeout(() => setExportSuccess(null), 3500);
    } catch {}
  };

  const handleUpdateProductMeters = (productId: string, newMeters: number) => {
    if (!onChange) return;
    const updatedProducts = config.products.map((p: Product) =>
      p.id === productId ? { ...p, fabricQuantity: newMeters } : p
    );
    onChange({ ...config, products: updatedProducts });
  };

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-stone-800 pb-4 shrink-0">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400">
            <Calculator className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">Matriz de Precios</h2>
            <p className="text-xs text-stone-400 mt-0.5">Cotización cruzada en tiempo real.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowFormulas(!showFormulas)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-800 text-stone-300 hover:text-white transition-all text-xs font-mono font-medium relative"
          >
            <Info className="w-3.5 h-3.5 text-blue-400" />
            Ver Fórmulas
            {showFormulas && (
              <div className="absolute top-full right-0 mt-2 w-80 p-4 bg-stone-900 border border-stone-800 rounded-xl shadow-2xl z-50 text-left cursor-default">
                <h4 className="text-orange-400 font-bold text-xs mb-2 flex items-center gap-2 uppercase tracking-wider"><Sliders className="w-3 h-3"/> Fórmulas del Motor</h4>
                <div className="space-y-3 text-[10px] text-stone-300">
                  <div><strong className="text-white block">1. Materiales:</strong> Tela = m × Bs/m × (1 + merma). Insumos sumados directamente.</div>
                  <div><strong className="text-white block">2. Indirectos:</strong> ((Fijos + Diarios + Planilla) / Capacidad) × Factor de Prenda.</div>
                  <div><strong className="text-white block">3. Finales:</strong> Precio Minorista = Costo Total / (1 - Margen %).</div>
                </div>
              </div>
            )}
          </button>
          
          <div className="inline-flex p-1 bg-stone-900 border border-stone-800 rounded-lg text-xs font-mono">
            <button
              onClick={() => setMode("retail")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded transition-all ${mode === "retail" ? "bg-emerald-500 text-black font-bold shadow" : "text-stone-400 hover:text-white"}`}
            >
              <Store className="w-3.5 h-3.5" /> Minorista
            </button>
            <button
              onClick={() => setMode("wholesale")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded transition-all ${mode === "wholesale" ? "bg-blue-500 text-black font-bold shadow" : "text-stone-400 hover:text-white"}`}
            >
              <ShoppingBag className="w-3.5 h-3.5" /> Mayorista
            </button>
            <button
              onClick={() => setMode("combined")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded transition-all ${mode === "combined" ? "bg-orange-500 text-black font-bold shadow" : "text-stone-400 hover:text-white"}`}
            >
              <Layers className="w-3.5 h-3.5" /> Ambos
            </button>
          </div>

          <button onClick={handleExportCsv} title="Exportar CSV" className="p-1.5 rounded-lg bg-stone-900 border border-stone-800 text-stone-300 hover:text-orange-400 transition-colors">
            <FileSpreadsheet className="w-4 h-4 text-orange-500" />
          </button>
          <button onClick={handleExportPdf} title="Exportar PDF" className="p-1.5 rounded-lg bg-stone-900 border border-stone-800 text-stone-300 hover:text-orange-400 transition-colors">
            <Printer className="w-4 h-4 text-orange-500" />
          </button>
        </div>
      </div>

      {exportSuccess && (
        <div className="p-2 mt-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-2 shrink-0">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{exportSuccess}</span>
        </div>
      )}
      
      <div className="flex-1 overflow-auto w-full mt-4 min-h-0 bg-stone-950/50 rounded-lg">
        <PricingMatrixTable products={products} fabrics={fabrics} config={config} mode={mode} onUpdateProductMeters={handleUpdateProductMeters} />
      </div>
    </div>
  );
};
