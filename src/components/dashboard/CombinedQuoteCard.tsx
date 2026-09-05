import React from "react";
import { Material } from "../../types";
import { calculateAccessoryBatchPricing } from "../../utils/calculations";

interface CombinedQuoteCardProps {
  customRetailPrice: string;
  customWholesalePrice: string;
  recommendedPrice: number;
  recommendedWholesalePrice: number;
  costFloor: number;
  selectedAccessoryIds: string[];
  accessoryQuantities: Record<string, number>;
  materials: Material[];
}

export function CombinedQuoteCard({
  customRetailPrice,
  customWholesalePrice,
  recommendedPrice,
  recommendedWholesalePrice,
  costFloor,
  selectedAccessoryIds,
  accessoryQuantities,
  materials,
}: CombinedQuoteCardProps) {
  const baseRetail =
    customRetailPrice !== "" ? parseFloat(customRetailPrice) : recommendedPrice;
  const baseWholesale =
    customWholesalePrice !== ""
      ? parseFloat(customWholesalePrice)
      : recommendedWholesalePrice;

  let totalAccRetail = 0;
  let totalAccWholesale = 0;
  let totalAccCost = 0;
  let referenceQty = 1;

  selectedAccessoryIds.forEach((accId) => {
    const acc = materials.find((m) => m.id === accId);
    if (acc) {
      const qty = accessoryQuantities[accId] || acc.batchSize || 6;
      referenceQty = Math.max(referenceQty, qty);
      const c = calculateAccessoryBatchPricing(acc, qty, materials);
      totalAccRetail += c.unitRetailPrice;
      totalAccWholesale += c.unitWholesalePrice;
      totalAccCost += c.unitCost;
    }
  });

  const combinedRetailUnit = baseRetail + totalAccRetail;
  const combinedWholesaleUnit = baseWholesale + totalAccWholesale;
  const combinedCostUnit = costFloor + totalAccCost;

  const totalOrderRetail = combinedRetailUnit * referenceQty;
  const totalOrderWholesale = combinedWholesaleUnit * referenceQty;
  const totalOrderProfitRetail = (combinedRetailUnit - combinedCostUnit) * referenceQty;

  return (
    <div className="bg-amber-500/10 border border-amber-500/30 p-5 rounded-2xl mt-4">
      <h4 className="text-sm font-black italic text-amber-400 uppercase tracking-wider mb-3">
        Cotización Final Combinada (Prenda + Accesorios Seleccionados)
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 space-y-2">
          <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">
            Composición por Unidad
          </span>
          <div className="text-xs space-y-1 font-mono">
            <div className="flex justify-between text-stone-400">
              <span>Prenda base:</span>
              <span className="text-white">Bs {baseRetail.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-stone-400">
              <span>Accesorios ({selectedAccessoryIds.length}):</span>
              <span className="text-amber-400">+Bs {totalAccRetail.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold pt-1 border-t border-stone-800 text-white">
              <span>Total Terminado:</span>
              <span className="text-emerald-400">Bs {combinedRetailUnit.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 space-y-2">
          <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">
            Precio Mayorista con Accesorios
          </span>
          <div className="text-xs space-y-1 font-mono">
            <div className="flex justify-between text-stone-400">
              <span>Prenda base (Mayor):</span>
              <span className="text-white">Bs {baseWholesale.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-stone-400">
              <span>Accesorios (Mayor):</span>
              <span className="text-amber-400">+Bs {totalAccWholesale.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold pt-1 border-t border-stone-800 text-white">
              <span>Total Mayor:</span>
              <span className="text-emerald-400">Bs {combinedWholesaleUnit.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 space-y-2">
          <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider block">
            Total Pedido ({referenceQty} prendas terminadas)
          </span>
          <div className="text-xs space-y-1 font-mono">
            <div className="flex justify-between text-stone-400">
              <span>Cobro Total Menor:</span>
              <span className="text-xl text-white font-black">Bs {totalOrderRetail.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-stone-400">
              <span>Ganancia Neta Pedido:</span>
              <span className="text-emerald-400 font-bold">+Bs {totalOrderProfitRetail.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
