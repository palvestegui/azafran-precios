import { GlobalConfig, Material, Product } from "../types";
import {
  calculateMonthlyRegular,
  calculateMonthlyDaily,
  calculateMonthlyStaff,
  calculateTotalOverhead,
} from "./conversions";
import {
  getMaterialCost,
  DEFAULT_RETAIL_MARGIN,
  DEFAULT_WHOLESALE_MARGIN,
  roundBob,
} from "./calculations";

export interface ProductAnalysisResult {
  materialCost: number;
  laborAllocation: number;
  overheadAllocation: number;
  costFloor: number;
  recommendedPrice: number;
  salePriceRetail: number;
  profitPerUnit: number;
  breakEvenUnits: number;
  appliedMargin: number;
  recommendedWholesalePrice: number;
  salePriceWholesale: number;
  wholesaleProfitPerUnit: number;
  wholesaleBreakEvenUnits: number;
  appliedWholesaleMargin: number;
}

/**
 * Sums all direct material and fabric costs for a specific product recipe.
 */
export function calculateProductMaterialCost(
  prod: Product,
  materials: Material[],
  overrideFabricId?: string
): number {
  let cost = prod.ingredients.reduce((acc, current) => {
    const mat = materials.find((m) => m.id === current.materialId);
    if (mat?.category === "fabric") return acc; // Ignore any old fabric ingredients
    return acc + getMaterialCost(mat, current.quantity, materials, new Set());
  }, 0);

  const fabricId =
    overrideFabricId !== undefined ? overrideFabricId : prod.defaultFabricId;
  if (fabricId && prod.fabricQuantity) {
    const fabricMat = materials.find((m) => m.id === fabricId);
    cost += getMaterialCost(
      fabricMat,
      prod.fabricQuantity,
      materials,
      new Set()
    );
  }
  return cost;
}

/**
 * Computes full cost floor, recommended retail and wholesale prices, margins, and break-even units.
 * Overheads and labor allocations are proportionally scaled by the garment's `productionWeight`.
 */
export function calculateProductAnalysis(
  prod: Product,
  config: GlobalConfig,
  overrideFabricId?: string
): ProductAnalysisResult {
  // 1. Retrieve productionWeight with safe positive fallback of 1.0
  const weight =
    typeof prod.productionWeight === "number" && prod.productionWeight > 0
      ? prod.productionWeight
      : 1.0;

  const totalOverhead = calculateTotalOverhead(config);
  const monthlyStaff = calculateMonthlyStaff(config.staff);
  const monthlyRegular = calculateMonthlyRegular(config.regularPayments);
  const monthlyDaily = calculateMonthlyDaily(config.dailyExpenses);
  const totalOverheadExcludingLabor = monthlyRegular + monthlyDaily;

  // 2. Scale both unit labor and overhead rates by productionWeight
  const laborAllocation =
    config.productionCapacity > 0
      ? (monthlyStaff / config.productionCapacity) * weight
      : 0;
  const overheadAllocation =
    config.productionCapacity > 0
      ? (totalOverheadExcludingLabor / config.productionCapacity) * weight
      : 0;

  // 3. Direct material costs remain strictly driven by fabricQuantity and ingredients
  const materialCost = calculateProductMaterialCost(
    prod,
    config.materials,
    overrideFabricId
  );
  const costFloor = materialCost + laborAllocation + overheadAllocation;

  const fabricId =
    overrideFabricId !== undefined ? overrideFabricId : prod.defaultFabricId;
  const activeFabric = fabricId
    ? config.materials.find((m) => m.id === fabricId)
    : undefined;

  // Margin Resolution Hierarchy (Retail):
  // 1. Active Selected Fabric Override -> 2. Garment/Product Override -> 3. System Default Floor
  let appliedMargin: number;
  if (
    activeFabric?.retailMargin !== undefined &&
    !isNaN(activeFabric.retailMargin)
  ) {
    appliedMargin = activeFabric.retailMargin;
  } else if (
    prod.profitMargin !== undefined &&
    !isNaN(prod.profitMargin)
  ) {
    appliedMargin = prod.profitMargin;
  } else if (
    config.profitMargin !== undefined &&
    !isNaN(config.profitMargin)
  ) {
    appliedMargin = config.profitMargin;
  } else {
    appliedMargin = DEFAULT_RETAIL_MARGIN;
  }

  let divisor = 1 - appliedMargin / 100;
  if (divisor <= 0) divisor = 0.01;
  const recommendedPrice = roundBob(costFloor / divisor);

  const profitPerUnit = recommendedPrice - costFloor;

  const contributionMargin = recommendedPrice - materialCost;
  const breakEvenUnits =
    contributionMargin > 0 ? totalOverhead / contributionMargin : 0;

  // Margin Resolution Hierarchy (Wholesale):
  // 1. Active Selected Fabric Override -> 2. Garment/Product Override -> 3. System Default Floor
  let appliedWholesaleMargin: number;
  if (
    activeFabric?.wholesaleMargin !== undefined &&
    !isNaN(activeFabric.wholesaleMargin)
  ) {
    appliedWholesaleMargin = activeFabric.wholesaleMargin;
  } else if (
    prod.wholesaleMargin !== undefined &&
    !isNaN(prod.wholesaleMargin)
  ) {
    appliedWholesaleMargin = prod.wholesaleMargin;
  } else if (
    config.wholesaleMargin !== undefined &&
    !isNaN(config.wholesaleMargin)
  ) {
    appliedWholesaleMargin = config.wholesaleMargin;
  } else {
    appliedWholesaleMargin = DEFAULT_WHOLESALE_MARGIN;
  }

  let wDivisor = 1 - appliedWholesaleMargin / 100;
  if (wDivisor <= 0) wDivisor = 0.01;
  const recommendedWholesalePrice = roundBob(costFloor / wDivisor);
  const wholesaleProfitPerUnit = recommendedWholesalePrice - costFloor;

  const wholesaleContributionMargin = recommendedWholesalePrice - materialCost;
  const wholesaleBreakEvenUnits =
    wholesaleContributionMargin > 0
      ? totalOverhead / wholesaleContributionMargin
      : 0;

  return {
    materialCost,
    laborAllocation,
    overheadAllocation,
    costFloor,
    recommendedPrice,
    salePriceRetail: recommendedPrice,
    profitPerUnit,
    breakEvenUnits,
    appliedMargin,
    recommendedWholesalePrice,
    salePriceWholesale: recommendedWholesalePrice,
    wholesaleProfitPerUnit,
    wholesaleBreakEvenUnits,
    appliedWholesaleMargin,
  };
}
