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

export {
  calculateProductAnalysis,
  calculateProductMaterialCost,
  type ProductAnalysisResult,
} from "./pricingCalculator";
