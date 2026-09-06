import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle, ShieldAlert, ArrowRight, X, AlertCircle } from "lucide-react";
import { MarginRiskItem } from "../../utils/marginSentinel";

export interface MarginSentinelModalProps {
  isOpen: boolean;
  risks: MarginRiskItem[];
  materialName: string;
  onClose: () => void;
  onViewProducts?: () => void;
}

export function MarginSentinelModal({
  isOpen,
  risks,
  materialName,
  onClose,
  onViewProducts,
}: MarginSentinelModalProps) {
  if (!isOpen || risks.length === 0) return null;

  const criticalCount = risks.filter((r) => r.severity === "critical").length;
  const warningCount = risks.length - criticalCount;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-stone-900 border border-red-500/40 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative overflow-hidden my-8"
        >
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-6 right-6 text-stone-500 hover:text-stone-300 p-1.5 rounded-xl hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-2xl shrink-0">
              <ShieldAlert className="w-7 h-7 text-red-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl font-black text-white italic">
                  Alerta de Margen en Riesgo (Sentinel)
                </h3>
                {criticalCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-red-500/20 border border-red-500/40 text-red-400 animate-pulse">
                    {criticalCount}{" "}
                    {criticalCount === 1 ? "venta a pérdida" : "ventas a pérdida"}
                  </span>
                )}
                {warningCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-400">
                    {warningCount} con margen crítico (&lt; 10%)
                  </span>
                )}
              </div>
              <p className="text-stone-400 text-xs sm:text-sm mt-1.5 leading-relaxed">
                El nuevo precio asignado a{" "}
                <span className="text-white font-bold underline decoration-red-500/50">
                  {materialName}
                </span>{" "}
                eleva los costos de confección y compromete los precios de venta fijos
                establecidos en tu catálogo.
              </p>
            </div>
          </div>

          {/* Risk Items List */}
          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {risks.map((risk, idx) => {
              const isCritical = risk.severity === "critical";

              return (
                <div
                  key={`${risk.productId}-${risk.fabricId}-${risk.priceType}-${idx}`}
                  className={`p-4 rounded-2xl border transition-all ${
                    isCritical
                      ? "bg-red-950/20 border-red-500/40"
                      : "bg-stone-950/60 border-amber-500/30"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-stone-800/60">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-bold text-sm">
                        {risk.productName}
                      </span>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-stone-800 text-stone-300">
                        {risk.fabricName}
                      </span>
                      <span
                        className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded ${
                          risk.priceType === "retail"
                            ? "bg-orange-500/15 text-orange-400 border border-orange-500/30"
                            : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        }`}
                      >
                        {risk.priceType === "retail"
                          ? "Precio Menor"
                          : "Precio Mayor"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isCritical ? (
                        <span className="inline-flex items-center gap-1 text-xs font-mono font-black text-red-400 bg-red-500/20 px-2 py-0.5 rounded-lg border border-red-500/40">
                          <AlertTriangle className="w-3 h-3" />
                          {risk.realMargin.toFixed(1)}% MARGEN
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-lg border border-amber-500/30">
                          <AlertCircle className="w-3 h-3" />
                          {risk.realMargin.toFixed(1)}% MARGEN
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-3 text-xs">
                    <div>
                      <span className="text-stone-500 font-mono text-[11px] block">
                        Costo Unitario
                      </span>
                      <span className="font-mono text-stone-300">
                        Bs {risk.oldCost.toFixed(2)} →{" "}
                        <span className="text-white font-bold">
                          Bs {risk.newCost.toFixed(2)}
                        </span>
                      </span>
                    </div>

                    <div>
                      <span className="text-stone-500 font-mono text-[11px] block">
                        Precio de Venta Fijo
                      </span>
                      <span className="font-mono text-white font-bold">
                        Bs {risk.effectivePrice.toFixed(2)}
                      </span>
                      {risk.isCustomOverride && (
                        <span className="text-[10px] text-amber-400 ml-1 font-mono">
                          (Override)
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="text-stone-500 font-mono text-[11px] block">
                        Resultado por Prenda
                      </span>
                      {risk.netProfit < 0 ? (
                        <span className="font-mono font-black text-red-400">
                          -Bs {Math.abs(risk.netProfit).toFixed(2)} (Pérdida)
                        </span>
                      ) : (
                        <span className="font-mono font-semibold text-amber-400">
                          +Bs {risk.netProfit.toFixed(2)} (Ganancia)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action buttons */}
          <div className="mt-6 pt-4 border-t border-stone-800 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-stone-700 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer"
            >
              Entendido / Continuar
            </button>

            {onViewProducts && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onViewProducts();
                }}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-stone-950 text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 active:scale-95 cursor-pointer"
              >
                <span>Ver Prenda Afectada</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
