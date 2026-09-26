import {
  GlobalConfig,
  Material,
  Product,
  Expense,
  DailyExpense,
  Staff,
  Unit,
  PaymentPeriod,
  VariantPriceOverride,
  AuthorizedUser,
} from "../types";
import { DEFAULT_GLOBAL_CONFIG } from "../data/defaultCatalog";

export const VALID_UNITS: readonly Unit[] = [
  "m",
  "100pack",
  "dozen",
  "unit",
  "spool",
  "service",
  "batch",
  "pie",
] as const;

export const VALID_PERIODS: readonly PaymentPeriod[] = [
  "weekly",
  "fortnightly",
  "monthly",
  "bimonthly",
  "quarterly",
  "semiannually",
  "yearly",
] as const;

export function isUnit(val: unknown): val is Unit {
  return typeof val === "string" && (VALID_UNITS as readonly string[]).includes(val);
}

export function isPaymentPeriod(val: unknown): val is PaymentPeriod {
  return typeof val === "string" && (VALID_PERIODS as readonly string[]).includes(val);
}

export function isMaterialCategory(
  val: unknown
): val is "fabric" | "other" | "accessory" | "service" {
  return (
    typeof val === "string" &&
    ["fabric", "other", "accessory", "service"].includes(val)
  );
}

function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null && !Array.isArray(val);
}

function sanitizeNumber(val: unknown, fallback: number = 0): number {
  if (typeof val === "number" && !isNaN(val) && isFinite(val)) {
    return val;
  }
  if (typeof val === "string") {
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && isFinite(parsed)) return parsed;
  }
  return fallback;
}

function sanitizeString(val: unknown, fallback: string = ""): string {
  return typeof val === "string" ? val : fallback;
}

export function validateMaterial(raw: unknown): Material | null {
  if (!isRecord(raw)) return null;
  const id = sanitizeString(raw.id);
  const name = sanitizeString(raw.name);
  if (!id || !name) return null;

  const unit = isUnit(raw.unit) ? raw.unit : "unit";
  const category = isMaterialCategory(raw.category) ? raw.category : undefined;
  const pricePerUnit = sanitizeNumber(raw.pricePerUnit, 0);

  const mat: Material = {
    id,
    name,
    unit,
    pricePerUnit,
    category,
  };

  if (typeof raw.batchSize === "number" || typeof raw.batchSize === "string") {
    mat.batchSize = Math.max(1, sanitizeNumber(raw.batchSize, 1));
  }
  if (typeof raw.wastagePercentage === "number" || typeof raw.wastagePercentage === "string") {
    mat.wastagePercentage = sanitizeNumber(raw.wastagePercentage, 0);
  }
  if (raw.originType === "bought" || raw.originType === "manufactured") {
    mat.originType = raw.originType;
  }
  if (typeof raw.extraCosts === "number" || typeof raw.extraCosts === "string") {
    mat.extraCosts = sanitizeNumber(raw.extraCosts, 0);
  }
  if (Array.isArray(raw.ingredients)) {
    mat.ingredients = raw.ingredients
      .filter(isRecord)
      .map((ing) => ({
        materialId: sanitizeString(ing.materialId),
        quantity: sanitizeNumber(ing.quantity, 1),
      }))
      .filter((ing) => Boolean(ing.materialId));
  }
  if (typeof raw.isSoldSeparately === "boolean") {
    mat.isSoldSeparately = raw.isSoldSeparately;
  }
  if (typeof raw.retailMargin === "number" || typeof raw.retailMargin === "string") {
    const val = sanitizeNumber(raw.retailMargin, NaN);
    if (!isNaN(val)) mat.retailMargin = val;
  }
  if (typeof raw.wholesaleMargin === "number" || typeof raw.wholesaleMargin === "string") {
    const val = sanitizeNumber(raw.wholesaleMargin, NaN);
    if (!isNaN(val)) mat.wholesaleMargin = val;
  }

  return mat;
}

export function validateProduct(raw: unknown): Product | null {
  if (!isRecord(raw)) return null;
  const id = sanitizeString(raw.id);
  const name = sanitizeString(raw.name);
  if (!id || !name) return null;

  const ingredients = Array.isArray(raw.ingredients)
    ? raw.ingredients
        .filter(isRecord)
        .map((ing) => ({
          materialId: sanitizeString(ing.materialId),
          quantity: sanitizeNumber(ing.quantity, 1),
        }))
        .filter((ing) => Boolean(ing.materialId))
    : [];

  const prod: Product = { id, name, ingredients };

  if (typeof raw.category === "string") {
    prod.category = raw.category.trim();
  }
  if (typeof raw.defaultFabricId === "string") {
    prod.defaultFabricId = raw.defaultFabricId;
  }
  if (typeof raw.fabricQuantity === "number" || typeof raw.fabricQuantity === "string") {
    prod.fabricQuantity = sanitizeNumber(raw.fabricQuantity, 0);
  }
  if (!prod.fabricQuantity || prod.fabricQuantity <= 0) {
    const fallbackProd = DEFAULT_GLOBAL_CONFIG.products?.find((p) => p.id === id);
    if (fallbackProd?.fabricQuantity && fallbackProd.fabricQuantity > 0) {
      prod.fabricQuantity = fallbackProd.fabricQuantity;
    }
  }
  if (Array.isArray(raw.allowedFabricIds)) {
    prod.allowedFabricIds = raw.allowedFabricIds.map((fid) => sanitizeString(fid)).filter(Boolean);
  } else {
    const fallbackProd = DEFAULT_GLOBAL_CONFIG.products?.find((p) => p.id === id);
    if (fallbackProd?.allowedFabricIds && fallbackProd.allowedFabricIds.length > 0) {
      prod.allowedFabricIds = [...fallbackProd.allowedFabricIds];
    }
  }
  if (typeof raw.profitMargin === "number" || typeof raw.profitMargin === "string") {
    const val = sanitizeNumber(raw.profitMargin, NaN);
    if (!isNaN(val)) prod.profitMargin = val;
  }
  if (typeof raw.wholesaleMargin === "number" || typeof raw.wholesaleMargin === "string") {
    const val = sanitizeNumber(raw.wholesaleMargin, NaN);
    if (!isNaN(val)) prod.wholesaleMargin = val;
  }
  if (typeof raw.productionWeight === "number" || typeof raw.productionWeight === "string") {
    const val = sanitizeNumber(raw.productionWeight, NaN);
    if (!isNaN(val) && val > 0) prod.productionWeight = val;
  }
  if (!prod.productionWeight || prod.productionWeight <= 0) {
    const fallbackProd = DEFAULT_GLOBAL_CONFIG.products?.find((p) => p.id === id);
    prod.productionWeight = fallbackProd?.productionWeight && fallbackProd.productionWeight > 0 ? fallbackProd.productionWeight : 1.0;
  }

  if (isRecord(raw.variantOverrides)) {
    const validOverrides: Record<string, VariantPriceOverride> = {};
    for (const [fabricId, val] of Object.entries(raw.variantOverrides)) {
      if (!isRecord(val)) continue;
      const r = sanitizeNumber(val.customRetailPrice, -1);
      const w = sanitizeNumber(val.customWholesalePrice, -1);
      const entry: VariantPriceOverride = {};
      if (r >= 0) entry.customRetailPrice = r;
      if (w >= 0) entry.customWholesalePrice = w;
      if (entry.customRetailPrice !== undefined || entry.customWholesalePrice !== undefined) {
        validOverrides[sanitizeString(fabricId)] = entry;
      }
    }
    if (Object.keys(validOverrides).length > 0) prod.variantOverrides = validOverrides;
  }

  return prod;
}

export function validateExpense(raw: unknown): Expense | null {
  if (!isRecord(raw)) return null;
  const id = sanitizeString(raw.id);
  const name = sanitizeString(raw.name);
  if (!id || !name) return null;
  const period = isPaymentPeriod(raw.period) ? raw.period : "monthly";
  const amount = sanitizeNumber(raw.amount, 0);
  return { id, name, amount, period };
}

export function validateDailyExpense(raw: unknown): DailyExpense | null {
  if (!isRecord(raw)) return null;
  const id = sanitizeString(raw.id);
  const name = sanitizeString(raw.name);
  if (!id || !name) return null;
  const amount = sanitizeNumber(raw.amount, 0);
  return { id, name, amount };
}

export function validateStaff(raw: unknown): Staff | null {
  if (!isRecord(raw)) return null;
  const id = sanitizeString(raw.id);
  const name = sanitizeString(raw.name);
  const role = sanitizeString(raw.role, "Colaborador");
  if (!id || !name) return null;
  const monthlySalary = sanitizeNumber(raw.monthlySalary, 0);
  const count = Math.max(1, sanitizeNumber(raw.count, 1));
  return { id, name, role, monthlySalary, count };
}

export function validateAuthorizedUser(raw: unknown): AuthorizedUser | null {
  if (!isRecord(raw)) return null;
  const id = sanitizeString(raw.id);
  const email = sanitizeString(raw.email);
  const name = sanitizeString(raw.name);
  if (!id || !email) return null;
  const roleStr = sanitizeString(raw.role);
  const role: 'admin' | 'operador' | 'visor' = ['admin', 'operador', 'visor'].includes(roleStr) ? (roleStr as 'admin' | 'operador' | 'visor') : 'visor';
  const statusStr = sanitizeString(raw.status);
  const status: 'ACTIVO' | 'INACTIVO' = ['ACTIVO', 'INACTIVO'].includes(statusStr) ? (statusStr as 'ACTIVO' | 'INACTIVO') : 'ACTIVO';
  const createdAt = sanitizeString(raw.createdAt) || new Date().toISOString().split('T')[0];
  return { id, email, name, role, status, createdAt };
}

export function validateAndNormalizeGlobalConfig(
  raw: unknown,
  fallback: GlobalConfig
): GlobalConfig {
  if (!isRecord(raw)) return fallback;

  const materials = Array.isArray(raw.materials)
    ? raw.materials.map(validateMaterial).filter((m): m is Material => m !== null)
    : fallback.materials;

  const products = Array.isArray(raw.products)
    ? raw.products.map(validateProduct).filter((p): p is Product => p !== null)
    : fallback.products;

  const regularPayments = Array.isArray(raw.regularPayments)
    ? raw.regularPayments.map(validateExpense).filter((e): e is Expense => e !== null)
    : fallback.regularPayments;

  const dailyExpenses = Array.isArray(raw.dailyExpenses)
    ? raw.dailyExpenses.map(validateDailyExpense).filter((d): d is DailyExpense => d !== null)
    : fallback.dailyExpenses;

  const staff = Array.isArray(raw.staff)
    ? raw.staff.map(validateStaff).filter((s): s is Staff => s !== null)
    : fallback.staff;

  let authorizedUsers = Array.isArray(raw.authorizedUsers)
    ? raw.authorizedUsers.map(validateAuthorizedUser).filter((u): u is AuthorizedUser => u !== null)
    : fallback.authorizedUsers;

  if (!authorizedUsers || authorizedUsers.length === 0) {
    authorizedUsers = [
      { id: 'usr-1', email: 'palvestegui@gmail.com', name: 'Pablo Alvestegui', role: 'admin', status: 'ACTIVO', createdAt: '2026-09-01' },
      { id: 'usr-2', email: 'doris@azafran.bo', name: 'Doris', role: 'admin', status: 'ACTIVO', createdAt: '2026-09-01' }
    ];
  }

  return {
    materials: Array.isArray(raw.materials) ? materials : fallback.materials,
    products: Array.isArray(raw.products) ? products : fallback.products,
    regularPayments: Array.isArray(raw.regularPayments) ? regularPayments : fallback.regularPayments,
    dailyExpenses: Array.isArray(raw.dailyExpenses) ? dailyExpenses : fallback.dailyExpenses,
    staff: Array.isArray(raw.staff) ? staff : fallback.staff,
    productionCapacity: Math.max(
      1,
      sanitizeNumber(raw.productionCapacity, fallback.productionCapacity)
    ),
    profitMargin: sanitizeNumber(raw.profitMargin, fallback.profitMargin),
    wholesaleMargin: sanitizeNumber(raw.wholesaleMargin, fallback.wholesaleMargin ?? 20),
    authorizedUsers: authorizedUsers,
  };
}
