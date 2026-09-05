import {
  GlobalConfig,
  Material,
  Product,
  Expense,
  DailyExpense,
  Staff,
  Unit,
  PaymentPeriod,
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
  if (typeof raw.retailMargin === "number" && !isNaN(raw.retailMargin) && isFinite(raw.retailMargin)) {
    mat.retailMargin = raw.retailMargin;
  } else if (typeof raw.retailMargin === "string" && raw.retailMargin.trim() !== "") {
    const parsed = parseFloat(raw.retailMargin);
    if (!isNaN(parsed) && isFinite(parsed)) {
      mat.retailMargin = parsed;
    }
  }

  if (typeof raw.wholesaleMargin === "number" && !isNaN(raw.wholesaleMargin) && isFinite(raw.wholesaleMargin)) {
    mat.wholesaleMargin = raw.wholesaleMargin;
  } else if (typeof raw.wholesaleMargin === "string" && raw.wholesaleMargin.trim() !== "") {
    const parsed = parseFloat(raw.wholesaleMargin);
    if (!isNaN(parsed) && isFinite(parsed)) {
      mat.wholesaleMargin = parsed;
    }
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
    prod.allowedFabricIds = raw.allowedFabricIds
      .map((fid) => sanitizeString(fid))
      .filter(Boolean);
  }
  if (typeof raw.profitMargin === "number" && !isNaN(raw.profitMargin) && isFinite(raw.profitMargin)) {
    prod.profitMargin = raw.profitMargin;
  } else if (typeof raw.profitMargin === "string" && raw.profitMargin.trim() !== "") {
    const parsed = parseFloat(raw.profitMargin);
    if (!isNaN(parsed) && isFinite(parsed)) {
      prod.profitMargin = parsed;
    }
  }

  if (typeof raw.wholesaleMargin === "number" && !isNaN(raw.wholesaleMargin) && isFinite(raw.wholesaleMargin)) {
    prod.wholesaleMargin = raw.wholesaleMargin;
  } else if (typeof raw.wholesaleMargin === "string" && raw.wholesaleMargin.trim() !== "") {
    const parsed = parseFloat(raw.wholesaleMargin);
    if (!isNaN(parsed) && isFinite(parsed)) {
      prod.wholesaleMargin = parsed;
    }
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
  };
}
