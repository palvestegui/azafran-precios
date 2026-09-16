import React, { useState } from "react";
import { GlobalConfig, Material, Product } from "../../types";
import {
  calculateMatrixCell,
  MatrixCellResult,
  MatrixViewMode,
} from "../../utils/pricingMatrix";
import { Info, Scissors, Layers } from "lucide-react";

interface PricingMatrixTableProps {
  products: Product[];
  fabrics: Material[];
  config: GlobalConfig;
  mode: MatrixViewMode;
  onUpdateProductMeters?: (productId: string, newMeters: number) => void;
}

export const PricingMatrixTable: React.FC<PricingMatrixTableProps> = ({
  products,
  fabrics,
  config,
  mode,
  onUpdateProductMeters,
}) => {
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [tempMeters, setTempMeters] = useState<string>("");
  const [hoveredCell, setHoveredCell] = useState<{
    prodId: string;
    fabricId: string;
    result: MatrixCellResult;
    prodName: string;
    fabricName: string;
  } | null>(null);

  const fabricList = fabrics.filter((m) => m.category === "fabric");

  const startEditMeters = (prod: Product) => {
    setEditingProductId(prod.id);
    setTempMeters(String(prod.fabricQuantity || 0));
  };

  const saveMeters = (productId: string) => {
    const parsed = parseFloat(tempMeters);
    if (!isNaN(parsed) && parsed >= 0 && onUpdateProductMeters) {
      onUpdateProductMeters(productId, parsed);
    }
    setEditingProductId(null);
  };

  return (
    <div className="w-full relative">
      {/* Table Container with dual-axis scroll */}
      <div className="relative overflow-x-auto overflow-y-auto max-h-[70vh] rounded-lg border border-stone-800 bg-stone-900/60 shadow-xl backdrop-blur-sm print:max-h-none print:overflow-visible print:border-stone-400 w-full px-1">
        <table className="w-full text-left border-collapse min-w-[900px]">
          {/* Header Row (Sticky Top) */}
          <thead className="sticky top-0 z-30 bg-stone-950/95 backdrop-blur-md text-stone-300 shadow-sm print:static print:bg-white print:text-black">
            <tr>
              {/* Corner Cell (Sticky Top & Left) */}
              <th
                scope="col"
                className="sticky left-0 top-0 z-40 bg-stone-950 py-1.5 px-2 border-b border-r border-stone-800 min-w-[200px] max-w-[240px] shadow-[3px_0_8px_rgba(0,0,0,0.5)] print:static print:bg-white print:border-stone-400"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-orange-400">
                    Prenda / Confección
                  </span>
                  <span className="text-[10px] text-stone-500 font-mono">
                    (Metros)
                  </span>
                </div>
              </th>

              {/* Fabric Columns */}
              {fabricList.map((fabric) => (
                <th
                  key={fabric.id}
                  scope="col"
                  className="py-1.5 px-2 text-center border-b border-r border-stone-800/80 min-w-[120px] font-mono print:border-stone-400"
                >
                  <div className="text-xs font-bold text-stone-100 whitespace-nowrap">
                    {fabric.name}
                  </div>
                  <div className="flex items-center justify-center gap-1.5 mt-1 text-[11px] text-orange-400 font-medium">
                    <span>Bs {fabric.pricePerUnit.toFixed(2)}/m</span>
                    {Boolean(fabric.wastagePercentage) && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-stone-800 text-stone-400 font-normal">
                        +{fabric.wastagePercentage}%
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body Rows */}
          <tbody className="divide-y divide-stone-800/60 font-mono text-xs print:divide-stone-300">
            {products.map((prod) => {
              const meters = prod.fabricQuantity || 0;
              const hasNoMeters = meters <= 0;

              return (
                <tr
                  key={prod.id}
                  className="hover:bg-stone-800/30 transition-colors group"
                >
                  {/* Sticky First Column (Garment Name & Consumption) */}
                  <th
                    scope="row"
                    className="sticky left-0 z-20 bg-stone-950 group-hover:bg-stone-900 border-r border-stone-800 py-1.5 px-2 min-w-[200px] max-w-[240px] shadow-[3px_0_8px_rgba(0,0,0,0.5)] print:static print:bg-white print:border-stone-400"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-sans font-semibold text-sm text-stone-100 leading-tight">
                        {prod.name}
                      </div>

                      {/* Fabric Consumption Badge or Editor */}
                      {editingProductId === prod.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={tempMeters}
                            onWheel={(e) => e.currentTarget.blur()}
                            onChange={(e) => setTempMeters(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveMeters(prod.id);
                              if (e.key === "Escape") setEditingProductId(null);
                            }}
                            className="w-16 px-1.5 py-0.5 text-xs bg-stone-900 border border-orange-500 rounded text-orange-300 font-mono focus:outline-none"
                            autoFocus
                          />
                          <button
                            onClick={() => saveMeters(prod.id)}
                            className="text-[10px] bg-orange-500 text-black px-1.5 py-0.5 rounded font-bold hover:bg-orange-400"
                          >
                            OK
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditMeters(prod)}
                          title="Clic para ajustar metros por prenda"
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono border transition-all ${
                            hasNoMeters
                              ? "bg-red-500/10 border-red-500/30 text-red-400"
                              : "bg-stone-900 border-stone-700 text-stone-300 hover:border-orange-500/50 hover:text-orange-400"
                          }`}
                        >
                          <Scissors className="w-2.5 h-2.5 opacity-70" />
                          <span>{hasNoMeters ? "0 m" : `${meters}m`}</span>
                        </button>
                      )}
                    </div>

                    {/* Ingredients count & allowed fabrics tag */}
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-stone-500 font-normal">
                      <span>{prod.ingredients.length} avíos</span>
                      {prod.allowedFabricIds && prod.allowedFabricIds.length > 0 && (
                        <span className="flex items-center gap-0.5 text-orange-400/80">
                          <Layers className="w-2.5 h-2.5" />
                          {prod.allowedFabricIds.length} telas hab.
                        </span>
                      )}
                    </div>
                  </th>

                  {/* Fabric Matrix Cells */}
                  {fabricList.map((fabric) => {
                    const cell = calculateMatrixCell(prod, fabric, config);

                    return (
                      <td
                        key={fabric.id}
                        onMouseEnter={() =>
                          cell.isApplicable &&
                          setHoveredCell({
                            prodId: prod.id,
                            fabricId: fabric.id,
                            result: cell,
                            prodName: prod.name,
                            fabricName: fabric.name,
                          })
                        }
                        onMouseLeave={() => setHoveredCell(null)}
                        className="py-1.5 px-2 text-center border-r border-stone-800/70 align-middle hover:bg-orange-500/10 transition-colors print:border-stone-400"
                      >
                        {!cell.isApplicable ? (
                          <div
                            className="text-stone-500/80 select-none cursor-default font-mono text-xs py-2 italic font-normal"
                            title={cell.reason || "No aplica"}
                          >
                            No aplica
                          </div>
                        ) : mode === "retail" ? (
                          <div className="flex flex-col items-center justify-center py-1">
                            <span className="text-sm font-bold text-emerald-400 font-mono tracking-tight">
                              Bs {cell.retailPrice.toFixed(0)}
                            </span>
                            <span className="text-[10px] text-stone-400 font-mono">
                              Bs {cell.retailPrice.toFixed(2)}
                            </span>
                          </div>
                        ) : mode === "wholesale" ? (
                          <div className="flex flex-col items-center justify-center py-1">
                            <span className="text-sm font-bold text-blue-400 font-mono tracking-tight">
                              Bs {cell.wholesalePrice.toFixed(0)}
                            </span>
                            <span className="text-[10px] text-stone-400 font-mono">
                              Bs {cell.wholesalePrice.toFixed(2)}
                            </span>
                          </div>
                        ) : (
                          /* Combined Mode: Minorista / Mayorista stacked */
                          <div className="flex flex-col items-center justify-center gap-0.5 py-0.5">
                            <div className="flex items-center justify-center gap-1 font-mono text-xs font-bold">
                              <span className="text-emerald-400" title="Precio Minorista">
                                Bs {cell.retailPrice.toFixed(0)}
                              </span>
                              <span className="text-stone-500">/</span>
                              <span className="text-blue-400" title="Precio Mayorista">
                                Bs {cell.wholesalePrice.toFixed(0)}
                              </span>
                            </div>
                            <div className="text-[9px] text-stone-400 font-mono">
                              Min / May
                            </div>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Floating Detailed Cost Breakdown Tooltip / Inspector */}
      {hoveredCell && (
        <div className="mt-3 p-3 bg-stone-900 border border-stone-800 rounded-xl flex flex-wrap items-center justify-between gap-4 text-xs font-mono animate-in fade-in duration-150 print:hidden">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-orange-400 shrink-0" />
            <span className="text-stone-200 font-bold">
              {hoveredCell.prodName}
            </span>
            <span className="text-stone-500">en</span>
            <span className="text-orange-400 font-medium">
              {hoveredCell.fabricName}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[11px]">
            <div>
              <span className="text-stone-500">Tela: </span>
              <span className="text-stone-300">
                Bs {hoveredCell.result.fabricCost.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-stone-500">Avíos: </span>
              <span className="text-stone-300">
                Bs {hoveredCell.result.notionsCost.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-stone-500">Mano de obra: </span>
              <span className="text-stone-300">
                Bs {hoveredCell.result.laborAllocation.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-stone-500">Costos fijos: </span>
              <span className="text-stone-300">
                Bs {hoveredCell.result.overheadAllocation.toFixed(2)}
              </span>
            </div>
            <div className="border-l border-stone-800 pl-3">
              <span className="text-stone-500">Costo Piso: </span>
              <span className="text-amber-400 font-bold">
                Bs {hoveredCell.result.costFloor.toFixed(2)}
              </span>
            </div>
            <div className="border-l border-stone-800 pl-3">
              <span className="text-stone-500">Min ({hoveredCell.result.retailMargin}%): </span>
              <span className="text-emerald-400 font-bold">
                Bs {hoveredCell.result.retailPrice.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-stone-500">May ({hoveredCell.result.wholesaleMargin}%): </span>
              <span className="text-blue-400 font-bold">
                Bs {hoveredCell.result.wholesalePrice.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
