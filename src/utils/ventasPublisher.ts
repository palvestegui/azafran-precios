import { GlobalConfig, Material } from '../types.js';
import { calculateProductAnalysis } from './pricingCalculator.js';
import { roundBob } from './calculations.js';
import { ensureMaterialSkus, ensureProductSkus } from './skuGenerator.js';

export interface FabricVariantPayload {
  fabricSku: string;
  priceRaleo: number;
  priceB2B: number;
  isPrimary: boolean;
}

export interface CatalogGarmentSyncEntry {
  sku: string;
  name: string;
  category: string;
  description: string;
  imageUrl?: string;
  backImageUrl?: string;
  defaultFabricName: string;
  defaultFabricSku?: string;
  priceRaleo: number;
  priceB2B: number;
  fabricVariants: Record<string, FabricVariantPayload>;
}

export interface BaseGarmentPayload {
  sku: string;
  [fabricName: string]: FabricVariantPayload | string;
}

export interface VentasSyncPayload {
  garments: Record<string, BaseGarmentPayload>;
  catalogGarments: Record<string, CatalogGarmentSyncEntry>;
  lastSyncedAt: number;
}

export function buildVentasPayload(rawConfig: GlobalConfig): VentasSyncPayload {
  const products = ensureProductSkus(rawConfig.products || []);
  const materials = ensureMaterialSkus(rawConfig.materials || []);
  const config: GlobalConfig = { ...rawConfig, products, materials };

  const fabrics = materials.filter((m: Material) => m.category === 'fabric');

  const garmentsPayload: VentasSyncPayload['garments'] = {};
  const catalogGarmentsPayload: VentasSyncPayload['catalogGarments'] = {};

  for (const prod of products) {
    if (!prod.name || !prod.name.trim()) continue;

    const category = (prod.category || '').trim();
    const isBase = category.toLowerCase().includes('base') || category.toLowerCase().includes('patrón');

    const defaultFabric = fabrics.find((f) => f.id === prod.defaultFabricId || (f.sku && prod.defaultFabricId === f.sku)) || fabrics[0];
    const targetFabrics = prod.allowedFabricIds && prod.allowedFabricIds.length > 0
      ? fabrics.filter((f) => prod.allowedFabricIds!.includes(f.id) || (f.sku && prod.allowedFabricIds!.includes(f.sku)))
      : fabrics;

    if (isBase) {
      const baseVariants: BaseGarmentPayload = {
        sku: prod.sku || '',
      };
      for (const fabric of targetFabrics) {
        const analysis = calculateProductAnalysis(prod, config, fabric.id);
        const override = prod.variantOverrides?.[fabric.id] || (fabric.sku ? prod.variantOverrides?.[fabric.sku] : undefined);
        const raleo = override?.customRetailPrice ?? analysis.recommendedPrice;
        const b2b = override?.customWholesalePrice ?? analysis.recommendedWholesalePrice;

        baseVariants[fabric.name] = {
          fabricSku: fabric.sku || '',
          priceRaleo: roundBob(raleo),
          priceB2B: roundBob(b2b),
          isPrimary: fabric.id === prod.defaultFabricId,
        };
      }
      garmentsPayload[prod.name] = baseVariants;
    } else {
      const fabricVariants: Record<string, FabricVariantPayload> = {};
      let primaryRaleo = 0;
      let primaryB2B = 0;

      for (const fabric of targetFabrics) {
        const analysis = calculateProductAnalysis(prod, config, fabric.id);
        const override = prod.variantOverrides?.[fabric.id] || (fabric.sku ? prod.variantOverrides?.[fabric.sku] : undefined);
        const raleo = roundBob(override?.customRetailPrice ?? analysis.recommendedPrice);
        const b2b = roundBob(override?.customWholesalePrice ?? analysis.recommendedWholesalePrice);
        const isPrimary = fabric.id === prod.defaultFabricId;

        if (isPrimary) {
          primaryRaleo = raleo;
          primaryB2B = b2b;
        }

        fabricVariants[fabric.name] = {
          fabricSku: fabric.sku || '',
          priceRaleo: raleo,
          priceB2B: b2b,
          isPrimary,
        };
      }

      catalogGarmentsPayload[prod.name] = {
        sku: prod.sku || '',
        name: prod.name,
        category,
        description: prod.description || '',
        imageUrl: prod.imageUrl || '',
        backImageUrl: prod.backImageUrl || '',
        defaultFabricName: defaultFabric ? defaultFabric.name : '',
        defaultFabricSku: defaultFabric?.sku || '',
        priceRaleo: primaryRaleo,
        priceB2B: primaryB2B,
        fabricVariants,
      };
    }
  }

  return {
    garments: garmentsPayload,
    catalogGarments: catalogGarmentsPayload,
    lastSyncedAt: Date.now(),
  };
}

export async function publishPreciosToVentas(
  dbLocal: { collection: (name: string) => { doc: (id: string) => { get: () => Promise<{ exists: boolean; data: () => unknown }> } } },
  dbVentas: { collection: (name: string) => { doc: (id: string) => { set: (data: unknown, options: { merge: boolean }) => Promise<unknown> } } }
) {
  if (!dbVentas) {
    throw new Error('Ventas DB is not initialized.');
  }

  const configDoc = await dbLocal.collection('config').doc('system-wide-config').get();
  if (!configDoc.exists) {
    throw new Error('system-wide-config not found in Precios Firestore.');
  }

  const config = configDoc.data() as GlobalConfig;
  const syncPayload = buildVentasPayload(config);

  await dbVentas.collection('pricing').doc('global').set(syncPayload, { merge: true });

  return {
    success: true,
    baseCount: Object.keys(syncPayload.garments).length,
    catalogCount: Object.keys(syncPayload.catalogGarments).length,
    lastSyncedAt: syncPayload.lastSyncedAt,
  };
}
