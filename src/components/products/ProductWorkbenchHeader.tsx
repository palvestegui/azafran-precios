import React from "react";
import { Plus, Trash2, Copy } from "lucide-react";
import { GlobalConfig, Material, Product } from "../../types";
import { AllowedFabricsDropdown } from "./AllowedFabricsDropdown";

interface ProductWorkbenchHeaderProps {
  draftProduct: Product;
  config: GlobalConfig;
  fabrics: Material[];
  updateDraft: (updates: Partial<Product>) => void;
  onCloneProduct: () => void;
  onDeleteProduct: () => void;
}

export function ProductWorkbenchHeader({
  draftProduct,
  config,
  fabrics,
  updateDraft,
  onCloneProduct,
  onDeleteProduct,
}: ProductWorkbenchHeaderProps) {
  return (
    <div className="flex flex-wrap items-end gap-3.5">
      {/* Nombre de Prenda */}
      <div className="flex-1 min-w-[180px]">
        <label className="text-[10px] uppercase font-bold text-stone-500 tracking-wider mb-1 block">
          Nombre de Prenda
        </label>
        <input
          type="text"
          className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-white focus:border-amber-500 outline-none text-sm font-bold"
          value={draftProduct.name}
          onChange={(e) => updateDraft({ name: e.target.value })}
        />
      </div>

      {/* Esfuerzo (x) */}
      <div className="w-28">
        <label className="text-[10px] uppercase font-bold text-stone-500 tracking-wider mb-1 block">
          Esfuerzo (x)
        </label>
        <input
          type="number"
          step="0.05"
          min="0.1"
          className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-white focus:border-amber-500 outline-none text-sm font-mono text-center"
          value={draftProduct.productionWeight ?? 1}
          onChange={(e) =>
            updateDraft({ productionWeight: parseFloat(e.target.value) || 0 })
          }
          onWheel={(e) => e.currentTarget.blur()}
        />
      </div>

      {/* Tela Principal */}
      <div className="w-44">
        <label className="text-[10px] uppercase font-bold text-stone-500 tracking-wider mb-1 block">
          Tela Principal
        </label>
        <select
          className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-white focus:border-amber-500 outline-none text-sm"
          value={draftProduct.defaultFabricId || ""}
          onChange={(e) => updateDraft({ defaultFabricId: e.target.value })}
        >
          <option value="">Seleccionar...</option>
          {fabrics.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </div>

      {/* Telas Habilitadas */}
      <div className="relative">
        <AllowedFabricsDropdown
          allowedFabrics={draftProduct.allowedFabricIds || []}
          allFabrics={fabrics}
          baseFabric={draftProduct.defaultFabricId || ""}
          onChange={(newAllowed) => updateDraft({ allowedFabricIds: newAllowed })}
        />
      </div>

      {/* Metros/Unidad */}
      <div className="w-28">
        <label className="text-[10px] uppercase font-bold text-stone-500 tracking-wider mb-1 block">
          Metros/Unidad
        </label>
        <input
          type="number"
          step="0.05"
          min="0"
          className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-white focus:border-amber-500 outline-none text-sm font-mono text-center"
          value={draftProduct.fabricQuantity ?? 0}
          onChange={(e) =>
            updateDraft({ fabricQuantity: parseFloat(e.target.value) || 0 })
          }
          onWheel={(e) => e.currentTarget.blur()}
        />
      </div>

      {/* MARGEN MENUDEO (%) */}
      <div className="w-28">
        <label className="text-[10px] uppercase font-bold text-stone-500 tracking-wider mb-1 block">
          Margen Menudeo (%)
        </label>
        <input
          type="number"
          step="0.5"
          min="0"
          placeholder={String(config.profitMargin || 35)}
          className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-white placeholder:text-stone-600 focus:border-amber-500 outline-none text-sm font-mono text-center"
          value={draftProduct.profitMargin !== undefined ? draftProduct.profitMargin : ""}
          onChange={(e) => {
            const val = e.target.value.trim();
            const parsed = val === "" ? undefined : parseFloat(val);
            const valNum =
              parsed !== undefined && !isNaN(parsed) && parsed >= 0 ? parsed : undefined;
            updateDraft({ profitMargin: valNum });
          }}
          onWheel={(e) => e.currentTarget.blur()}
        />
      </div>

      {/* MARGEN MAYOR (%) */}
      <div className="w-28">
        <label className="text-[10px] uppercase font-bold text-stone-500 tracking-wider mb-1 block">
          Margen Mayor (%)
        </label>
        <input
          type="number"
          step="0.5"
          min="0"
          placeholder={String(config.wholesaleMargin || 20)}
          className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-white placeholder:text-stone-600 focus:border-amber-500 outline-none text-sm font-mono text-center"
          value={draftProduct.wholesaleMargin !== undefined ? draftProduct.wholesaleMargin : ""}
          onChange={(e) => {
            const val = e.target.value.trim();
            const parsed = val === "" ? undefined : parseFloat(val);
            const valNum =
              parsed !== undefined && !isNaN(parsed) && parsed >= 0 ? parsed : undefined;
            updateDraft({ wholesaleMargin: valNum });
          }}
          onWheel={(e) => e.currentTarget.blur()}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 self-end">
        <button
          type="button"
          onClick={onCloneProduct}
          className="text-amber-400 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-xs font-black uppercase px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer h-10 transition-colors"
          title="Duplicar prenda"
        >
          <Copy className="w-3.5 h-3.5" />
          <span>Duplicar Prenda</span>
        </button>
        <button
          type="button"
          onClick={onDeleteProduct}
          className="p-2.5 text-stone-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-colors border border-transparent hover:border-red-400/20 h-10 flex items-center justify-center cursor-pointer"
          title="Eliminar prenda"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
