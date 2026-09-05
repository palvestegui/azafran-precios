import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { GlobalConfig, Material } from "../../types";
import { isUnit } from "../../utils/validation";

interface MaterialsViewProps {
  config: GlobalConfig;
  onChange: (c: GlobalConfig) => void;
}

export function MaterialsView({ config, onChange }: MaterialsViewProps) {
  const addMaterial = (
    category: "fabric" | "other" | "accessory" = "other"
  ) => {
    onChange({
      ...config,
      materials: [
        {
          id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
          name: "Nuevo Material",
          category,
          unit: category === "fabric" ? "m" : "unit",
          pricePerUnit: 0,
        },
        ...config.materials,
      ],
    });
  };

  const removeMaterial = (id: string) => {
    const newProducts = config.products.map((p) => ({
      ...p,
      ingredients: p.ingredients.filter((i) => i.materialId !== id),
    }));

    onChange({
      ...config,
      products: newProducts,
      materials: config.materials.filter((m) => m.id !== id),
    });
  };

  const updateMaterial = (id: string, updates: Partial<Material>) => {
    onChange({
      ...config,
      materials: config.materials.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
    });
  };

  return (
    <div className="space-y-10">
      {/* FABRICS SECTION */}
      <div className="space-y-6">
        <div className="flex justify-between items-end border-b border-stone-800 pb-4">
          <div>
            <h2 className="text-2xl font-black italic">Telas Principales</h2>
            <p className="text-stone-400 text-sm mt-1">
              Registra la forma de compra y precio de tus telas.
            </p>
          </div>
          <button
            onClick={() => addMaterial("fabric")}
            className="bg-orange-500/10 text-orange-500 border border-orange-500/30 px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-orange-500/20 font-mono text-xs uppercase tracking-widest font-bold"
          >
            <Plus className="w-3 h-3" /> Agregar Tela
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {config.materials
            .filter((m) => m.category === "fabric")
            .map((mat) => (
              <div
                key={mat.id}
                className="bg-stone-900 border border-stone-800 p-4 rounded-2xl flex flex-col gap-3 group relative"
              >
                <button
                  onClick={() => removeMaterial(mat.id)}
                  className="absolute top-4 right-4 text-stone-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <input
                  value={mat.name}
                  onChange={(e) =>
                    updateMaterial(mat.id, { name: e.target.value })
                  }
                  className="bg-transparent text-white font-bold text-lg border-b border-transparent hover:border-stone-700 focus:border-orange-500 focus:outline-none w-[90%]"
                />
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase font-bold tracking-widest text-stone-500">
                      Unidad
                    </label>
                    <select
                      value={mat.unit}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (isUnit(val)) {
                          updateMaterial(mat.id, { unit: val });
                        }
                      }}
                      className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2 text-xs font-mono text-orange-400 focus:outline-none"
                    >
                      <option value="m">Metro</option>
                      <option value="100pack">Ciento</option>
                      <option value="dozen">Docena</option>
                      <option value="unit">Unidad</option>
                      <option value="spool">Cono</option>
                      <option value="service">Servicio</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase font-bold tracking-widest text-stone-500">
                      Costo (Bs)
                    </label>
                    <input
                      type="number"
                      value={mat.pricePerUnit}
                      onChange={(e) =>
                        updateMaterial(mat.id, {
                          pricePerUnit: Number(e.target.value),
                        })
                      }
                      className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2 text-xs font-mono text-amber-400 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label
                      className="text-[11px] uppercase font-bold tracking-widest text-stone-500"
                      title="Porcentaje de merma"
                    >
                      Merma (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={mat.wastagePercentage || 0}
                      onChange={(e) =>
                        updateMaterial(mat.id, {
                          wastagePercentage: Number(e.target.value),
                        })
                      }
                      className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2 text-xs font-mono text-red-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-stone-800/80">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] uppercase font-bold tracking-widest text-stone-500">
                        Margen Menor (%)
                      </label>
                      {mat.retailMargin !== undefined && (
                        <span className="text-[9px] text-amber-400 font-bold uppercase tracking-wider">
                          Override
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      value={mat.retailMargin !== undefined ? mat.retailMargin : ""}
                      placeholder={`Heredado (${config.profitMargin ?? 35}%)`}
                      onChange={(e) => {
                        const val = e.target.value.trim();
                        updateMaterial(mat.id, {
                          retailMargin: val === "" ? undefined : Number(val),
                        });
                      }}
                      className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2 text-xs font-mono text-emerald-400 placeholder:text-stone-600 focus:outline-none focus:border-orange-500 text-right"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] uppercase font-bold tracking-widest text-stone-500">
                        Margen Mayor (%)
                      </label>
                      {mat.wholesaleMargin !== undefined && (
                        <span className="text-[9px] text-amber-400 font-bold uppercase tracking-wider">
                          Override
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      value={mat.wholesaleMargin !== undefined ? mat.wholesaleMargin : ""}
                      placeholder={`Heredado (${config.wholesaleMargin ?? 20}%)`}
                      onChange={(e) => {
                        const val = e.target.value.trim();
                        updateMaterial(mat.id, {
                          wholesaleMargin: val === "" ? undefined : Number(val),
                        });
                      }}
                      className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2 text-xs font-mono text-blue-400 placeholder:text-stone-600 focus:outline-none focus:border-orange-500 text-right"
                    />
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* OTHER INGREDIENTS SECTION */}
      <div className="space-y-6">
        <div className="flex justify-between items-end border-b border-stone-800 pb-4">
          <div>
            <h2 className="text-2xl font-black italic uppercase">Insumos</h2>
            <p className="text-stone-400 text-sm mt-1">
              Registra hilos, broches, hebillas de plástico (s).
            </p>
          </div>
          <button
            onClick={() => addMaterial("other")}
            className="bg-orange-500/10 text-orange-500 border border-orange-500/30 px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-orange-500/20 font-mono text-xs uppercase tracking-widest font-bold"
          >
            <Plus className="w-3 h-3" /> Agregar Insumo
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {config.materials
            .filter((m) => m.category === "other")
            .map((mat) => (
              <div
                key={mat.id}
                className="bg-stone-900 border border-stone-800 p-4 rounded-2xl flex flex-col gap-3 group relative"
              >
                <button
                  onClick={() => removeMaterial(mat.id)}
                  className="absolute top-4 right-4 text-stone-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <input
                  value={mat.name}
                  onChange={(e) =>
                    updateMaterial(mat.id, { name: e.target.value })
                  }
                  className="bg-transparent text-white font-bold text-lg border-b border-transparent hover:border-stone-700 focus:border-orange-500 focus:outline-none w-[90%]"
                />
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase font-bold tracking-widest text-stone-500">
                      Unidad
                    </label>
                    <select
                      value={mat.unit}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (isUnit(val)) {
                          updateMaterial(mat.id, { unit: val });
                        }
                      }}
                      className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2 text-xs font-mono text-orange-400 focus:outline-none"
                    >
                      <option value="m">Metro</option>
                      <option value="100pack">Ciento</option>
                      <option value="dozen">Docena</option>
                      <option value="unit">Unidad</option>
                      <option value="spool">Cono</option>
                      <option value="service">Servicio</option>
                      <option value="batch">Lote (Batch)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase font-bold tracking-widest text-stone-500">
                      {mat.unit === "batch" ? "Costo Lote (Bs)" : "Costo (Bs)"}
                    </label>
                    <input
                      type="number"
                      value={mat.pricePerUnit}
                      onChange={(e) =>
                        updateMaterial(mat.id, {
                          pricePerUnit: Number(e.target.value),
                        })
                      }
                      className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2 text-xs font-mono text-amber-400 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label
                      className="text-[11px] uppercase font-bold tracking-widest text-stone-500"
                      title="Porcentaje de merma"
                    >
                      Merma (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={mat.wastagePercentage || 0}
                      onChange={(e) =>
                        updateMaterial(mat.id, {
                          wastagePercentage: Number(e.target.value),
                        })
                      }
                      className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2 text-xs font-mono text-red-400 focus:outline-none"
                    />
                  </div>
                </div>
                {mat.unit === "batch" && (
                  <div className="space-y-1 bg-orange-500/10 p-2.5 rounded-lg border border-orange-500/20">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-orange-500 block">
                      Unidades por Lote / Bloque
                    </label>
                    <div className="flex gap-2 items-center">
                      <span className="text-xs text-stone-400">1 Lote =</span>
                      <input
                        type="number"
                        min="1"
                        value={mat.batchSize || 1}
                        onChange={(e) =>
                          updateMaterial(mat.id, {
                            batchSize: Math.max(1, Number(e.target.value)),
                          })
                        }
                        className="w-20 bg-stone-950 border border-stone-800 rounded-lg p-1.5 text-xs font-mono text-white focus:outline-none text-right"
                        placeholder="Ej: 6"
                      />
                      <span className="text-xs text-stone-400">
                        unids. (ej. 1-6 = 1 lote)
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
