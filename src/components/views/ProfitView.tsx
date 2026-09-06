import React, { useState, useMemo } from "react";
import { Save, RotateCcw, AlertCircle, Check } from "lucide-react";
import { GlobalConfig, Product } from "../../types";
import {
  calculateProductAnalysis,
  calculateTotalOverhead,
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
  const sellableAccessories: Product[] = config.materials
    .filter((m) => m.category === "accessory" && m.isSoldSeparately)
    .map((m) => ({
      id: m.id,
      name: `[Accesorio] ${m.name}`,
      ingredients: [{ materialId: m.id, quantity: 1 }],
      profitMargin: m.retailMargin,
      wholesaleMargin: m.wholesaleMargin,
    }));

  const allProducts = [...config.products, ...sellableAccessories];

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
    statusMessage,
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
  const overheadPerUnit =
    draft.productionCapacity > 0
      ? totalOverhead / draft.productionCapacity
      : 0;

  const idealProfitMarginToCoverRisk = DEFAULT_RETAIL_MARGIN;

  return (
    <div className="space-y-10">
      <div className="max-w-3xl">
        <h2 className="text-3xl font-black italic mb-2 text-white">
          Análisis de Rentabilidad y Parámetros Globales
        </h2>
        <p className="text-stone-400">
          Todo el costo fijo de la empresa recae sobre la cantidad de productos
          que produces al mes. Configura tu capacidad y márgenes deseados con
          confirmación explícita.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl">
        {/* Settings Card with Draft State */}
        <div
          className={cn(
            "bg-stone-900 border p-8 rounded-3xl space-y-6 transition-all duration-200",
            isDirty
              ? "border-amber-500/50 shadow-xl shadow-amber-500/5"
              : "border-stone-800"
          )}
        >
          {/* Header indicator */}
          <div className="flex items-center justify-between border-b border-stone-800 pb-3">
            <span className="text-xs uppercase font-bold tracking-wider text-stone-400">
              Parámetros de Costeo
            </span>
            {isDirty ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Sin guardar
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-mono text-stone-500">
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                Parámetros guardados
              </span>
            )}
          </div>

          <div>
            <div className="flex justify-between items-end mb-2">
              <label className="text-xs uppercase font-bold text-stone-500 tracking-widest block">
                Margen (Por Menor)
              </label>
              <span className="text-3xl font-black text-orange-500 font-mono">
                {draft.profitMargin}%
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="80"
              step="5"
              value={draft.profitMargin}
              onChange={(e) =>
                updateField("profitMargin", Number(e.target.value))
              }
              className="w-full accent-orange-500 h-2 bg-stone-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="h-px bg-stone-800 w-full" />

          <div>
            <div className="flex justify-between items-end mb-2">
              <label className="text-xs uppercase font-bold text-stone-500 tracking-widest block">
                Margen (Por Mayor)
              </label>
              <span className="text-3xl font-black text-emerald-500 font-mono">
                {draft.wholesaleMargin}%
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="80"
              step="5"
              value={draft.wholesaleMargin}
              onChange={(e) =>
                updateField("wholesaleMargin", Number(e.target.value))
              }
              className="w-full accent-emerald-500 h-2 bg-stone-800 rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-xs text-stone-500 mt-3 font-mono">
              Márgenes sugeridos: Menor ({idealProfitMarginToCoverRisk}%), Mayor
              (~20%).
            </p>
          </div>

          <div className="h-px bg-stone-800 w-full" />

          <div>
            <div className="flex justify-between items-end mb-2">
              <label className="text-xs uppercase font-bold text-stone-500 tracking-widest block">
                Producción Mensual
              </label>
              <span className="text-3xl font-black text-white font-mono">
                {draft.productionCapacity}{" "}
                <span className="text-sm">unid</span>
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="2000"
              step="10"
              value={draft.productionCapacity}
              onChange={(e) =>
                updateField("productionCapacity", Number(e.target.value))
              }
              className="w-full accent-white h-2 bg-stone-800 rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-xs text-stone-500 mt-3 font-mono">
              ¿Cuántos productos estimas hacer *y vender* cada mes? Esto decide
              en cuántas partes se divide tu Carga Fija mensual.
            </p>
          </div>

          {/* Action Footer for Parameters */}
          <div className="pt-4 border-t border-stone-800 flex items-center justify-between gap-3">
            <div>
              {statusMessage && (
                <span
                  className={cn(
                    "text-xs font-mono px-2.5 py-1 rounded-lg",
                    statusMessage.type === "success"
                      ? "text-emerald-300 bg-emerald-500/20 border border-emerald-500/30"
                      : "text-stone-300 bg-stone-800"
                  )}
                >
                  {statusMessage.text}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={discard}
                disabled={!isDirty}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono uppercase tracking-wider font-bold transition-all border",
                  isDirty
                    ? "bg-stone-900 border-stone-700 text-stone-300 hover:text-white hover:bg-stone-800 active:scale-95 cursor-pointer"
                    : "bg-stone-900/30 border-stone-800/40 text-stone-600 cursor-not-allowed"
                )}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Descartar
              </button>
              <button
                type="button"
                onClick={commit}
                disabled={!isDirty}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider font-bold transition-all shadow-md",
                  isDirty
                    ? "bg-orange-500 text-stone-950 hover:bg-orange-400 active:scale-95 shadow-orange-500/20 cursor-pointer"
                    : "bg-stone-800 text-stone-500 cursor-not-allowed"
                )}
              >
                <Save className="w-3.5 h-3.5" />
                Guardar Parámetros
              </button>
            </div>
          </div>
        </div>

        {/* Overhead Summary Card */}
        <div className="bg-orange-500/10 border border-orange-500/20 p-8 rounded-3xl flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-32 bg-orange-500/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />
          <div className="text-xs uppercase font-bold text-orange-500/70 tracking-[0.2em] mb-2">
            Costo Fijo (Overhead) Mensual
          </div>
          <div className="text-5xl font-mono text-white font-black mb-1">
            Bs {totalOverhead.toFixed(2)}
          </div>
          <p className="text-sm text-stone-400 mt-4 leading-relaxed">
            Vendas o no vendas, tienes que pagar{" "}
            <strong>Bs {totalOverhead.toFixed(2)}</strong> cada mes en
            alquileres, servicios, sueldos y gastos diarios.
          </p>
          <div className="mt-6 bg-stone-950/40 p-4 rounded-xl border border-orange-500/10">
            <div className="text-xs uppercase font-bold text-stone-500 tracking-widest mb-1">
              Costo Fijo Repartido X Unidad:
            </div>
            <div className="text-xl font-mono text-orange-400 font-bold">
              Bs {overheadPerUnit.toFixed(2)}
            </div>
            {isDirty && (
              <span className="text-[10px] text-amber-400/80 font-mono mt-1 block">
                * Calculado con capacidad borrador ({draft.productionCapacity} u.)
              </span>
            )}
          </div>
        </div>
      </div>

      {allProducts.length > 0 && (
        <div className="space-y-4 max-w-5xl mt-12 block">
          <div className="border-b border-stone-800 pb-3 flex justify-between items-end">
            <div>
              <h3 className="text-xl font-black italic text-white">
                Proyección por Receta
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">
                Calcula costos unitarios, márgenes y punto de equilibrio para cada
                prenda o receta base.
              </p>
            </div>
            {isDirty && (
              <span className="text-xs font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                Vista previa con parámetros sin guardar
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allProducts.map((prod) => {
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
                  className="bg-stone-900 border border-stone-800 p-5 rounded-2xl flex flex-col"
                >
                  <div className="flex items-start justify-between mb-4 gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4
                          className="font-bold text-white truncate"
                          title={prod.name}
                        >
                          {prod.name}
                        </h4>
                      </div>
                      <select
                        value={activeFabricId}
                        onChange={(e) =>
                          setSelectedFabrics((prev) => ({
                            ...prev,
                            [prod.id]: e.target.value,
                          }))
                        }
                        className="w-full bg-stone-950 border border-stone-700/50 rounded py-1 px-2 text-[10px] text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
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
                        className="bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded font-mono text-[10px] font-bold shrink-0"
                        title="Margen Por Menor"
                      >
                        Menor: {analysis.appliedMargin}%
                      </div>
                      <div
                        className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-mono text-[10px] font-bold shrink-0"
                        title="Margen Por Mayor"
                      >
                        Mayor: {analysis.appliedWholesaleMargin}%
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 flex-1">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-stone-500 font-mono text-xs uppercase tracking-widest">
                        Mat. Directo
                      </span>
                      <span className="font-mono text-red-300">
                        Bs {analysis.materialCost.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-stone-500 font-mono text-xs uppercase tracking-widest">
                        Op. Fijo Asignado
                      </span>
                      <span className="font-mono text-red-300">
                        Bs {overheadPerUnit.toFixed(2)}
                      </span>
                    </div>

                    <div className="h-px bg-stone-800/50 my-2" />

                    <div className="flex flex-col gap-3">
                      {/* Retail Section */}
                      <div className="bg-stone-950 p-3 rounded-lg border border-stone-800">
                        <div className="flex justify-between items-end mb-2">
                          <span className="text-stone-400 font-mono text-[10px] uppercase tracking-widest font-bold">
                            Precio (Menor)
                          </span>
                          <span className="font-mono text-orange-400 text-base font-black">
                            Bs {analysis.recommendedPrice.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-stone-500">Rentabilidad:</span>
                          <span className="font-mono text-orange-400">
                            +Bs {analysis.profitPerUnit.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-stone-500">Break-even:</span>
                          <span className="font-mono text-white">
                            {Math.ceil(analysis.breakEvenUnits)} u/mes
                          </span>
                        </div>
                      </div>

                      {/* Wholesale Section */}
                      <div className="bg-stone-950 p-3 rounded-lg border border-stone-800">
                        <div className="flex justify-between items-end mb-2">
                          <span className="text-stone-400 font-mono text-[10px] uppercase tracking-widest font-bold">
                            Precio (Mayor)
                          </span>
                          <span className="font-mono text-emerald-400 text-base font-black">
                            Bs {analysis.recommendedWholesalePrice.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-stone-500">Rentabilidad:</span>
                          <span className="font-mono text-emerald-400">
                            +Bs {analysis.wholesaleProfitPerUnit.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-stone-500">Break-even:</span>
                          <span className="font-mono text-white">
                            {Math.ceil(analysis.wholesaleBreakEvenUnits)} u/mes
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
