import React from "react";
import { Trash2, X } from "lucide-react";
import { Material, ProductIngredient, Unit } from "../../types";
import { getMaterialTrueCostPerUnit } from "../../utils/calculations";
import { isUnit } from "../../utils/validation";
import { AccessoryBatchSimulator } from "./AccessoryBatchSimulator";

interface AccessoryCardProps {
  key?: React.Key;
  mat: Material;
  materials: Material[];
  updateMaterial: (id: string, updates: Partial<Material>) => void;
  removeMaterial: (id: string) => void;
}

export function AccessoryCard({
  mat,
  materials,
  updateMaterial,
  removeMaterial,
}: AccessoryCardProps) {
  const isManufactured = mat.originType === "manufactured";

  const addIngredient = () => {
    const available = materials.filter(
      (m) =>
        m.category === "other" ||
        m.category === "accessory" ||
        m.category === "fabric" ||
        m.category === "service"
    );
    if (available.length === 0) return alert("Primero registra materiales.");

    updateMaterial(mat.id, {
      ingredients: [
        ...(mat.ingredients || []),
        { materialId: available[0].id, quantity: 1 },
      ],
    });
  };

  const removeIngredient = (index: number) => {
    const newIngs = [...(mat.ingredients || [])];
    newIngs.splice(index, 1);
    updateMaterial(mat.id, { ingredients: newIngs });
  };

  const updateIngredient = (
    index: number,
    updates: Partial<ProductIngredient>
  ) => {
    const newIngs = [...(mat.ingredients || [])];
    newIngs[index] = { ...newIngs[index], ...updates };
    updateMaterial(mat.id, { ingredients: newIngs });
  };

  const trueCost = getMaterialTrueCostPerUnit(mat, materials);

  return (
    <div className="bg-stone-900 border border-stone-800 p-4 rounded-2xl flex flex-col gap-3 group relative">
      <button
        onClick={() => removeMaterial(mat.id)}
        className="absolute top-4 right-4 text-stone-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-10"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      <input
        value={mat.name}
        onChange={(e) => updateMaterial(mat.id, { name: e.target.value })}
        className="bg-transparent text-white font-bold text-lg border-b border-transparent hover:border-stone-700 focus:border-orange-500 focus:outline-none w-[90%]"
        placeholder="Nombre Accesorio"
      />

      <div className="flex bg-stone-950 rounded-lg p-1">
        <button
          onClick={() => updateMaterial(mat.id, { originType: "bought" })}
          className={`flex-1 text-[10px] font-bold uppercase py-1.5 rounded-md transition-colors ${
            !isManufactured
              ? "bg-orange-500 text-white"
              : "text-stone-500 hover:text-stone-300"
          }`}
        >
          Comprado
        </button>
        <button
          onClick={() =>
            updateMaterial(mat.id, { originType: "manufactured" })
          }
          className={`flex-1 text-[10px] font-bold uppercase py-1.5 rounded-md transition-colors ${
            isManufactured
              ? "bg-orange-500 text-white"
              : "text-stone-500 hover:text-stone-300"
          }`}
        >
          Fabricado
        </button>
      </div>

      {!isManufactured && (
        <div className="space-y-2 mt-2">
          <div className="grid grid-cols-2 gap-2">
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
                className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2 text-sm text-white focus:outline-none"
              >
                <option value="unit">Unidad</option>
                <option value="100pack">Ciento</option>
                <option value="dozen">Docena</option>
                <option value="m">Metros</option>
                <option value="spool">Cono</option>
                <option value="service">Servicio</option>
                <option value="batch">Lote (Batch)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] uppercase font-bold tracking-widest text-stone-500">
                Costo Compra (Bs)
              </label>
              <input
                type="number"
                value={mat.pricePerUnit}
                onChange={(e) =>
                  updateMaterial(mat.id, {
                    pricePerUnit: Number(e.target.value),
                  })
                }
                className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2 text-sm font-mono text-orange-400 focus:outline-none text-right"
              />
            </div>
          </div>
          {mat.unit === "batch" && (
            <div className="space-y-1 bg-orange-500/10 p-2 rounded-lg border border-orange-500/20">
              <label className="text-[11px] uppercase font-bold tracking-widest text-orange-500">
                Unidades por Lote
              </label>
              <div className="flex gap-2 items-center">
                <span className="text-xs text-stone-400">1 Lote =</span>
                <input
                  type="number"
                  value={mat.batchSize || 1}
                  onChange={(e) =>
                    updateMaterial(mat.id, {
                      batchSize: Number(e.target.value),
                    })
                  }
                  className="flex-1 bg-stone-950 border border-stone-800 rounded-lg p-1.5 text-sm font-mono text-white focus:outline-none text-right"
                  placeholder="Ej: 6"
                />
                <span className="text-xs text-stone-400">unids.</span>
              </div>
            </div>
          )}
        </div>
      )}

      {isManufactured && (
        <div className="mt-2 space-y-3 bg-stone-950 p-3 rounded-xl border border-stone-800">
          <div className="flex justify-between items-center border-b border-stone-800 pb-2">
            <span className="text-[11px] uppercase font-bold text-stone-500">
              Insumos (Receta)
            </span>
            <button
              onClick={addIngredient}
              className="text-[10px] bg-stone-800 text-stone-300 px-2 py-1 rounded font-bold hover:bg-stone-700"
            >
              + Insumo
            </button>
          </div>
          <div className="space-y-2">
            {(mat.ingredients || []).map((ing, i) => {
              const available = materials.filter((m) => m.category !== "fabric");
              const currentIng = materials.find((m) => m.id === ing.materialId);
              let qtyLabel = "Cant.";
              if (currentIng) {
                if (
                  currentIng.unit === "dozen" ||
                  currentIng.unit === "100pack" ||
                  currentIng.unit === "unit"
                )
                  qtyLabel = "Unid.";
                else if (currentIng.unit === "m") qtyLabel = "Metros";
                else if (currentIng.unit === "spool") qtyLabel = "Conos";
                else if (currentIng.unit === "service") qtyLabel = "Servicios";
              }
              return (
                <div key={i} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="text-[9px] uppercase font-bold text-stone-500 block mb-0.5">
                      Material
                    </label>
                    <select
                      value={ing.materialId}
                      onChange={(e) =>
                        updateIngredient(i, { materialId: e.target.value })
                      }
                      className="w-full bg-stone-900 border border-stone-700 rounded-lg p-1.5 text-xs text-white"
                    >
                      {available.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-20 shrink-0">
                    <label className="text-[9px] uppercase font-bold text-stone-500 block mb-0.5 text-right">
                      {qtyLabel}
                    </label>
                    <input
                      type="number"
                      value={ing.quantity}
                      onChange={(e) =>
                        updateIngredient(i, {
                          quantity: Number(e.target.value),
                        })
                      }
                      className="w-full bg-stone-900 border border-stone-700 rounded-lg p-1.5 text-xs text-right text-orange-400 font-mono"
                    />
                  </div>
                  <button
                    onClick={() => removeIngredient(i)}
                    className="text-stone-500 hover:text-red-500 pb-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-stone-800">
        <div className="space-y-1">
          <label
            className="text-[11px] uppercase font-bold tracking-widest text-stone-500"
            title="Transporte, mermas u otros gastos"
          >
            Costo Extra Logística
          </label>
          <input
            type="number"
            value={mat.extraCosts || 0}
            onChange={(e) =>
              updateMaterial(mat.id, { extraCosts: Number(e.target.value) })
            }
            className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2 text-sm font-mono text-stone-300 focus:outline-none text-right"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] uppercase font-bold tracking-widest text-emerald-500">
            Costo Real Interno
          </label>
          <div className="w-full bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2 text-sm font-mono text-emerald-400 text-right">
            Bs {trueCost.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-stone-800">
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label className="text-[10px] uppercase font-bold tracking-widest text-stone-500">
              Margen Menor (%)
            </label>
            {mat.retailMargin === undefined && (
              <span className="text-[9px] text-stone-500 italic">Defecto 35%</span>
            )}
          </div>
          <input
            type="number"
            value={mat.retailMargin !== undefined ? mat.retailMargin : ""}
            placeholder="35"
            onChange={(e) => {
              const val = e.target.value.trim();
              updateMaterial(mat.id, {
                retailMargin: val === "" ? undefined : Number(val),
              });
            }}
            className="w-full bg-stone-950 border border-stone-800 rounded-lg p-1.5 text-xs font-mono text-white focus:outline-none text-right focus:border-orange-500"
          />
        </div>
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label className="text-[10px] uppercase font-bold tracking-widest text-stone-500">
              Margen Mayor (%)
            </label>
            {mat.wholesaleMargin === undefined && (
              <span className="text-[9px] text-stone-500 italic">Defecto 20%</span>
            )}
          </div>
          <input
            type="number"
            value={mat.wholesaleMargin !== undefined ? mat.wholesaleMargin : ""}
            placeholder="20"
            onChange={(e) => {
              const val = e.target.value.trim();
              updateMaterial(mat.id, {
                wholesaleMargin: val === "" ? undefined : Number(val),
              });
            }}
            className="w-full bg-stone-950 border border-stone-800 rounded-lg p-1.5 text-xs font-mono text-white focus:outline-none text-right focus:border-orange-500"
          />
        </div>
      </div>

      <div className="mt-1 flex items-center gap-2">
        <input
          type="checkbox"
          checked={mat.isSoldSeparately || false}
          onChange={(e) =>
            updateMaterial(mat.id, { isSoldSeparately: e.target.checked })
          }
          className="accent-orange-500"
          id={`sold-${mat.id}`}
        />
        <label
          htmlFor={`sold-${mat.id}`}
          className="text-xs font-bold text-stone-400 cursor-pointer"
        >
          Se vende por separado (Producto independiente)
        </label>
      </div>

      <AccessoryBatchSimulator mat={mat} materials={materials} />
    </div>
  );
}
