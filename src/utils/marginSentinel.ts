import { GlobalConfig, Material, Product } from "../types";
import { calculateProductAnalysis } from "./calculations";

export interface MarginRiskItem {
  productId: string;
  productName: string;
  fabricId: string;
  fabricName: string;
  priceType: "retail" | "wholesale";
  oldCost: number;
  newCost: number;
  effectivePrice: number;
  isCustomOverride: boolean;
  realMargin: number;
  netProfit: number;
  severity: "critical" | "warning";
}

/**
 * Evaluates the cross-catalog impact of a material price update on all garments and variant overrides.
 * Flags garments where projected unit cost exceeds selling price (negative margin) or margin is < 10%.
 */
export function checkMaterialPriceImpact(
  updatedMaterial: Material,
  config: GlobalConfig
): MarginRiskItem[] {
  const risks: MarginRiskItem[] = [];

  // Temporary configuration with updated material
  const tempConfig: GlobalConfig = {
    ...config,
    materials: config.materials.map((m) =>
      m.id === updatedMaterial.id ? updatedMaterial : m
    ),
  };

  const isFabric = updatedMaterial.category === "fabric";

  for (const prod of config.products) {
    // Determine which fabrics to evaluate for this garment
    let fabricsToTest: string[] = [];

    if (isFabric) {
      // If updating a fabric, check if this garment allows or uses this fabric
      const isAllowed = prod.allowedFabricIds
        ? prod.allowedFabricIds.includes(updatedMaterial.id)
        : Boolean(prod.fabricQuantity && prod.fabricQuantity > 0);

      if (isAllowed || prod.defaultFabricId === updatedMaterial.id) {
        fabricsToTest = [updatedMaterial.id];
      }
    } else {
      // If updating an ingredient/accessory, check if this garment consumes it
      const usesIngredient = prod.ingredients?.some(
        (ing) => ing.materialId === updatedMaterial.id
      );
      if (usesIngredient) {
        if (prod.allowedFabricIds && prod.allowedFabricIds.length > 0) {
          fabricsToTest = prod.allowedFabricIds;
        } else if (prod.defaultFabricId) {
          fabricsToTest = [prod.defaultFabricId];
        } else {
          // Default to all fabrics
          fabricsToTest = config.materials
            .filter((m) => m.category === "fabric")
            .map((m) => m.id);
        }
      }
    }

    for (const fabricId of fabricsToTest) {
      const fabricMat =
        fabricId === updatedMaterial.id
          ? updatedMaterial
          : config.materials.find((m) => m.id === fabricId);
      const fabricName = fabricMat?.name || "Tela";

      const oldAnalysis = calculateProductAnalysis(prod, config, fabricId);
      const newAnalysis = calculateProductAnalysis(prod, tempConfig, fabricId);

      const oldCost = oldAnalysis.costFloor;
      const newCost = newAnalysis.costFloor;

      const override = prod.variantOverrides?.[fabricId];

      // 1. Check Retail Price
      const hasCustomRetail =
        override?.customRetailPrice !== undefined &&
        override.customRetailPrice > 0;
      const effectiveRetail = hasCustomRetail
        ? override.customRetailPrice!
        : newAnalysis.recommendedPrice;

      const retailProfit = effectiveRetail - newCost;
      const realRetailMargin =
        effectiveRetail > 0 ? (retailProfit / effectiveRetail) * 100 : 0;

      if (realRetailMargin < 10) {
        risks.push({
          productId: prod.id,
          productName: prod.name,
          fabricId,
          fabricName,
          priceType: "retail",
          oldCost,
          newCost,
          effectivePrice: effectiveRetail,
          isCustomOverride: hasCustomRetail,
          realMargin: realRetailMargin,
          netProfit: retailProfit,
          severity: realRetailMargin < 0 ? "critical" : "warning",
        });
      }

      // 2. Check Wholesale Price
      const hasCustomWholesale =
        override?.customWholesalePrice !== undefined &&
        override.customWholesalePrice > 0;
      const effectiveWholesale = hasCustomWholesale
        ? override.customWholesalePrice!
        : newAnalysis.recommendedWholesalePrice;

      const wholesaleProfit = effectiveWholesale - newCost;
      const realWholesaleMargin =
        effectiveWholesale > 0 ? (wholesaleProfit / effectiveWholesale) * 100 : 0;

      if (realWholesaleMargin < 10) {
        risks.push({
          productId: prod.id,
          productName: prod.name,
          fabricId,
          fabricName,
          priceType: "wholesale",
          oldCost,
          newCost,
          effectivePrice: effectiveWholesale,
          isCustomOverride: hasCustomWholesale,
          realMargin: realWholesaleMargin,
          netProfit: wholesaleProfit,
          severity: realWholesaleMargin < 0 ? "critical" : "warning",
        });
      }
    }
  }

  // Sort critical issues first, then by lowest margin
  return risks.sort((a, b) => {
    if (a.severity === "critical" && b.severity !== "critical") return -1;
    if (b.severity === "critical" && a.severity !== "critical") return 1;
    return a.realMargin - b.realMargin;
  });
}
