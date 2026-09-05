import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  X,
} from "lucide-react";
import { GlobalConfig, Product, ProductIngredient } from "../../types";
import {
  calculateProductAnalysis,
  getMaterialCost,
  getMaterialTrueCostPerUnit,
} from "../../utils/calculations";
import { cn } from "../../lib/utils";

interface ProductCardProps {
  key?: React.Key;
  prod: Product;
  config: GlobalConfig;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdateProduct: (updates: Partial<Product>) => void;
  onRemoveProduct: () => void;
  onAddIngredient: (category: "fabric" | "other" | "accessory") => void;
  onUpdateIngredient: (
    index: number,
    updates: Partial<ProductIngredient>
  ) => void;
  onRemoveIngredient: (index: number) => void;
}

export function ProductCard({
  prod,
  config,
  isExpanded,
  onToggleExpand,
  onUpdateProduct,
  onRemoveProduct,
  onAddIngredient,
  onUpdateIngredient,
  onRemoveIngredient,
}: ProductCardProps) {
  const [expandedTable, setExpandedTable] = useState(false);

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-3xl relative group overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />

      <div className="relative z-10">
        {/* Collapsible Header */}
        <div
          className="flex justify-between items-center p-6 cursor-pointer hover:bg-stone-800/30 transition-colors"
          onClick={onToggleExpand}
        >
          <div className="flex-1" onClick={(e) => e.stopPropagation()}>
            <input
              value={prod.name}
              onChange={(e) => onUpdateProduct({ name: e.target.value })}
              className="bg-transparent text-white font-black italic text-3xl border-b-2 border-transparent hover:border-stone-700 focus:border-orange-500 focus:outline-none w-full max-w-md"
              placeholder="Nombre del Producto"
            />
          </div>
          <div className="flex items-center gap-4">
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
                        value={prod.defaultFabricId || ""}
                        onChange={(e) =>
                          onUpdateProduct({
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
                        value={prod.fabricQuantity || 0}
                        onChange={(e) =>
                          onUpdateProduct({
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
                            const isAllowed = prod.allowedFabricIds
                              ? prod.allowedFabricIds.includes(mat.id)
                              : true;
                            return (
                              <button
                                key={mat.id}
                                onClick={() => {
                                  let newIds =
                                    prod.allowedFabricIds ||
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
                                  onUpdateProduct({
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
                      onClick={() => onAddIngredient("other")}
                      className="text-orange-500 hover:text-orange-400 bg-orange-500/10 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                    >
                      + Añadir Insumo
                    </button>
                  </div>
                  {prod.ingredients.filter((ing) => {
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
                    {prod.ingredients.map((ing, i) => {
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
                        (m) => m.id === ing.materialId
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
                                onUpdateIngredient(i, {
                                  materialId: e.target.value,
                                })
                              }
                              className="w-full bg-stone-900 border border-stone-700 rounded-lg p-2 text-sm text-white focus:outline-none"
                            >
                              {availableMaterials.map((m) => {
                                const tCost = getMaterialTrueCostPerUnit(
                                  m,
                                  config.materials
                                );
                                const unitLabel =
                                  m.unit === "batch"
                                    ? `Lote (${m.batchSize || 1} u)`
                                    : m.unit;
                                return (
                                  <option key={m.id} value={m.id}>
                                    {m.name} (Bs {tCost.toFixed(2)} / {unitLabel})
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
                              onChange={(e) =>
                                onUpdateIngredient(i, {
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
                            onClick={() => onRemoveIngredient(i)}
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
                <div className="mt-8 bg-stone-950 rounded-2xl border border-stone-800 overflow-hidden">
                  <button
                    onClick={() => setExpandedTable((prev) => !prev)}
                    className="w-full flex justify-between items-center p-4 px-6 hover:bg-stone-800/50 transition-colors"
                  >
                    <h4 className="font-bold text-emerald-500 text-sm uppercase tracking-widest">
                      Precios Finales por Tela
                    </h4>
                    {expandedTable ? (
                      <ChevronUp className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-emerald-500" />
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
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-sm">
                              <thead>
                                <tr className="border-b border-stone-800 text-stone-500 font-mono text-[10px] uppercase tracking-widest">
                                  <th className="pb-2 font-bold min-w-[120px]">
                                    Variante (Tela)
                                  </th>
                                  <th className="pb-2 font-bold text-right min-w-[80px]">
                                    Costo Total
                                  </th>
                                  <th className="pb-2 font-bold text-right text-orange-400 min-w-[100px]">
                                    Precio Menor
                                  </th>
                                  <th className="pb-2 font-bold text-right text-emerald-400 min-w-[100px]">
                                    Precio Mayor
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {config.materials
                                  .filter((m) => m.category === "fabric")
                                  .map((fabric) => {
                                    const fAnalysis = calculateProductAnalysis(
                                      prod,
                                      config,
                                      fabric.id
                                    );
                                    return (
                                      <tr
                                        key={fabric.id}
                                        className="border-b border-stone-800/50 hover:bg-stone-800/20"
                                      >
                                        <td className="py-3 text-white font-bold">
                                          {fabric.name}
                                        </td>
                                        <td className="py-3 font-mono text-right text-stone-400">
                                          Bs {fAnalysis.costFloor.toFixed(2)}
                                        </td>
                                        <td className="py-3 font-mono text-right text-orange-400 font-bold">
                                          Bs{" "}
                                          {fAnalysis.recommendedPrice.toFixed(
                                            2
                                          )}
                                        </td>
                                        <td className="py-3 font-mono text-right text-emerald-400 font-bold">
                                          Bs{" "}
                                          {fAnalysis.recommendedWholesalePrice.toFixed(
                                            2
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
