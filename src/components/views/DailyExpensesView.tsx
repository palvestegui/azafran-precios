import React from "react";
import { Plus } from "lucide-react";
import { GlobalConfig, DailyExpense } from "../../types";
import { calculateMonthlyDaily } from "../../utils/calculations";
import { DailyExpenseCard } from "../overhead/DailyExpenseCard";

export interface DailyExpensesViewProps {
  config: GlobalConfig;
  onChange: (c: GlobalConfig) => void;
  onNotify?: (text: string, type: "success" | "error" | "info") => void;
}

export function DailyExpensesView({
  config,
  onChange,
  onNotify,
}: DailyExpensesViewProps) {
  const generateId = () =>
    crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2, 9);

  const addExpense = () => {
    const newExpense: DailyExpense = {
      id: generateId(),
      name: "Nuevo Gasto Diario",
      amount: 0,
    };

    onChange({
      ...config,
      dailyExpenses: [newExpense, ...config.dailyExpenses],
    });

    onNotify?.("Se agregó un nuevo gasto diario", "info");
  };

  const removeExpense = (id: string) => {
    const target = config.dailyExpenses.find((p) => p.id === id);
    onChange({
      ...config,
      dailyExpenses: config.dailyExpenses.filter((p) => p.id !== id),
    });
    onNotify?.(`"${target?.name || "Gasto"}" eliminado`, "info");
  };

  const saveExpense = (updated: DailyExpense) => {
    onChange({
      ...config,
      dailyExpenses: config.dailyExpenses.map((p) =>
        p.id === updated.id ? updated : p
      ),
    });
  };

  const totalMonthly = calculateMonthlyDaily(config.dailyExpenses);
  const totalDaily = config.dailyExpenses.reduce(
    (acc, current) => acc + current.amount,
    0
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-2xl font-black italic text-white">
            Gastos Diarios
          </h2>
          <p className="text-stone-400 text-sm mt-1">
            Comidas, viáticos, recargas (22 días hábiles/mes). Los cambios
            requieren confirmación antes de impactar el cálculo mensual.
          </p>
        </div>
        <div className="bg-stone-900 border border-stone-800 p-4 px-6 rounded-2xl flex items-center gap-6 divide-x divide-stone-800 shadow-lg">
          <div>
            <div className="text-xs uppercase font-bold text-stone-500 tracking-widest text-center">
              Gasto Diario
            </div>
            <div className="text-xl font-mono text-orange-400 font-bold text-center mt-0.5">
              Bs {totalDaily.toFixed(2)}
            </div>
          </div>
          <div className="pl-6">
            <div className="text-xs uppercase font-bold text-stone-500 tracking-widest text-center">
              Impacto al mes
            </div>
            <div className="text-3xl font-mono text-red-400 font-bold text-center mt-0.5">
              Bs {totalMonthly.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={addExpense}
        className="w-full sm:w-auto bg-orange-500/10 text-orange-500 border border-orange-500/30 px-6 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-orange-500/20 font-mono text-xs uppercase tracking-widest font-bold transition-all active:scale-95 cursor-pointer"
      >
        <Plus className="w-4 h-4" /> Añadir Gasto Diario
      </button>

      <div className="grid gap-3">
        {config.dailyExpenses.map((exp) => (
          <DailyExpenseCard
            key={exp.id}
            expense={exp}
            onSave={saveExpense}
            onRemove={removeExpense}
            onNotify={onNotify}
          />
        ))}
        {config.dailyExpenses.length === 0 && (
          <div className="text-center py-12 bg-stone-900/30 border border-dashed border-stone-800 rounded-2xl text-stone-500 text-sm">
            No hay gastos diarios registrados. Haz clic en "Añadir Gasto
            Diario".
          </div>
        )}
      </div>
    </div>
  );
}
