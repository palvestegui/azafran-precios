import { GlobalConfig, Material } from '../types.js';
import { calculateProductAnalysis } from './pricingCalculator.js';
import { roundBob } from './calculations.js';
import { ensureMaterialSkus, ensureProductSkus } from './skuGenerator.js';
import { doc, getDoc, setDoc, Firestore } from 'firebase/firestore';

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
  updatedAt: string;
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
    updatedAt: new Date().toISOString(),
  };
}

export function diagnoseSyncFailure(err: unknown, target: string, payload?: unknown): string {
  const errMsg = err instanceof Error ? err.message : String(err);
  const errCode = (err as { code?: unknown })?.code;

  let category = 'UNKNOWN_ERROR';
  if (errMsg.includes('PERMISSION_DENIED') || String(errCode) === '7' || String(errCode) === 'permission-denied') {
    const p = payload as Record<string, unknown> | undefined;
    const hasGarments = p && typeof p.garments === 'object';
    const hasCatalog = p && typeof p.catalogGarments === 'object';
    const hasLastSynced = p && typeof p.lastSyncedAt === 'number';
    const hasUpdatedAt = p && typeof p.updatedAt === 'string';

    if (!hasGarments || !hasCatalog || !hasLastSynced || !hasUpdatedAt) {
      category = 'RULES_REJECTION (Payload missing required schema fields like updatedAt or garments)';
    } else {
      category = 'AUTH_OR_IAM_RESTRICTION (Caller lacks Cloud Datastore IAM roles on target project)';
    }
  } else if (errMsg.includes('NOT_FOUND') || String(errCode) === '5' || String(errCode) === 'not-found') {
    category = 'DATABASE_NOT_FOUND (Database ID does not exist or target document path not found)';
  } else if (errMsg.includes('UNAVAILABLE') || errMsg.includes('DEADLINE_EXCEEDED')) {
    category = 'NETWORK_TIMEOUT (Unable to reach Google Cloud Firestore endpoint)';
  }

  const diagnosticMsg = `[Firestore Sync Diagnostic] Target: ${target} | Category: ${category} | Code: ${String(errCode || 'none')} | Details: ${errMsg}`;
  console.warn(diagnosticMsg);
  return diagnosticMsg;
}

export async function publishPreciosToVentas(
  primaryDbOrClient: unknown,
  remoteVentasDb?: unknown,
  directConfig?: GlobalConfig
) {
  let config: GlobalConfig;
  if (directConfig) {
    config = directConfig;
  } else if (primaryDbOrClient && typeof (primaryDbOrClient as { collection?: unknown }).collection === 'function') {
    const adminDoc = await (primaryDbOrClient as { collection: (n: string) => { doc: (id: string) => { get: () => Promise<{ exists: boolean; data: () => unknown }> } } })
      .collection('config').doc('system-wide-config').get();
    if (!adminDoc.exists) throw new Error('system-wide-config not found in Precios Firestore.');
    config = adminDoc.data() as GlobalConfig;
  } else {
    const snap = await getDoc(doc(primaryDbOrClient as Firestore, 'config', 'system-wide-config'));
    if (!snap.exists()) throw new Error('system-wide-config not found in Precios Firestore.');
    config = snap.data() as GlobalConfig;
  }

  const syncPayload = buildVentasPayload(config);

  // 1. Primary write to pricing/global using { merge: true } to preserve presets/services
  try {
    if (primaryDbOrClient && typeof (primaryDbOrClient as { collection?: unknown }).collection === 'function') {
      await (primaryDbOrClient as { collection: (n: string) => { doc: (id: string) => { set: (d: unknown, opt: { merge: boolean }) => Promise<unknown> } } })
        .collection('pricing').doc('global').set(syncPayload, { merge: true });
    } else {
      await setDoc(doc(primaryDbOrClient as Firestore, 'pricing', 'global'), syncPayload, { merge: true });
    }
  } catch (primaryErr: unknown) {
    diagnoseSyncFailure(primaryErr, 'primary-pricing-global', syncPayload);
    throw primaryErr;
  }

  // 2. Replicate to external Ventas database if provided
  if (remoteVentasDb && typeof (remoteVentasDb as { collection?: unknown }).collection === 'function') {
    try {
      await (remoteVentasDb as { collection: (n: string) => { doc: (id: string) => { set: (d: unknown, opt: { merge: boolean }) => Promise<unknown> } } })
        .collection('pricing').doc('global').set(syncPayload, { merge: true });
      console.log('[Ventas Sync] Replicated successfully to external Ventas database.');
    } catch (extErr: unknown) {
      diagnoseSyncFailure(extErr, 'external-ventas-db', syncPayload);
    }
  }

  return {
    success: true,
    baseCount: Object.keys(syncPayload.garments).length,
    catalogCount: Object.keys(syncPayload.catalogGarments).length,
    lastSyncedAt: syncPayload.lastSyncedAt,
  };
}
