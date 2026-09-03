export type Unit = 'm' | '100pack' | 'dozen' | 'unit' | 'spool' | 'service';
export type PaymentPeriod = 'weekly' | 'fortnightly' | 'monthly' | 'bimonthly' | 'quarterly' | 'semiannually' | 'yearly';

export interface Material {
  id: string;
  name: string;
  category?: 'fabric' | 'other' | 'accessory';
  unit: Unit;
  pricePerUnit: number;
  wastagePercentage?: number;
}

export interface ProductIngredient {
  materialId: string;
  quantity: number; 
}

export interface Product {
  id: string;
  name: string;
  defaultFabricId?: string;
  fabricQuantity?: number;
  allowedFabricIds?: string[];
  ingredients: ProductIngredient[];
  profitMargin?: number;
  wholesaleMargin?: number;
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

export interface GlobalConfig {
  materials: Material[];
  products: Product[];
  regularPayments: Expense[];
  dailyExpenses: DailyExpense[];
  staff: Staff[];
  profitMargin: number;
  wholesaleMargin?: number;
  productionCapacity: number;
}
