import React, { useState, useMemo } from "react";
import { Save, RotateCcw, AlertCircle, Check } from "lucide-react";
import { GlobalConfig } from "../../types";
import {
  calculateProductAnalysis,
  calculateTotalOverhead,
  calculateMonthlyStaff,
  calculateMonthlyRegular,
  calculateMonthlyDaily,
  DEFAULT_RETAIL_MARGIN,
  DEFAULT_WHOLESALE_MARGIN,
} from "../../utils/calculations";
import { useDraftState } from "../../hooks/useDraftState";
import { cn } from "../../lib/utils";

interface ProfitViewProps {
  config: GlobalConfig;
  onChange: (c: GlobalConfig) => void;
  onNotify?: (text: string, type: "success" | "error" | "info") => void;
}

interface GlobalParametersDraft {
  id: string;
  profitMargin: number;
  wholesaleMargin: number;
  productionCapacity: number;
}

export function ProfitView({ config, onChange, onNotify }: ProfitViewProps) {
  const [selectedFabrics, setSelectedFabrics] = useState<
    Record<string, string>
  >({});

  const initialParams = useMemo<GlobalParametersDraft>(
    () => ({
      id: "global_parameters",
      profitMargin: config.profitMargin || DEFAULT_RETAIL_MARGIN,
      wholesaleMargin: config.wholesaleMargin || DEFAULT_WHOLESALE_MARGIN,
      productionCapacity: config.productionCapacity || 100,
    }),
    [config.profitMargin, config.wholesaleMargin, config.productionCapacity]
  );

  const {
    draft,
    isDirty,
    updateField,
    commit,
    discard,
  } = useDraftState<GlobalParametersDraft>(
    initialParams,
    (saved) => {
      onChange({
        ...config,
        profitMargin: saved.profitMargin,
        wholesaleMargin: saved.wholesaleMargin,
        productionCapacity: saved.productionCapacity,
      });
    },
    {
      entityName: "Parámetros Globales",
      onNotify,
    }
  );

  // Active projection config (using draft values for real-time visual feedback)
  const activeProjectionConfig = useMemo(
    () => ({
      ...config,
      profitMargin: draft.profitMargin,
      wholesaleMargin: draft.wholesaleMargin,
      productionCapacity: draft.productionCapacity,
    }),
    [config, draft]
  );

  const totalOverhead = calculateTotalOverhead(activeProjectionConfig);
  const monthlyStaff = calculateMonthlyStaff(activeProjectionConfig.staff);
  const monthlyRegular = calculateMonthlyRegular(
    activeProjectionConfig.regularPayments
  );
  const monthlyDaily = calculateMonthlyDaily(
    activeProjectionConfig.dailyExpenses
  );
  
  const overheadPerUnit =
    draft.productionCapacity > 0
      ? totalOverhead / draft.productionCapacity
      : 0;

  return (
    <div className="w-full flex flex-col items-start space-y-6">
      <div className="w-full max-w-full">
        <h2 className="text-2xl font-black italic mb-1 text-white">
          Análisis de Rentabilidad y Parámetros Globales
        </h2>
        <p className="text-stone-400 text-sm">
          Ajusta tu capacidad y márgenes para distribuir la carga fija operativa a lo largo de tu catálogo.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 w-full mb-4">
        {/* Settings Card with Draft State */}
        <div
          className={cn(
            "lg:col-span-7 bg-[#1c1917] border rounded-lg p-4 flex flex-col justify-between transition-all duration-200",
            isDirty
              ? "border-amber-500/50 shadow-xl shadow-amber-500/5"
              : "border-stone-800"
          )}
        >
          {/* Header indicator */}
          <div className="flex items-center justify-between border-b border-stone-800 pb-2 mb-3">
            <span className="text-xs uppercase font-bold tracking-wider text-stone-400">
              Parámetros de Costeo
            </span>
            {isDirty ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Cambios pendientes
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-stone-500">
                <Check className="w-3 h-3 text-emerald-500" />
                Parámetros guardados
              </span>
            )}
          </div>

          <div className="space-y-4 flex-1">
            <div>
              <div className="flex justify-between items-end mb-1">
                <label className="text-xs uppercase font-bold text-stone-500 tracking-widest block">
                  Margen (Por Menor)
                </label>
                <span className="text-lg font-black text-orange-500 font-mono">
                  {draft.profitMargin}%
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="80"
                step="5"
                value={draft.profitMargin}
                onWheel={(e) => e.currentTarget.blur()}
                onChange={(e) =>
                  updateField("profitMargin", Number(e.target.value))
                }
                className="w-full accent-orange-500 h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="h-px bg-stone-800 w-full" />

            <div>
              <div className="flex justify-between items-end mb-1">
                <label className="text-xs uppercase font-bold text-stone-500 tracking-widest block">
                  Margen (Por Mayor)
                </label>
                <span className="text-lg font-black text-emerald-500 font-mono">
                  {draft.wholesaleMargin}%
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="80"
                step="5"
                value={draft.wholesaleMargin}
                onWheel={(e) => e.currentTarget.blur()}
                onChange={(e) =>
                  updateField("wholesaleMargin", Number(e.target.value))
                }
                className="w-full accent-emerald-500 h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="h-px bg-stone-800 w-full" />

            <div>
              <div className="flex justify-between items-end mb-1">
                <label className="text-xs uppercase font-bold text-stone-500 tracking-widest block">
                  Producción Mensual
                </label>
                <span className="text-lg font-black text-white font-mono">
                  {draft.productionCapacity} <span className="text-xs">unid</span>
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="2000"
                step="10"
                value={draft.productionCapacity}
                onWheel={(e) => e.currentTarget.blur()}
                onChange={(e) =>
                  updateField("productionCapacity", Number(e.target.value))
                }
                className="w-full accent-white h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* Embedded Action Footer for Parameters */}
          <div className="mt-4 flex items-center justify-end gap-2 h-8">
            {isDirty && (
              <>
                <button
                  type="button"
                  onClick={discard}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-mono uppercase tracking-wider font-bold transition-all border bg-stone-900 border-stone-700 text-stone-300 hover:text-white hover:bg-stone-800 active:scale-95 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  Descartar
                </button>
                <button
                  type="button"
                  onClick={commit}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-mono uppercase tracking-wider font-bold transition-all shadow-md bg-orange-500 text-stone-950 hover:bg-orange-400 active:scale-95 shadow-orange-500/20 cursor-pointer"
                >
                  <Save className="w-3 h-3" />
                  Guardar Parámetros
                </button>
              </>
            )}
          </div>
        </div>

        {/* Overhead Summary Card */}
        <div className="lg:col-span-5 bg-[#1c1917] border border-amber-900/40 rounded-lg p-4 flex flex-col justify-between relative overflow-hidden">
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-amber-500 mb-2">
              Carga Fija Mensual (Overhead)
            </div>
            <div className="text-2xl font-black text-white font-mono">
              Bs {totalOverhead.toFixed(2)}
            </div>
            
            <div className="grid grid-cols-3 gap-2 py-2 border-y border-stone-800/80 my-3 text-[10px] sm:text-xs font-mono text-stone-300">
              <div className="flex flex-col">
                <span className="text-stone-500 mb-0.5">Planilla:</span>
                <span>Bs {monthlyStaff.toFixed(2)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-stone-500 mb-0.5">Regulares:</span>
                <span>Bs {monthlyRegular.toFixed(2)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-stone-500 mb-0.5">Diarios:</span>
                <span>Bs {monthlyDaily.toFixed(2)}</span>
              </div>
            </div>
          </div>
          <div className="text-xs font-mono text-stone-300">
            Costo Fijo Base Repartido: <span className="text-amber-400 font-bold">Bs {overheadPerUnit.toFixed(2)}</span> / unidad
          </div>
        </div>
      </div>

      {config.products.length > 0 && (
        <div className="space-y-4 w-full mt-4 block">
          <div className="border-b border-stone-800 pb-3 flex justify-between items-end">
            <div>
              <h3 className="text-xl font-black italic text-white">
                Proyección por Receta
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">
                Costos unitarios, márgenes y punto de equilibrio por prenda base.
              </p>
            </div>
            {isDirty && (
              <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                Vista previa con parámetros sin guardar
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 w-full">
            {config.products.map((prod) => {
              const activeFabricId =
                selectedFabrics[prod.id] !== undefined
                  ? selectedFabrics[prod.id]
                  : prod.defaultFabricId || "";
              const analysis = calculateProductAnalysis(
                prod,
                activeProjectionConfig,
                activeFabricId
              );
              return (
                <div
                  key={prod.id}
                  className="bg-[#1c1917] border border-stone-800 p-3 rounded-lg flex flex-col"
                >
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <div className="flex-1 min-w-0">
                      <h4
                        className="font-bold text-white text-sm truncate mb-1"
                        title={prod.name}
                      >
                        {prod.name}
                      </h4>
                      <select
                        value={activeFabricId}
                        onChange={(e) =>
                          setSelectedFabrics((prev) => ({
                            ...prev,
                            [prod.id]: e.target.value,
                          }))
                        }
                        className="w-full bg-stone-950 border border-stone-700/50 rounded py-1 px-1.5 text-[10px] text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
                      >
                        <option value="">(Sin tela principal)</option>
                        {config.materials
                          .filter((m) => m.category === "fabric")
                          .filter((m) => {
                            if (
                              !prod.allowedFabricIds ||
                              prod.allowedFabricIds.length === 0
                            )
                              return true;
                            return prod.allowedFabricIds.includes(m.id);
                          })
                          .map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      <div
                        className="bg-orange-500/10 text-orange-400 px-1.5 py-0.5 rounded font-mono text-[9px] font-bold shrink-0"
                        title="Margen Por Menor"
                      >
                        Menor: {analysis.appliedMargin}%
                      </div>
                      <div
                        className="bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-mono text-[9px] font-bold shrink-0"
                        title="Margen Por Mayor"
                      >
                        Mayor: {analysis.appliedWholesaleMargin}%
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 flex-1 flex flex-col">
                    <div className="flex justify-between items-center text-[10px] sm:text-xs font-mono bg-stone-900/50 p-1.5 rounded border border-stone-800/60">
                      <span className="text-stone-500">
                        Mat. Directo: <span className="text-red-300">Bs {analysis.materialCost.toFixed(2)}</span>
                      </span>
                      <span className="text-stone-600">|</span>
                      <span className="text-stone-500">
                        Carga Fija: <span className="text-red-300">Bs {overheadPerUnit.toFixed(2)}</span>
                      </span>
                    </div>

                    <div className="flex flex-col gap-2 mt-2">
                      {/* Retail Section */}
                      <div className="bg-stone-950 p-2 rounded border border-stone-800">
                        <div className="flex justify-between items-end mb-1">
                          <span className="text-stone-400 font-mono text-[10px] uppercase tracking-widest font-bold">
                            Menor
                          </span>
                          <span className="font-mono text-orange-400 text-sm font-black">
                            Bs {analysis.recommendedPrice.toFixed(2)}
                          </span>
                        </div>
                        <div className="text-[9px] font-mono text-stone-500 flex justify-between">
                          <span>
                            Margen: <span className="text-orange-400">+Bs {analysis.profitPerUnit.toFixed(2)}</span>
                          </span>
                          <span>
                            Eq: <span className="text-white">{Math.ceil(analysis.breakEvenUnits)}</span> u/m
                          </span>
                        </div>
                      </div>

                      {/* Wholesale Section */}
                      <div className="bg-stone-950 p-2 rounded border border-stone-800">
                        <div className="flex justify-between items-end mb-1">
                          <span className="text-stone-400 font-mono text-[10px] uppercase tracking-widest font-bold">
                            Mayor
                          </span>
                          <span className="font-mono text-emerald-400 text-sm font-black">
                            Bs {analysis.recommendedWholesalePrice.toFixed(2)}
                          </span>
                        </div>
                        <div className="text-[9px] font-mono text-stone-500 flex justify-between">
                          <span>
                            Margen: <span className="text-emerald-400">+Bs {analysis.wholesaleProfitPerUnit.toFixed(2)}</span>
                          </span>
                          <span>
                            Eq: <span className="text-white">{Math.ceil(analysis.wholesaleBreakEvenUnits)}</span> u/m
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
