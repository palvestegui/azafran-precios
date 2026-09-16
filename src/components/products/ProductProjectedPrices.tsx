import React from "react";
import { GlobalConfig, Product } from "../../types";
import { calculateMatrixCell } from "../../utils/pricingMatrix";

interface ProductProjectedPricesProps {
  draftProduct: Product;
  config: GlobalConfig;
  isDirty: boolean;
}

export function ProductProjectedPrices({
  draftProduct,
  config,
  isDirty,
}: ProductProjectedPricesProps) {
  return (
    <div className="shrink-0 pt-4 border-t border-stone-800">
      <label className="text-[10px] uppercase font-bold text-stone-500 tracking-wider mb-2 block">
        Precios Finales Proyectados{" "}
        {isDirty && (
          <span className="text-amber-400/80 lowercase italic font-normal">
            (en borrador)
          </span>
        )}
      </label>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
        {(draftProduct.allowedFabricIds || []).map((fabricId) => {
          const fabric = config.materials.find((m) => m.id === fabricId);
          if (!fabric) return null;
          const calc = calculateMatrixCell(draftProduct, fabric, config);
          if (!calc || !calc.isApplicable) return null;

          return (
            <div
              key={fabricId}
              className="bg-stone-950 border border-stone-800 rounded-lg p-3 min-w-[200px] shrink-0 flex flex-col justify-between"
            >
              <div className="text-xs font-bold truncate text-white mb-2">
                {fabric.name}
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-[9px] uppercase text-stone-500 font-mono tracking-wider">
                    Costo
                  </div>
                  <div className="text-sm font-mono text-stone-300">
                    Bs {calc.costFloor.toFixed(1)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] uppercase text-stone-500 font-mono tracking-wider">
                    Menudeo
                  </div>
                  <div className="text-sm font-mono font-bold text-emerald-400">
                    Bs {calc.retailPrice.toFixed(0)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {(!draftProduct.allowedFabricIds || draftProduct.allowedFabricIds.length === 0) && (
          <div className="text-xs text-stone-600 italic p-2">
            Selecciona telas permitidas arriba para ver proyecciones.
          </div>
        )}
      </div>
    </div>
  );
}
