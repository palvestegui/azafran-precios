import React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronDown,
  ChevronUp,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { GlobalConfig, Product, VariantPriceOverride } from "../../types";
import { calculateProductAnalysis } from "../../utils/calculations";
import { cn } from "../../lib/utils";

interface ProductFabricPricingTableProps {
  product: Product;
  config: GlobalConfig;
  expandedTable: boolean;
  onToggleTable: () => void;
  onUpdateOverride?: (
    fabricId: string,
    override: VariantPriceOverride | null
  ) => void;
}

export function ProductFabricPricingTable({
  product,
  config,
  expandedTable,
  onToggleTable,
  onUpdateOverride,
}: ProductFabricPricingTableProps) {
  const allFabrics = config.materials.filter((m) => m.category === "fabric");

  // Filter fabrics by product.allowedFabricIds; if undefined, default to all enabled fabrics
  const displayedFabrics =
    product.allowedFabricIds !== undefined
      ? allFabrics.filter((fabric) =>
          product.allowedFabricIds!.includes(fabric.id)
        )
      : allFabrics;

  const overridesCount = Object.keys(product.variantOverrides || {}).length;

  return (
    <div className="mt-8 bg-stone-950 rounded-2xl border border-stone-800 overflow-hidden">
      <button
        type="button"
        onClick={onToggleTable}
        className="w-full flex justify-between items-center p-4 px-6 hover:bg-stone-800/50 transition-colors"
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          <h4 className="font-bold text-emerald-500 text-sm uppercase tracking-widest">
            Precios Finales por Tela (Borrador Activo)
          </h4>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
            {displayedFabrics.length}{" "}
            {displayedFabrics.length === 1
              ? "tela permitida"
              : "telas permitidas"}
          </span>
          {overridesCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
              <Sparkles className="w-2.5 h-2.5" />
              {overridesCount}{" "}
              {overridesCount === 1
                ? "precio personalizado"
                : "precios personalizados"}
            </span>
          )}
        </div>
        {expandedTable ? (
          <ChevronUp className="w-4 h-4 text-emerald-500 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-emerald-500 shrink-0" />
        )}
      </button>

      <AnimatePresence>
        {expandedTable && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-6 pt-2 border-t border-stone-800/50">
              {displayedFabrics.length === 0 ? (
                <div className="py-8 px-4 text-center flex flex-col items-center justify-center gap-2 rounded-xl bg-stone-900/40 border border-stone-800/80 my-2">
                  <AlertCircle className="w-5 h-5 text-amber-500/90" />
                  <p className="text-sm font-semibold text-stone-200">
                    Seleccione al menos una tela permitida arriba.
                  </p>
                  <p className="text-xs text-stone-500 max-w-sm">
                    Haga clic en las etiquetas de Telas Permitidas para habilitar
                    variantes y calcular precios para esta prenda.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-stone-800 text-stone-500 font-mono text-[10px] uppercase tracking-widest">
                        <th className="pb-3 font-bold min-w-[140px]">
                          Variante (Tela)
                        </th>
                        <th className="pb-3 font-bold text-right min-w-[90px]">
                          Costo Total
                        </th>
                        <th className="pb-3 font-bold text-right text-orange-400 min-w-[190px]">
                          Precio Menor (Bs)
                        </th>
                        <th className="pb-3 font-bold text-right text-emerald-400 min-w-[190px]">
                          Precio Mayor (Bs)
                        </th>
                        <th className="pb-3 font-bold text-center w-[50px]">
                          Reset
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-800/40">
                      {displayedFabrics.map((fabric) => {
                        const fAnalysis = calculateProductAnalysis(
                          product,
                          config,
                          fabric.id
                        );
                        const totalCost = fAnalysis.costFloor;
                        const override =
                          product.variantOverrides?.[fabric.id];

                        const customRetail = override?.customRetailPrice;
                        const isRetailOverridden =
                          customRetail !== undefined && customRetail > 0;
                        const effectiveRetail = isRetailOverridden
                          ? customRetail
                          : fAnalysis.recommendedPrice;
                        const retailProfit = effectiveRetail - totalCost;
                        const retailMargin =
                          effectiveRetail > 0
                            ? (retailProfit / effectiveRetail) * 100
                            : 0;

                        const customWholesale =
                          override?.customWholesalePrice;
                        const isWholesaleOverridden =
                          customWholesale !== undefined &&
                          customWholesale > 0;
                        const effectiveWholesale = isWholesaleOverridden
                          ? customWholesale
                          : fAnalysis.recommendedWholesalePrice;
                        const wholesaleProfit =
                          effectiveWholesale - totalCost;
                        const wholesaleMargin =
                          effectiveWholesale > 0
                            ? (wholesaleProfit / effectiveWholesale) * 100
                            : 0;

                        const hasAnyOverride =
                          isRetailOverridden || isWholesaleOverridden;

                        const handlePriceChange = (
                          field: "customRetailPrice" | "customWholesalePrice",
                          valString: string
                        ) => {
                          if (!onUpdateOverride) return;
                          const trimmed = valString.trim();
                          const valNum =
                            trimmed === "" ? undefined : parseFloat(trimmed);

                          const updatedOverride: VariantPriceOverride = {
                            ...override,
                          };

                          if (valNum === undefined || isNaN(valNum) || valNum < 0) {
                            delete updatedOverride[field];
                          } else {
                            updatedOverride[field] = valNum;
                          }

                          if (
                            updatedOverride.customRetailPrice === undefined &&
                            updatedOverride.customWholesalePrice === undefined
                          ) {
                            onUpdateOverride(fabric.id, null);
                          } else {
                            onUpdateOverride(fabric.id, updatedOverride);
                          }
                        };

                        const handleResetRow = () => {
                          if (onUpdateOverride) {
                            onUpdateOverride(fabric.id, null);
                          }
                        };

                        return (
                          <tr
                            key={fabric.id}
                            className={cn(
                              "hover:bg-stone-800/30 transition-colors",
                              hasAnyOverride && "bg-amber-500/[0.02]"
                            )}
                          >
                            {/* VARIANT NAME */}
                            <td className="py-3.5 pr-3 align-top">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-white font-bold block">
                                  {fabric.name}
                                </span>
                                {hasAnyOverride && (
                                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                                    Fijo
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-stone-500 font-mono block mt-0.5">
                                Tela: Bs {fabric.pricePerUnit.toFixed(2)}/
                                {fabric.unit}
                              </span>
                            </td>

                            {/* TOTAL COST */}
                            <td className="py-3.5 px-2 text-right align-top font-mono text-stone-300">
                              <div className="font-bold text-sm">
                                Bs {totalCost.toFixed(2)}
                              </div>
                              <div className="text-[10px] text-stone-500 mt-0.5">
                                Piso base
                              </div>
                            </td>

                            {/* RETAIL PRICE (PRECIO MENOR) */}
                            <td className="py-3 px-2 align-top text-right">
                              <div className="flex flex-col items-end gap-1.5">
                                <div className="relative w-full max-w-[150px]">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-500 text-xs font-mono font-bold pointer-events-none">
                                    Bs
                                  </span>
                                  <input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    value={
                                      customRetail !== undefined
                                        ? customRetail
                                        : ""
                                    }
                                    placeholder={fAnalysis.recommendedPrice.toFixed(
                                      2
                                    )}
                                    onWheel={(e) => e.currentTarget.blur()}
                                    onChange={(e) =>
                                      handlePriceChange(
                                        "customRetailPrice",
                                        e.target.value
                                      )
                                    }
                                    className={cn(
                                      "w-full bg-stone-900 border rounded-lg py-1.5 pl-8 pr-2 text-xs font-mono text-right focus:outline-none transition-colors",
                                      isRetailOverridden
                                        ? "border-orange-500/60 text-orange-400 font-bold bg-orange-500/5 focus:border-orange-400"
                                        : "border-stone-700 text-stone-300 placeholder:text-stone-600 focus:border-stone-500"
                                    )}
                                  />
                                </div>

                                {/* LIVE BADGE */}
                                <div className="flex items-center gap-1">
                                  {retailMargin < 0 ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/40 font-bold animate-pulse">
                                      <AlertTriangle className="w-2.5 h-2.5 text-red-400" />
                                      {retailMargin.toFixed(1)}% (-Bs{" "}
                                      {Math.abs(retailProfit).toFixed(2)})
                                    </span>
                                  ) : retailMargin < 10 ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 font-semibold">
                                      {retailMargin.toFixed(1)}% (+Bs{" "}
                                      {retailProfit.toFixed(2)})
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold">
                                      {retailMargin.toFixed(1)}% (+Bs{" "}
                                      {retailProfit.toFixed(2)})
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* WHOLESALE PRICE (PRECIO MAYOR) */}
                            <td className="py-3 px-2 align-top text-right">
                              <div className="flex flex-col items-end gap-1.5">
                                <div className="relative w-full max-w-[150px]">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-500 text-xs font-mono font-bold pointer-events-none">
                                    Bs
                                  </span>
                                  <input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    value={
                                      customWholesale !== undefined
                                        ? customWholesale
                                        : ""
                                    }
                                    placeholder={fAnalysis.recommendedWholesalePrice.toFixed(
                                      2
                                    )}
                                    onWheel={(e) => e.currentTarget.blur()}
                                    onChange={(e) =>
                                      handlePriceChange(
                                        "customWholesalePrice",
                                        e.target.value
                                      )
                                    }
                                    className={cn(
                                      "w-full bg-stone-900 border rounded-lg py-1.5 pl-8 pr-2 text-xs font-mono text-right focus:outline-none transition-colors",
                                      isWholesaleOverridden
                                        ? "border-emerald-500/60 text-emerald-400 font-bold bg-emerald-500/5 focus:border-emerald-400"
                                        : "border-stone-700 text-stone-300 placeholder:text-stone-600 focus:border-stone-500"
                                    )}
                                  />
                                </div>

                                {/* LIVE BADGE */}
                                <div className="flex items-center gap-1">
                                  {wholesaleMargin < 0 ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/40 font-bold animate-pulse">
                                      <AlertTriangle className="w-2.5 h-2.5 text-red-400" />
                                      {wholesaleMargin.toFixed(1)}% (-Bs{" "}
                                      {Math.abs(wholesaleProfit).toFixed(2)})
                                    </span>
                                  ) : wholesaleMargin < 10 ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 font-semibold">
                                      {wholesaleMargin.toFixed(1)}% (+Bs{" "}
                                      {wholesaleProfit.toFixed(2)})
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold">
                                      {wholesaleMargin.toFixed(1)}% (+Bs{" "}
                                      {wholesaleProfit.toFixed(2)})
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* RESET ACTION */}
                            <td className="py-3 px-2 text-center align-top">
                              {hasAnyOverride ? (
                                <button
                                  type="button"
                                  onClick={handleResetRow}
                                  title="Revertir a precio calculado por fórmula"
                                  className="p-1.5 rounded-lg text-stone-400 hover:text-amber-400 hover:bg-stone-800/80 transition-colors mt-1"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <span
                                  className="text-stone-700 text-xs mt-1 block select-none"
                                  title="Utilizando fórmula predeterminada"
                                >
                                  —
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
