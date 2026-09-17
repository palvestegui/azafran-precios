import React from "react";
import { Material } from "../../types";
import { calculateAccessoryBatchPricing, roundBob } from "../../utils/calculations";

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

  const combinedRetailUnit = roundBob(baseRetail + totalAccRetail);
  const combinedWholesaleUnit = roundBob(baseWholesale + totalAccWholesale);
  const combinedCostUnit = costFloor + totalAccCost;

  const totalOrderRetail = combinedRetailUnit * referenceQty;
  const totalOrderWholesale = combinedWholesaleUnit * referenceQty;
  const totalOrderProfitRetail = (combinedRetailUnit - combinedCostUnit) * referenceQty;
  const totalOrderProfitWholesale = (combinedWholesaleUnit - combinedCostUnit) * referenceQty;

  return (
    <div className="bg-amber-500/10 border border-amber-500/30 p-4 sm:p-5 rounded-xl mt-4">
      <h4 className="text-xs font-black italic text-amber-400 uppercase tracking-wider mb-3">
        Cotización Final Combinada (Prenda + Accesorios Seleccionados)
      </h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
        {/* CARD 1: UNIDAD MINORISTA */}
        <div className="bg-stone-950 p-3.5 rounded-xl border border-stone-800 space-y-2">
          <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">
            Composición por Unidad Minorista
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
            <div className="flex justify-between text-sm font-bold pt-1.5 border-t border-stone-800 text-white">
              <span>Total Menor:</span>
              <span className="text-emerald-400">Bs {combinedRetailUnit.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* CARD 2: UNIDAD MAYORISTA */}
        <div className="bg-stone-950 p-3.5 rounded-xl border border-stone-800 space-y-2">
          <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">
            Composición por Unidad Mayorista
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
            <div className="flex justify-between text-sm font-bold pt-1.5 border-t border-stone-800 text-white">
              <span>Total Mayor:</span>
              <span className="text-emerald-400">Bs {combinedWholesaleUnit.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* CARD 3: TOTAL PEDIDO MINORISTA */}
        <div className="bg-stone-950 p-3.5 rounded-xl border border-stone-800 space-y-2">
          <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider block">
            Total Pedido Minorista ({referenceQty} u.)
          </span>
          <div className="text-xs space-y-1 font-mono">
            <div className="flex justify-between text-stone-400 items-baseline">
              <span>Cobro Total Menor:</span>
              <span className="text-base text-white font-black">Bs {totalOrderRetail.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-stone-400 pt-1.5 border-t border-stone-800">
              <span>Ganancia Neta Pedido:</span>
              <span className="text-emerald-400 font-bold">
                {totalOrderProfitRetail >= 0 ? "+" : ""}Bs {totalOrderProfitRetail.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* CARD 4: TOTAL PEDIDO MAYORISTA */}
        <div className="bg-stone-950 p-3.5 rounded-xl border border-stone-800 space-y-2">
          <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider block">
            Total Pedido Mayorista ({referenceQty} u.)
          </span>
          <div className="text-xs space-y-1 font-mono">
            <div className="flex justify-between text-stone-400 items-baseline">
              <span>Cobro Total Mayor:</span>
              <span className="text-base text-white font-black">Bs {totalOrderWholesale.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-stone-400 pt-1.5 border-t border-stone-800">
              <span>Ganancia Neta Pedido:</span>
              <span className="text-emerald-400 font-bold">
                {totalOrderProfitWholesale >= 0 ? "+" : ""}Bs {totalOrderProfitWholesale.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
