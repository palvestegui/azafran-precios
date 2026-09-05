import {
  GlobalConfig,
  Material,
  Product,
  AccessoryBatchCalculation,
} from "../types";
import {
  calculateMonthlyRegular,
  calculateMonthlyDaily,
  calculateMonthlyStaff,
  calculateTotalOverhead,
  WORKING_DAYS_PER_MONTH,
  convertUnitCost,
  getUnitMultiplier,
} from "./conversions";

export {
  calculateMonthlyRegular,
  calculateMonthlyDaily,
  calculateMonthlyStaff,
  calculateTotalOverhead,
  WORKING_DAYS_PER_MONTH,
  convertUnitCost,
  getUnitMultiplier,
};

export const DEFAULT_RETAIL_MARGIN = 35;
export const DEFAULT_WHOLESALE_MARGIN = 20;

/**
 * Evaluates gross profit, margin percentage, and loss detection from selling price and cost floor.
 */
export function calculateProfitAndMargin(price: number, costFloor: number) {
  const grossProfit = price - costFloor;
  const profitMargin = price > 0 ? (grossProfit / price) * 100 : 0;
  return {
    grossProfit,
    profitMargin,
    isLoss: grossProfit < 0,
  };
}

/**
 * Recursively resolves the true unit cost of a material.
 * If manufactured, it aggregates ingredient costs + extraCosts.
 * Prevents infinite recursion via visited Set tracking.
 */
export function getMaterialTrueCostPerUnit(
  mat: Material | undefined,
  materials: Material[],
  visited: Set<string> = new Set()
): number {
  if (!mat) return 0;
  if (visited.has(mat.id)) return 0; // Prevent infinite circular recursion

  let baseUnitCost = 0;
  if (mat.originType === "manufactured" && mat.ingredients) {
    const nextVisited = new Set(visited);
    nextVisited.add(mat.id);
    baseUnitCost = mat.ingredients.reduce((acc, current) => {
      const subMat = materials.find((m) => m.id === current.materialId);
      return acc + getMaterialCost(subMat, current.quantity, materials, nextVisited);
    }, 0);
  } else {
    baseUnitCost = mat.pricePerUnit;
  }

  const extra = mat.extraCosts || 0;
  return baseUnitCost + extra;
}

/**
 * Computes the material cost for a given quantity including unit conversions and scrap/wastage percentage.
 */
export function getMaterialCost(
  mat: Material | undefined,
  qty: number,
  materials: Material[] = [],
  visited: Set<string> = new Set()
): number {
  if (!mat) return 0;
  if (visited.has(mat.id)) return 0;

  const trueCost = getMaterialTrueCostPerUnit(mat, materials, visited);
  const baseCost = convertUnitCost(trueCost, mat.unit, mat.batchSize) * qty;
  const wastage = mat.wastagePercentage || 0;
  return baseCost * (1 + wastage / 100);
}

/**
 * Calculates step-wise batch cost and suggested retail/wholesale prices for accessories or service batches
 * (e.g., logo embroidery billed in blocks of 6 units).
 */
export function calculateAccessoryBatchPricing(
  accessory: Material,
  quantity: number,
  materials: Material[] = []
): AccessoryBatchCalculation {
  const safeQty = Math.max(1, quantity);
  const trueCostPerBatch = getMaterialTrueCostPerUnit(accessory, materials);
  const bSize = Math.max(1, accessory.batchSize || 1);
  const isBatch = accessory.unit === "batch";

  let totalCost = 0;
  let unitCost = 0;
  let batchesCount = 1;

  if (isBatch) {
    batchesCount = Math.max(1, Math.ceil(safeQty / bSize));
    totalCost = batchesCount * trueCostPerBatch;
    unitCost = totalCost / safeQty;
  } else {
    unitCost = trueCostPerBatch * getUnitMultiplier(accessory.unit);
    totalCost = unitCost * safeQty;
  }

  const retailMargin =
    accessory.retailMargin !== undefined && !isNaN(accessory.retailMargin)
      ? accessory.retailMargin
      : DEFAULT_RETAIL_MARGIN;
  const wholesaleMargin =
    accessory.wholesaleMargin !== undefined && !isNaN(accessory.wholesaleMargin)
      ? accessory.wholesaleMargin
      : DEFAULT_WHOLESALE_MARGIN;

  let rDiv = 1 - retailMargin / 100;
  if (rDiv <= 0) rDiv = 0.01;
  const unitRetailPrice = unitCost / rDiv;
  const totalRetailPrice = unitRetailPrice * safeQty;
  const retailProfit = totalRetailPrice - totalCost;

  let wDiv = 1 - wholesaleMargin / 100;
  if (wDiv <= 0) wDiv = 0.01;
  const unitWholesalePrice = unitCost / wDiv;
  const totalWholesalePrice = unitWholesalePrice * safeQty;
  const wholesaleProfit = totalWholesalePrice - totalCost;

  return {
    quantity: safeQty,
    batchesCount,
    batchSize: bSize,
    totalCost,
    unitCost,
    unitRetailPrice,
    totalRetailPrice,
    retailProfit,
    unitWholesalePrice,
    totalWholesalePrice,
    wholesaleProfit,
  };
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

  const fabricId = overrideFabricId !== undefined ? overrideFabricId : prod.defaultFabricId;
  if (fabricId && prod.fabricQuantity) {
    const fabricMat = materials.find((m) => m.id === fabricId);
    cost += getMaterialCost(fabricMat, prod.fabricQuantity, materials, new Set());
  }
  return cost;
}

/**
 * Computes full cost floor, recommended retail and wholesale prices, margins, and break-even units.
 */
export function calculateProductAnalysis(
  prod: Product,
  config: GlobalConfig,
  overrideFabricId?: string
) {
  const totalOverhead = calculateTotalOverhead(config);
  const monthlyStaff = calculateMonthlyStaff(config.staff);
  const monthlyRegular = calculateMonthlyRegular(config.regularPayments);
  const monthlyDaily = calculateMonthlyDaily(config.dailyExpenses);
  const totalOverheadExcludingLabor = monthlyRegular + monthlyDaily;

  const laborAllocation =
    config.productionCapacity > 0
      ? monthlyStaff / config.productionCapacity
      : 0;
  const overheadAllocation =
    config.productionCapacity > 0
      ? totalOverheadExcludingLabor / config.productionCapacity
      : 0;

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
  const recommendedPrice = costFloor / divisor;

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
  const recommendedWholesalePrice = costFloor / wDivisor;
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
    profitPerUnit,
    breakEvenUnits,
    appliedMargin,
    recommendedWholesalePrice,
    wholesaleProfitPerUnit,
    wholesaleBreakEvenUnits,
    appliedWholesaleMargin,
  };
}
