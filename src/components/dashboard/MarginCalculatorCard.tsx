import React from "react";
import { calculateProfitAndMargin } from "../../utils/calculations";

interface MarginCalculatorCardProps {
  customRetailPrice: string;
  setCustomRetailPrice: (val: string) => void;
  customWholesalePrice: string;
  setCustomWholesalePrice: (val: string) => void;
  costFloor: number;
  recommendedPrice: number;
  recommendedWholesalePrice: number;
}

export function MarginCalculatorCard({
  customRetailPrice,
  setCustomRetailPrice,
  customWholesalePrice,
  setCustomWholesalePrice,
  costFloor,
  recommendedPrice,
  recommendedWholesalePrice,
}: MarginCalculatorCardProps) {
  const retailPrice =
    customRetailPrice !== "" ? parseFloat(customRetailPrice) : recommendedPrice;
  const retailStats = calculateProfitAndMargin(retailPrice, costFloor);

  const wholesalePrice =
    customWholesalePrice !== ""
      ? parseFloat(customWholesalePrice)
      : recommendedWholesalePrice;
  const wholesaleStats = calculateProfitAndMargin(wholesalePrice, costFloor);

  return (
    <div className="flex flex-col justify-center space-y-6">
      <div className="text-center">
        <h3 className="font-bold text-orange-500 text-sm uppercase tracking-widest mb-1">
          Calculadora de Margen
        </h3>
        <p className="text-stone-500 text-xs">
          Precios unitarios recomendados para la prenda base
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {/* D2C Card */}
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 text-center shadow-sm flex flex-col items-center">
          <div className="text-stone-300 font-bold text-sm mb-4">
            Venta al por Menor
          </div>

          <div className="w-full mb-4">
            <div className="text-stone-500 text-xs mb-1">Precio Unitario</div>
            <input
              type="number"
              value={
                customRetailPrice !== ""
                  ? customRetailPrice
                  : recommendedPrice.toFixed(2)
              }
              onWheel={(e) => e.currentTarget.blur()}
              onChange={(e) => setCustomRetailPrice(e.target.value)}
              className="w-full text-center text-2xl font-bold text-white focus:outline-none focus:border-b-2 focus:border-orange-500 bg-transparent transition-colors"
            />
          </div>

          <div className="w-full mb-4 relative">
            {retailStats.isLoss && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap z-10">
                VENDIENDO CON PÉRDIDA
              </div>
            )}
            <div className="text-stone-500 text-xs mb-1">Ganancia Unit.</div>
            <div
              className={`text-2xl font-bold ${
                retailStats.isLoss ? "text-red-400" : "text-white"
              }`}
            >
              {retailStats.grossProfit.toFixed(2)}
            </div>
          </div>

          <div className="w-full pt-4 border-t border-stone-800 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-stone-500">Margen:</span>
              <span
                className={`font-bold font-mono ${
                  retailStats.isLoss ? "text-red-400" : "text-emerald-400"
                }`}
              >
                {retailStats.profitMargin.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* B2B Card */}
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 text-center shadow-sm flex flex-col items-center">
          <div className="text-stone-300 font-bold text-sm mb-4">Mayorista</div>

          <div className="w-full mb-4">
            <div className="text-stone-500 text-xs mb-1">Precio Unitario</div>
            <input
              type="number"
              value={
                customWholesalePrice !== ""
                  ? customWholesalePrice
                  : recommendedWholesalePrice.toFixed(2)
              }
              onWheel={(e) => e.currentTarget.blur()}
              onChange={(e) => setCustomWholesalePrice(e.target.value)}
              className="w-full text-center text-2xl font-bold text-white focus:outline-none focus:border-b-2 focus:border-orange-500 bg-transparent transition-colors"
            />
          </div>

          <div className="w-full mb-4 relative">
            {wholesaleStats.isLoss && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg whitespace-nowrap z-10">
                VENDIENDO CON PÉRDIDA
              </div>
            )}
            <div className="text-stone-500 text-xs mb-1">Ganancia Unit.</div>
            <div
              className={`text-2xl font-bold ${
                wholesaleStats.isLoss ? "text-red-400" : "text-white"
              }`}
            >
              {wholesaleStats.grossProfit.toFixed(2)}
            </div>
          </div>

          <div className="w-full pt-4 border-t border-stone-800 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-stone-500">Margen:</span>
              <span
                className={`font-bold font-mono ${
                  wholesaleStats.isLoss ? "text-red-400" : "text-emerald-400"
                }`}
              >
                {wholesaleStats.profitMargin.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
