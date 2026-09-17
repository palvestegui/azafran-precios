import React from "react";
import { Trash2 } from "lucide-react";
import { GlobalConfig, Product, Material } from "../../types";

interface ProductIngredientsTableProps {
  draftProduct: Product;
  config: GlobalConfig;
  insumos: Material[];
  onAddIngredient: (matId: string) => void;
  onUpdateIngredient: (matId: string, quantity: number) => void;
  onRemoveIngredient: (matId: string) => void;
}

export function ProductIngredientsTable({
  draftProduct,
  config,
  insumos,
  onAddIngredient,
  onUpdateIngredient,
  onRemoveIngredient,
}: ProductIngredientsTableProps) {
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex justify-between items-end mb-2">
        <label className="text-[10px] uppercase font-bold text-stone-500 tracking-wider block">
          Insumos & Costos Fijos
        </label>
        <select
          className="bg-stone-950 border border-stone-800 rounded px-2 py-1 text-xs text-white focus:border-amber-500 outline-none max-w-[150px]"
          onChange={(e) => {
            if (e.target.value) {
              onAddIngredient(e.target.value);
              e.target.value = "";
            }
          }}
          value=""
        >
          <option value="">+ Añadir Insumo...</option>
          {insumos.map((i) => (
            <option
              key={i.id}
              value={i.id}
              disabled={draftProduct.ingredients.some((ing) => ing.materialId === i.id)}
            >
              {i.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex-1 border border-stone-800 bg-stone-950 rounded-xl overflow-y-auto">
        <table className="w-full text-left text-xs text-stone-300">
          <thead className="bg-stone-900/80 sticky top-0 font-mono text-[10px] uppercase text-stone-500">
            <tr>
              <th className="px-3 py-2 min-w-[160px] max-w-[240px]">Insumo</th>
              <th className="px-2 py-2 w-16 text-center">Cant.</th>
              <th className="px-2 py-2 w-12 text-center">Unid.</th>
              <th className="px-2 py-2 w-20 text-right">Costo</th>
              <th className="px-1 py-2 w-8 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-800/50">
            {draftProduct.ingredients.map((ing) => {
              const mat = config.materials.find((m) => m.id === ing.materialId);
              if (!mat) return null;
              const cost = (mat.pricePerUnit + (mat.extraCosts || 0)) * ing.quantity;
              return (
                <tr key={ing.materialId} className="hover:bg-stone-800/30">
                  <td
                    className="px-3 py-2 min-w-[160px] max-w-[240px] whitespace-normal break-words leading-tight text-xs font-bold text-stone-200"
                    title={mat.name}
                  >
                    {mat.name}
                  </td>
                  <td className="px-2 py-2 w-16 text-center">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className="w-16 bg-stone-900 border border-stone-700 rounded px-1.5 py-1 text-white focus:border-amber-500 outline-none text-center font-mono text-xs"
                      value={ing.quantity || ""}
                      onChange={(e) =>
                        onUpdateIngredient(mat.id, parseFloat(e.target.value) || 0)
                      }
                      onWheel={(e) => e.currentTarget.blur()}
                    />
                  </td>
                  <td className="px-2 py-2 w-12 text-center text-stone-500 font-mono text-[11px] truncate">
                    {mat.unit}
                  </td>
                  <td className="px-2 py-2 w-20 text-right font-mono text-amber-500/80 whitespace-nowrap text-xs">
                    Bs {cost.toFixed(2)}
                  </td>
                  <td className="px-1 py-2 w-8 text-center">
                    <button
                      type="button"
                      onClick={() => onRemoveIngredient(mat.id)}
                      className="text-stone-600 hover:text-red-400 p-1 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {draftProduct.ingredients.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-stone-600 italic">
                  Sin insumos registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
