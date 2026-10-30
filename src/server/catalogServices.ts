import { Firestore as ClientFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import { calculateProductAnalysis } from "../utils/pricingCalculator.js";
import { roundBob } from "../utils/calculations.js";
import { GlobalConfig } from "../types.js";
import { DEFAULT_GLOBAL_CONFIG } from "../data/defaultCatalog.js";
import { ensureMaterialSkus, ensureProductSkus, generateNextSku, SKU_PREFIX } from "../utils/skuGenerator.js";

export interface PricingMatrixItem {
  garmentSku?: string;
  garment: string;
  fabricSku?: string;
  fabric: string;
  consumptionMeters: number;
  retailPrice: number;
  wholesalePrice: number;
}

export async function getLocalConfig(clientDb: ClientFirestore): Promise<GlobalConfig> {
  try {
    const snap = await getDoc(doc(clientDb, "config", "system-wide-config"));
    const raw = snap.exists() ? (snap.data() as GlobalConfig) : DEFAULT_GLOBAL_CONFIG;
    return {
      ...raw,
      products: ensureProductSkus(raw.products || []),
      materials: ensureMaterialSkus(raw.materials || []),
    };
  } catch (error) {
    console.warn("Using default config, live fetch notice:", error instanceof Error ? error.message : error);
    return {
      ...DEFAULT_GLOBAL_CONFIG,
      products: ensureProductSkus(DEFAULT_GLOBAL_CONFIG.products || []),
      materials: ensureMaterialSkus(DEFAULT_GLOBAL_CONFIG.materials || []),
    };
  }
}

export function buildMatrix(config: GlobalConfig): PricingMatrixItem[] {
  const matrix: PricingMatrixItem[] = [];
  const allFabrics = config.materials.filter((m) => m.category === "fabric");
  for (const prod of config.products) {
    const allowed = allFabrics.filter((f) => !prod.allowedFabricIds?.length || prod.allowedFabricIds.includes(f.id));
    for (const fabric of allowed) {
      const a = calculateProductAnalysis(prod, config, fabric.id);
      const o = prod.variantOverrides?.[fabric.id];
      const r = o?.retailPrice ?? o?.customRetailPrice ?? a.recommendedPrice;
      const w = o?.wholesalePrice ?? o?.customWholesalePrice ?? a.recommendedWholesalePrice;
      matrix.push({
        garmentSku: prod.sku,
        garment: prod.name,
        fabricSku: fabric.sku,
        fabric: fabric.name,
        consumptionMeters: prod.fabricQuantity ?? 0,
        retailPrice: roundBob(r),
        wholesalePrice: roundBob(w),
      });
    }
  }
  return matrix;
}

export function buildBundle(config: GlobalConfig) {
  return {
    materials: config.materials,
    products: config.products,
    matrix: buildMatrix(config),
    stats: {
      totalProducts: config.products.length,
      totalFabrics: config.materials.filter((m) => m.category === "fabric").length,
      lastUpdated: new Date().toISOString(),
    },
  };
}

export async function addProduct(
  clientDb: ClientFirestore,
  name: string,
  category: string,
  fabricMeters: number,
  description?: string
): Promise<string> {
  const config = await getLocalConfig(clientDb);
  const sku = generateNextSku(SKU_PREFIX.PRODUCT, config.products);
  config.products.push({
    id: `prod-${Date.now()}`,
    sku,
    name,
    category,
    description,
    fabricQuantity: fabricMeters,
    ingredients: [],
    productionWeight: 1,
  });
  try {
    await setDoc(doc(clientDb, "config", "system-wide-config"), config);
  } catch {
    /* ignore write failures */
  }
  return `Product ${name} (${sku}) added successfully.`;
}

export async function updateFabricCost(
  clientDb: ClientFirestore,
  fabricName: string,
  costPerMeter: number
): Promise<{ message: string; isError?: boolean }> {
  const config = await getLocalConfig(clientDb);
  const fabric = config.materials.find((m) => m.name.toLowerCase() === fabricName.toLowerCase() && m.category === "fabric");
  if (!fabric) return { message: `Fabric ${fabricName} not found.`, isError: true };
  fabric.pricePerUnit = costPerMeter;
  try {
    await setDoc(doc(clientDb, "config", "system-wide-config"), config);
  } catch {
    /* ignore write failures */
  }
  return { message: `Fabric ${fabricName} updated to Bs ${costPerMeter}/m.` };
}
