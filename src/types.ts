export type Unit = 'm' | '100pack' | 'dozen' | 'unit' | 'spool' | 'service' | 'batch' | 'pie';
export type PaymentPeriod = 'weekly' | 'fortnightly' | 'monthly' | 'bimonthly' | 'quarterly' | 'semiannually' | 'yearly';

export interface ProductIngredient {
  materialId: string;
  quantity: number; 
}

export interface AccessoryBatchCalculation {
  quantity: number;
  batchesCount: number;
  batchSize: number;
  totalCost: number;
  unitCost: number;
  unitRetailPrice: number;
  totalRetailPrice: number;
  retailProfit: number;
  unitWholesalePrice: number;
  totalWholesalePrice: number;
  wholesaleProfit: number;
}

export interface Material {
  id: string;
  name: string;
  category?: 'fabric' | 'other' | 'accessory' | 'service';
  unit: Unit;
  pricePerUnit: number;
  batchSize?: number;
  wastagePercentage?: number;
  originType?: 'bought' | 'manufactured';
  extraCosts?: number;
  ingredients?: ProductIngredient[];
  isSoldSeparately?: boolean;
  /** Optional custom retail margin (%) for accessories/services or fabric-level overrides */
  retailMargin?: number;
  /** Optional custom wholesale margin (%) for accessories/services or fabric-level overrides */
  wholesaleMargin?: number;
}

export interface VariantPriceOverride {
  customRetailPrice?: number;
  customWholesalePrice?: number;
  retailPrice?: number;
  wholesalePrice?: number;
}

export interface Product {
  id: string;
  name: string;
  category?: string;
  description?: string;
  imageUrl?: string;      // Vista Frontal (9:16)
  backImageUrl?: string;  // Vista Posterior / Espalda (9:16)
  laborCost?: number;
  defaultFabricId?: string;
  fabricQuantity?: number;
  allowedFabricIds?: string[];
  ingredients: ProductIngredient[];
  profitMargin?: number;
  wholesaleMargin?: number;
  /**
   * Relative workshop effort/time factor compared to a base garment (Filipina = 1.0).
   * Scales allocated workshop overhead and labor.
   * Default fallback: 1.0 (e.g., Filipina = 1.0, Pantalón = 0.8, Mandil = 0.5, Gorro = 0.25).
   */
  productionWeight?: number;
  /**
   * Variant price overrides keyed by fabric/material ID.
   */
  variantOverrides?: Record<string, VariantPriceOverride>;
}

export interface Expense {
  id: string;
  name: string;
  amount: number;
  period: PaymentPeriod;
}

export interface DailyExpense {
  id: string;
  name: string;
  amount: number;
}

export interface Staff {
  id: string;
  name: string;
  role: string;
  monthlySalary: number;
  count: number;
}

export interface AuthorizedUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'operador' | 'visor';
  status: 'ACTIVO' | 'INACTIVO';
  createdAt: string;
}

export interface GlobalConfig {
  materials: Material[];
  products: Product[];
  regularPayments: Expense[];
  dailyExpenses: DailyExpense[];
  staff: Staff[];
  profitMargin: number;
  wholesaleMargin?: number;
  productionCapacity: number;
  authorizedUsers?: AuthorizedUser[];
}
