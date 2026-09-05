import React, { useState } from "react";
import { Layers } from "lucide-react";
import { Material } from "../../types";
import { calculateAccessoryBatchPricing } from "../../utils/calculations";

export interface AccessoryBatchSimulatorProps {
  mat: Material;
  materials: Material[];
}

/**
 * In-situ simulator for batch-priced accessories (e.g. logo embroidery billed in blocks).
 */
export function AccessoryBatchSimulator({
  mat,
  materials,
}: AccessoryBatchSimulatorProps) {
  const [cardSimQty, setCardSimQty] = useState<number>(mat.batchSize || 6);

  if (mat.unit !== "batch") return null;

  const calc = calculateAccessoryBatchPricing(mat, cardSimQty, materials);

  return (
    <div className="mt-2 pt-2 border-t border-stone-800 space-y-2 bg-stone-950/80 p-3 rounded-xl border border-amber-500/20">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
          <Layers className="w-3.5 h-3.5 text-amber-400" />
          Simulador de Cobro por Lote
        </span>
        <span className="text-[10px] font-mono text-stone-400">
          1 Lote = {mat.batchSize || 6}u
        </span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-stone-400">Simular pedido:</span>
        <div className="flex gap-1">
          {[1, 3, 6, 8, 12, 30].map((qty) => (
            <button
              key={qty}
              type="button"
              onClick={() => setCardSimQty(qty)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                cardSimQty === qty
                  ? "bg-amber-500 text-stone-950"
                  : "bg-stone-900 text-stone-400 hover:text-white"
              }`}
            >
              {qty}u
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1 text-[11px] font-mono bg-stone-900/60 p-2 rounded-lg text-stone-300">
        <div className="flex justify-between">
          <span className="text-stone-400">Lotes contratados:</span>
          <span className="text-white font-bold">
            {calc.batchesCount}{" "}
            {calc.batchesCount === 1 ? "lote" : "lotes"} (Bs{" "}
            {calc.totalCost.toFixed(2)})
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-400">Costo unitario real:</span>
          <span className="text-amber-400">
            Bs {calc.unitCost.toFixed(2)}/u
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-400">Precio sugerido (Menor):</span>
          <span className="text-emerald-400 font-bold">
            Bs {calc.unitRetailPrice.toFixed(2)}/u
          </span>
        </div>
        <div className="flex justify-between border-t border-stone-800/80 pt-1">
          <span className="text-stone-400">
            Ganancia neta ({cardSimQty}u):
          </span>
          <span className="text-emerald-400 font-bold">
            +Bs {calc.retailProfit.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
