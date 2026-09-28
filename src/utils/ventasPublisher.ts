import { Firestore } from 'firebase-admin/firestore';
import { GlobalConfig, Material } from '../types.js';
import { calculateProductAnalysis } from './pricingCalculator.js';
import { roundBob } from './calculations.js';

export async function publishPreciosToVentas(
  dbLocal: Firestore,
  dbVentas: Firestore | null,
  fallbackConfig?: GlobalConfig
) {
  if (!dbVentas) {
    throw new Error('Ventas DB is not initialized.');
  }

  let config: GlobalConfig;
  try {
    const configDoc = await dbLocal.collection('config').doc('system-wide-config').get();
    if (!configDoc.exists) {
      if (fallbackConfig) {
        config = fallbackConfig;
      } else {
        throw new Error('system-wide-config not found in Precios Firestore.');
      }
    } else {
      config = configDoc.data() as GlobalConfig;
    }
  } catch (err: unknown) {
    if (fallbackConfig) {
      config = fallbackConfig;
    } else {
      throw err;
    }
  }

  const fabrics = config.materials.filter((m: Material) => m.category === 'fabric');

  const garmentsPayload: Record<string, Record<string, { priceRaleo: number; priceB2B: number; isPrimary: boolean }>> = {};
  const catalogGarmentsPayload: Record<string, {
    name: string;
    category: string;
    description: string;
    defaultFabricName: string;
    priceRaleo: number;
    priceB2B: number;
    fabricVariants: Record<string, { priceRaleo: number; priceB2B: number; isPrimary: boolean }>;
  }> = {};

  for (const prod of config.products) {
    if (!prod.name || !prod.name.trim()) continue;

    const category = (prod.category || '').trim();
    const isBase = category.toLowerCase().includes('base') || category.toLowerCase().includes('patrón');

    // Primary fabric strictly resolved by prod.defaultFabricId
    const defaultFabric = fabrics.find((f) => f.id === prod.defaultFabricId) || fabrics[0];

    // STRICT: Only calculate fabrics explicitly allowed for this product to prevent phantom variants
    const targetFabrics = prod.allowedFabricIds && prod.allowedFabricIds.length > 0
      ? fabrics.filter((f) => prod.allowedFabricIds!.includes(f.id))
      : fabrics;

    if (isBase) {
      garmentsPayload[prod.name] = {};
      for (const fabric of targetFabrics) {
        const analysis = calculateProductAnalysis(prod, config, fabric.id);
        const override = prod.variantOverrides?.[fabric.id];
        const raleo = override?.customRetailPrice ?? override?.retailPrice ?? analysis.recommendedPrice;
        const b2b = override?.customWholesalePrice ?? override?.wholesalePrice ?? analysis.recommendedWholesalePrice;

        garmentsPayload[prod.name][fabric.name] = {
          priceRaleo: roundBob(raleo),
          priceB2B: roundBob(b2b),
          isPrimary: fabric.id === prod.defaultFabricId
        };
      }
    } else {
      const fabricVariants: Record<string, { priceRaleo: number; priceB2B: number; isPrimary: boolean }> = {};
      let primaryRaleo = 0;
      let primaryB2B = 0;

      for (const fabric of targetFabrics) {
        const analysis = calculateProductAnalysis(prod, config, fabric.id);
        const override = prod.variantOverrides?.[fabric.id];
        const raleo = roundBob(override?.customRetailPrice ?? override?.retailPrice ?? analysis.recommendedPrice);
        const b2b = roundBob(override?.customWholesalePrice ?? override?.wholesalePrice ?? analysis.recommendedWholesalePrice);
        const isPrimary = fabric.id === prod.defaultFabricId;

        if (isPrimary) {
          primaryRaleo = raleo;
          primaryB2B = b2b;
        }

        fabricVariants[fabric.name] = {
          priceRaleo: raleo,
          priceB2B: b2b,
          isPrimary
        };
      }

      catalogGarmentsPayload[prod.name] = {
        name: prod.name,
        category: category,
        description: prod.description || '',
        defaultFabricName: defaultFabric ? defaultFabric.name : '',
        priceRaleo: primaryRaleo,
        priceB2B: primaryB2B,
        fabricVariants
      };
    }
  }

  const syncPayload = {
    garments: garmentsPayload,
    catalogGarments: catalogGarmentsPayload,
    lastSyncedAt: Date.now()
  };

  await dbVentas.collection('pricing').doc('global').set(syncPayload, { merge: true });

  return {
    success: true,
    baseCount: Object.keys(garmentsPayload).length,
    catalogCount: Object.keys(catalogGarmentsPayload).length,
    lastSyncedAt: syncPayload.lastSyncedAt
  };
}
