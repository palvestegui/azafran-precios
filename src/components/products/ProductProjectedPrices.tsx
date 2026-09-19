import React from "react";
import { RotateCcw } from "lucide-react";
import { GlobalConfig, Product, VariantPriceOverride } from "../../types";
import { calculateMatrixCell } from "../../utils/pricingMatrix";
import { cn } from "../../lib/utils";

interface ProductProjectedPricesProps {
  draftProduct: Product;
  config: GlobalConfig;
  isDirty: boolean;
  onUpdateOverride?: (
    fabricId: string,
    override: VariantPriceOverride | null
  ) => void;
  onResetOverride?: (fabricId: string) => void;
  onUpdateDraftProduct?: <K extends keyof Product>(
    field: K,
    value: Product[K]
  ) => void;
}

export function ProductProjectedPrices({
  draftProduct,
  config,
  isDirty,
  onUpdateOverride,
  onResetOverride,
  onUpdateDraftProduct,
}: ProductProjectedPricesProps) {
  const handlePriceChange = (
    fabricId: string,
    field: "customRetailPrice" | "customWholesalePrice",
    valString: string
  ) => {
    const trimmed = valString.trim();
    const parsed = trimmed === "" ? undefined : parseFloat(trimmed);
    const valNum =
      parsed !== undefined && !isNaN(parsed) && parsed >= 0 ? parsed : undefined;

    const currentOverride = draftProduct.variantOverrides?.[fabricId];
    const updatedOverride: VariantPriceOverride = {
      ...(currentOverride || {}),
    };

    if (valNum === undefined) {
      delete updatedOverride[field];
    } else {
      updatedOverride[field] = valNum;
    }

    const isBothEmpty =
      updatedOverride.customRetailPrice === undefined &&
      updatedOverride.customWholesalePrice === undefined;

    const finalOverride = isBothEmpty ? null : updatedOverride;

    if (onUpdateOverride) {
      onUpdateOverride(fabricId, finalOverride);
      return;
    }

    if (onUpdateDraftProduct) {
      const nextOverrides: Record<string, VariantPriceOverride> = {
        ...(draftProduct.variantOverrides || {}),
      };
      if (!finalOverride) {
        delete nextOverrides[fabricId];
      } else {
        nextOverrides[fabricId] = finalOverride;
      }
      onUpdateDraftProduct(
        "variantOverrides",
        Object.keys(nextOverrides).length > 0 ? nextOverrides : undefined
      );
    }
  };

  const handleReset = (fabricId: string) => {
    if (onUpdateOverride) {
      onUpdateOverride(fabricId, null);
    }
    if (onResetOverride) {
      onResetOverride(fabricId);
    }
    if (!onUpdateOverride && !onResetOverride && onUpdateDraftProduct) {
      const nextOverrides: Record<string, VariantPriceOverride> = {
        ...(draftProduct.variantOverrides || {}),
      };
      delete nextOverrides[fabricId];
      onUpdateDraftProduct(
        "variantOverrides",
        Object.keys(nextOverrides).length > 0 ? nextOverrides : undefined
      );
    }
  };

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
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2.5 pb-2">
        {(draftProduct.allowedFabricIds || []).map((fabricId) => {
          const fabric = config.materials.find((m) => m.id === fabricId);
          if (!fabric) return null;
          const calc = calculateMatrixCell(draftProduct, fabric, config);
          if (!calc || !calc.isApplicable) return null;

          const analysis = {
            recommendedPrice: calc.retailPrice,
            recommendedWholesalePrice: calc.wholesalePrice,
          };

          const override = draftProduct.variantOverrides?.[fabric.id];
          const customRetail = override?.customRetailPrice;
          const customWholesale = override?.customWholesalePrice;
          const hasOverride =
            (customRetail !== undefined && customRetail > 0) ||
            (customWholesale !== undefined && customWholesale > 0);

          return (
            <div
              key={fabricId}
              className={cn(
                "bg-stone-950 border rounded-lg p-2.5 flex flex-col justify-between gap-2 transition-all shadow-sm",
                hasOverride
                  ? "border-amber-500/40 bg-amber-500/[0.02]"
                  : "border-stone-800 hover:border-stone-700"
              )}
            >
              <div className="flex items-center justify-between gap-1 min-w-0">
                <span
                  className="text-xs font-bold text-white leading-tight whitespace-normal break-words line-clamp-2"
                  title={fabric.name}
                >
                  {fabric.name}
                </span>
                {hasOverride && (
                  <button
                    type="button"
                    onClick={() => handleReset(fabric.id)}
                    className="text-stone-500 hover:text-amber-400 p-1 cursor-pointer transition-colors shrink-0"
                    title="Restablecer a fórmula automática"
                  >
                    <RotateCcw size={11} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-1.5 items-end">
                <div>
                  <div className="text-[9px] uppercase text-stone-500 font-mono tracking-wider mb-1">
                    Costo
                  </div>
                  <div className="text-xs font-mono text-stone-300 whitespace-nowrap">
                    Bs {calc.costFloor.toFixed(1)}
                  </div>
                </div>

                <div>
                  <div className="text-[9px] uppercase text-stone-500 font-mono tracking-wider mb-1">
                    Menudeo
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={customRetail !== undefined ? customRetail : ""}
                    placeholder={analysis.recommendedPrice.toFixed(0)}
                    onWheel={(e) => e.currentTarget.blur()}
                    onChange={(e) =>
                      handlePriceChange(
                        fabric.id,
                        "customRetailPrice",
                        e.target.value
                      )
                    }
                    className={cn(
                      "w-full bg-stone-900 border rounded px-1.5 py-1 text-xs font-mono text-right focus:outline-none transition-colors",
                      customRetail !== undefined
                        ? "border-amber-500/60 text-amber-400 font-bold bg-amber-500/5"
                        : "border-stone-800 text-emerald-400 font-bold placeholder:text-emerald-400/50"
                    )}
                  />
                </div>

                <div>
                  <div className="text-[9px] uppercase text-stone-500 font-mono tracking-wider mb-1">
                    Mayor
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={customWholesale !== undefined ? customWholesale : ""}
                    placeholder={analysis.recommendedWholesalePrice.toFixed(0)}
                    onWheel={(e) => e.currentTarget.blur()}
                    onChange={(e) =>
                      handlePriceChange(
                        fabric.id,
                        "customWholesalePrice",
                        e.target.value
                      )
                    }
                    className={cn(
                      "w-full bg-stone-900 border rounded px-1.5 py-1 text-xs font-mono text-right focus:outline-none transition-colors",
                      customWholesale !== undefined
                        ? "border-amber-500/60 text-amber-400 font-bold bg-amber-500/5"
                        : "border-stone-800 text-emerald-400 font-bold placeholder:text-emerald-400/50"
                    )}
                  />
                </div>
              </div>
            </div>
          );
        })}
        {(!draftProduct.allowedFabricIds ||
          draftProduct.allowedFabricIds.length === 0) && (
          <div className="text-xs text-stone-600 italic p-2">
            Selecciona telas permitidas arriba para ver proyecciones.
          </div>
        )}
      </div>
    </div>
  );
}
