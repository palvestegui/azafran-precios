import { Expense, DailyExpense, Staff, GlobalConfig, Unit } from "../types";

export const WORKING_DAYS_PER_MONTH = 22;

/**
 * Returns the unit factor multiplier relative to a single piece/meter.
 * For packaging units like dozen (12) or 100pack (100), gives the per-item fraction.
 */
export function getUnitMultiplier(unit: Unit): number {
  switch (unit) {
    case "dozen":
      return 1 / 12;
    case "100pack":
      return 1 / 100;
    default:
      return 1;
  }
}

/**
 * Converts a raw unit cost to a single-piece cost, taking batchSize into account for batches.
 */
export function convertUnitCost(
  rawCost: number,
  unit: Unit,
  batchSize?: number
): number {
  if (unit === "batch") {
    const size = Math.max(1, batchSize || 1);
    return rawCost / size;
  }
  return rawCost * getUnitMultiplier(unit);
}

/**
 * Normalizes regular fixed payments (rent, utilities, amortizations) into a monthly cost.
 */
export function calculateMonthlyRegular(payments: Expense[]): number {
  return payments.reduce((acc, p) => {
    let monthly = p.amount;
    switch (p.period) {
      case "weekly":
        monthly = p.amount * 4.33;
        break;
      case "fortnightly":
        monthly = p.amount * 2.16;
        break;
      case "monthly":
        monthly = p.amount;
        break;
      case "bimonthly":
        monthly = p.amount / 2;
        break;
      case "quarterly":
        monthly = p.amount / 3;
        break;
      case "semiannually":
        monthly = p.amount / 6;
        break;
      case "yearly":
        monthly = p.amount / 12;
        break;
    }
    return acc + monthly;
  }, 0);
}

/**
 * Normalizes daily operational expenses into a monthly cost assuming 22 working days/month.
 */
export function calculateMonthlyDaily(expenses: DailyExpense[]): number {
  return expenses.reduce(
    (acc, p) => acc + p.amount * WORKING_DAYS_PER_MONTH,
    0
  );
}

/**
 * Aggregates monthly staff payroll (salary * count for all roles).
 */
export function calculateMonthlyStaff(staff: Staff[]): number {
  return staff.reduce((acc, s) => acc + s.monthlySalary * s.count, 0);
}

/**
 * Sums all operational fixed overhead: regular payments, daily operational expenses, and staff payroll.
 */
export function calculateTotalOverhead(config: GlobalConfig): number {
  return (
    calculateMonthlyRegular(config.regularPayments) +
    calculateMonthlyDaily(config.dailyExpenses) +
    calculateMonthlyStaff(config.staff)
  );
}
