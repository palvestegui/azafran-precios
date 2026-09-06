import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  X,
} from "lucide-react";
import { GlobalConfig, Product, VariantPriceOverride } from "../../types";
import {
  getMaterialCost,
  getMaterialTrueCostPerUnit,
} from "../../utils/calculations";
import { cn } from "../../lib/utils";
import { useProductDraft } from "../../hooks/useProductDraft";
import { ProductFabricPricingTable } from "./ProductFabricPricingTable";
import { ProductDraftFooter } from "./ProductDraftFooter";

export interface ProductCardProps {
  key?: React.Key;
  prod: Product;
  config: GlobalConfig;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onSaveProduct: (savedProduct: Product) => void;
  onRemoveProduct: () => void;
  onNotify?: (text: string, type: "success" | "error") => void;
}

export function ProductCard({
  prod,
  config,
  isExpanded,
  onToggleExpand,
  onSaveProduct,
  onRemoveProduct,
  onNotify,
}: ProductCardProps) {
  const [expandedTable, setExpandedTable] = useState(false);

  const {
    draftProduct,
    isDirty,
    updateDraft,
    addIngredient,
    updateIngredient,
    removeIngredient,
    saveDraft,
    discardDraft,
    statusMessage,
  } = useProductDraft({
    product: prod,
    onSaveProduct,
    onNotify,
  });

  const handleUpdateOverride = (
    fabricId: string,
    override: VariantPriceOverride | null
  ) => {
    const current = { ...(draftProduct.variantOverrides || {}) };
    if (
      !override ||
      (override.customRetailPrice === undefined &&
        override.customWholesalePrice === undefined)
    ) {
      delete current[fabricId];
    } else {
      current[fabricId] = override;
    }
    updateDraft({
      variantOverrides:
        Object.keys(current).length > 0 ? current : undefined,
    });
  };

  return (
    <div
      className={cn(
        "bg-stone-900 border rounded-3xl relative group overflow-hidden transition-all duration-200",
        isDirty
          ? "border-amber-500/50 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/20"
          : "border-stone-800"
      )}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />

      <div className="relative z-10">
        {/* Collapsible Header */}
        <div
          className="flex justify-between items-center p-6 cursor-pointer hover:bg-stone-800/30 transition-colors"
          onClick={onToggleExpand}
        >
          <div
            className="flex-1 flex flex-wrap items-center gap-3 pr-2"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              value={draftProduct.name}
              onChange={(e) => updateDraft({ name: e.target.value })}
              className="bg-transparent text-white font-black italic text-3xl border-b-2 border-transparent hover:border-stone-700 focus:border-orange-500 focus:outline-none w-full max-w-md transition-colors"
              placeholder="Nombre del Producto"
            />
            {isDirty && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Borrador con cambios
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveProduct();
              }}
              className="text-stone-600 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Eliminar producto"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button className="text-stone-500">
              {isExpanded ? (
                <ChevronUp className="w-6 h-6" />
              ) : (
                <ChevronDown className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-6 pt-0 space-y-8">
                {/* WORKSHOP EFFORT / FACTOR DE CONFECCIÓN */}
                <div className="space-y-3 bg-stone-950 p-4 rounded-2xl border border-stone-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <label
                        htmlFor={`production-weight-${draftProduct.id}`}
                        className="text-xs uppercase font-bold text-orange-500 block tracking-wide"
                      >
                        Factor de Confección / Equivalencia de Esfuerzo
                      </label>
                      <p className="text-[11px] text-stone-400 mt-0.5 leading-relaxed">
                        Proporción de tiempo frente a una Filipina (1.0 = Filipina, 0.5 = Mandil, 0.25 = Gorro).
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        id={`production-weight-${draftProduct.id}`}
                        type="number"
                        step="0.05"
                        min="0.1"
                        max="3.0"
                        value={draftProduct.productionWeight ?? 1.0}
                        onWheel={(e) => e.currentTarget.blur()}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          updateDraft({
                            productionWeight: isNaN(val) ? 1.0 : val,
                          });
                        }}
                        className="w-28 bg-stone-900 border border-stone-700 rounded-lg p-2 text-sm font-mono text-orange-400 text-right focus:outline-none focus:border-orange-500"
                      />
                      <span className="text-xs font-mono text-stone-500">× esfuerzo</span>
                    </div>
                  </div>
                </div>

                {/* FABRICS SECTION */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-stone-800 pb-2">
                    <div>
                      <h4 className="font-bold text-orange-500 text-sm">
                        Consumo de Tela Base
                      </h4>
                      <p className="text-[10px] text-stone-500 uppercase tracking-widest mt-1">
                        Cantidad necesaria por prenda
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4 items-center bg-stone-950 p-4 rounded-2xl border border-stone-800">
                    <div className="flex-1 min-w-[200px]">
                      <label className="text-[11px] uppercase font-bold text-stone-500 block mb-1">
                        Tela Principal
                      </label>
                      <select
                        value={draftProduct.defaultFabricId || ""}
                        onChange={(e) =>
                          updateDraft({
                            defaultFabricId: e.target.value,
                          })
                        }
                        className="w-full bg-stone-900 border border-stone-700 rounded-lg p-2 text-sm text-white focus:outline-none"
                      >
                        <option value="">Seleccionar Tela...</option>
                        {config.materials
                          .filter((m) => m.category === "fabric")
                          .map((mat) => (
                            <option key={mat.id} value={mat.id}>
                              {mat.name} (Bs {mat.pricePerUnit}/{mat.unit})
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="flex-1 min-w-[200px]">
                      <label className="text-[11px] uppercase font-bold text-stone-500 block mb-1">
                        Metros por unidad
                      </label>
                      <input
                        type="number"
                        value={draftProduct.fabricQuantity || 0}
                        onWheel={(e) => e.currentTarget.blur()}
                        onChange={(e) =>
                          updateDraft({
                            fabricQuantity: Number(e.target.value),
                          })
                        }
                        className="w-full bg-stone-900 border border-stone-700 rounded-lg p-2 text-sm font-mono text-orange-400 focus:outline-none"
                      />
                    </div>
                    <div className="flex-1 min-w-[200px]">
                      <label className="text-[11px] uppercase font-bold text-stone-500 block mb-1">
                        Telas Permitidas
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {config.materials
                          .filter((m) => m.category === "fabric")
                          .map((mat) => {
                            const isAllowed = draftProduct.allowedFabricIds
                              ? draftProduct.allowedFabricIds.includes(mat.id)
                              : true;
                            return (
                              <button
                                key={mat.id}
                                type="button"
                                onClick={() => {
                                  let newIds =
                                    draftProduct.allowedFabricIds ||
                                    config.materials
                                      .filter((m) => m.category === "fabric")
                                      .map((m) => m.id);
                                  if (isAllowed) {
                                    newIds = newIds.filter(
                                      (id) => id !== mat.id
                                    );
                                  } else {
                                    newIds = [...newIds, mat.id];
                                  }
                                  updateDraft({
                                    allowedFabricIds: newIds,
                                  });
                                }}
                                className={cn(
                                  "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all",
                                  isAllowed
                                    ? "bg-orange-500/20 border-orange-500 text-orange-400"
                                    : "bg-stone-900 border-stone-700 text-stone-500 hover:border-stone-500"
                                )}
                              >
                                {mat.name}
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                  <div className="bg-orange-500/5 border border-orange-500/20 p-3 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-orange-400/80 leading-relaxed">
                      El costo de la tela se calculará dinámicamente en la
                      Tabla Comparativa (abajo) y en el Simulador del Dashboard.
                    </p>
                  </div>
                </div>

                {/* OTHER INGREDIENTS SECTION */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-stone-800 pb-2">
                    <h4 className="font-bold text-orange-500 text-sm uppercase">
                      Insumos
                    </h4>
                    <button
                      type="button"
                      onClick={() => addIngredient("other", config.materials)}
                      className="text-orange-500 hover:text-orange-400 bg-orange-500/10 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                    >
                      + Añadir Insumo
                    </button>
                  </div>
                  {draftProduct.ingredients.filter((ing) => {
                    const m = config.materials.find(
                      (mat) => mat.id === ing.materialId
                    );
                    return (
                      m?.category === "other" || m?.category === "accessory"
                    );
                  }).length === 0 && (
                    <p className="text-stone-500 text-sm text-center py-2 italic">
                      Sin insumos registrados.
                    </p>
                  )}
                  <div className="space-y-2">
                    {draftProduct.ingredients.map((ing, i) => {
                      const m = config.materials.find(
                        (mat) => mat.id === ing.materialId
                      );
                      if (
                        m?.category !== "other" &&
                        m?.category !== "accessory"
                      )
                        return null;
                      const availableMaterials = config.materials.filter(
                        (mat) =>
                          mat.category === "other" ||
                          mat.category === "accessory"
                      );
                      const mat = config.materials.find(
                        (item) => item.id === ing.materialId
                      );
                      const cost = getMaterialCost(
                        mat,
                        ing.quantity,
                        config.materials
                      );
                      let qtyLabel = "Cantidad";
                      if (mat) {
                        if (
                          mat.unit === "dozen" ||
                          mat.unit === "100pack" ||
                          mat.unit === "unit" ||
                          mat.unit === "batch"
                        )
                          qtyLabel = "Unidades";
                        else if (mat.unit === "m") qtyLabel = "Metros";
                        else if (mat.unit === "spool") qtyLabel = "Conos";
                        else if (mat.unit === "service") qtyLabel = "Cant.";
                      }
                      return (
                        <div
                          key={i}
                          className="flex flex-wrap sm:flex-nowrap items-center gap-3 bg-stone-950 p-2 pl-4 rounded-xl border border-stone-800"
                        >
                          <div className="flex-1 min-w-[180px]">
                            <select
                              value={ing.materialId}
                              onChange={(e) =>
                                updateIngredient(i, {
                                  materialId: e.target.value,
                                })
                              }
                              className="w-full bg-stone-900 border border-stone-700 rounded-lg p-2 text-sm text-white focus:outline-none"
                            >
                              {availableMaterials.map((item) => {
                                const tCost = getMaterialTrueCostPerUnit(
                                  item,
                                  config.materials
                                );
                                const unitLabel =
                                  item.unit === "batch"
                                    ? `Lote (${item.batchSize || 1} u)`
                                    : item.unit;
                                return (
                                  <option key={item.id} value={item.id}>
                                    {item.name} (Bs {tCost.toFixed(2)} / {unitLabel})
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                          <div className="w-24 shrink-0">
                            <label className="text-[11px] uppercase font-bold text-stone-500 block mb-0.5">
                              {qtyLabel}
                            </label>
                            <input
                              type="number"
                              value={ing.quantity}
                              onWheel={(e) => e.currentTarget.blur()}
                              onChange={(e) =>
                                updateIngredient(i, {
                                  quantity: Number(e.target.value),
                                })
                              }
                              className="w-full bg-stone-900 border border-stone-700 rounded-lg p-2 text-sm font-mono text-orange-400 focus:outline-none text-right"
                            />
                          </div>
                          <div className="w-24 shrink-0 text-right pr-2">
                            <div className="text-[11px] uppercase font-bold text-stone-500 mb-0.5">
                              Suma al costo
                            </div>
                            <div className="font-mono text-sm text-amber-400 font-bold">
                              Bs {cost.toFixed(2)}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeIngredient(i)}
                            className="text-stone-600 hover:text-red-500 p-2"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* TABLA COMPARATIVA DE TELAS */}
                <ProductFabricPricingTable
                  product={draftProduct}
                  config={config}
                  expandedTable={expandedTable}
                  onToggleTable={() => setExpandedTable((prev) => !prev)}
                  onUpdateOverride={handleUpdateOverride}
                />

                {/* STICKY ACTION FOOTER / GUARDAR / DESCARTAR */}
                <ProductDraftFooter
                  isDirty={isDirty}
                  statusMessage={statusMessage}
                  onDiscard={discardDraft}
                  onSave={saveDraft}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
