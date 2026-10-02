import { Material, Product } from "../types";
 
export const SKU_PREFIX = {
  PRODUCT: "PRD",
  FABRIC: "TEL",
  SUPPLY: "INS",
  ACCESSORY: "ACS",
} as const;

export type SkuPrefix = (typeof SKU_PREFIX)[keyof typeof SKU_PREFIX] | string;

/**
 * Returns the appropriate prefix for a material based on its category.
 */
export function getMaterialSkuPrefix(category?: Material["category"]): string {
  if (category === "fabric") return SKU_PREFIX.FABRIC;
  if (category === "accessory") return SKU_PREFIX.ACCESSORY;
  return SKU_PREFIX.SUPPLY;
}

/**
 * Generates the next sequential zero-padded 4-digit SKU for a given prefix.
 * e.g., 'PRD-0001', 'TEL-0012'.
 * Scans all items with matching prefix to determine the highest number and increments by 1.
 */
export function generateNextSku(
  prefix: string,
  items: Array<{ sku?: string }>
): string {
  const cleanPrefix = prefix.toUpperCase().trim();
  const pattern = new RegExp(`^${cleanPrefix}-(\\d+)$`, "i");

  let maxNum = 0;
  for (const item of items) {
    if (!item?.sku) continue;
    const match = item.sku.trim().match(pattern);
    if (match && match[1]) {
      const parsed = parseInt(match[1], 10);
      if (!isNaN(parsed) && parsed > maxNum) {
        maxNum = parsed;
      }
    }
  }

  const nextNum = maxNum + 1;
  return `${cleanPrefix}-${String(nextNum).padStart(4, "0")}`;
}

/**
 * Startup migration helper: scans product array and permanently assigns sequential
 * 'PRD-XXXX' SKUs to any legacy product missing one, strictly preserving existing SKUs.
 */
export function ensureProductSkus(products: Product[]): Product[] {
  if (!Array.isArray(products)) return [];

  const result: Product[] = [];
  for (const prod of products) {
    if (prod.sku && prod.sku.trim()) {
      result.push({ ...prod, sku: prod.sku.trim() });
    } else {
      const assignedSku = generateNextSku(SKU_PREFIX.PRODUCT, result);
      result.push({ ...prod, sku: assignedSku });
    }
  }
  return result;
}

/**
 * Startup migration helper: scans materials array and permanently assigns sequential
 * SKUs ('TEL-XXXX' for fabrics, 'ACS-XXXX' for accessories, 'INS-XXXX' for supplies)
 * to any legacy material missing one, strictly preserving existing SKUs.
 */
export function ensureMaterialSkus(materials: Material[]): Material[] {
  if (!Array.isArray(materials)) return [];

  const result: Material[] = [];
  for (const mat of materials) {
    if (mat.sku && mat.sku.trim()) {
      result.push({ ...mat, sku: mat.sku.trim() });
    } else {
      const prefix = getMaterialSkuPrefix(mat.category);
      const assignedSku = generateNextSku(prefix, result);
      result.push({ ...mat, sku: assignedSku });
    }
  }
  return result;
}
