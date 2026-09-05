import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { GlobalConfig, DailyExpense } from "../../types";
import { calculateMonthlyDaily } from "../../utils/calculations";

interface DailyExpensesViewProps {
  config: GlobalConfig;
  onChange: (c: GlobalConfig) => void;
}

export function DailyExpensesView({
  config,
  onChange,
}: DailyExpensesViewProps) {
  const generateId = () =>
    crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2, 9);

  const addExpense = () => {
    onChange({
      ...config,
      dailyExpenses: [
        { id: generateId(), name: "Nuevo Gasto Diario", amount: 0 },
        ...config.dailyExpenses,
      ],
    });
  };

  const removeExpense = (id: string) => {
    onChange({
      ...config,
      dailyExpenses: config.dailyExpenses.filter((p) => p.id !== id),
    });
  };

  const updateExpense = (id: string, updates: Partial<DailyExpense>) => {
    onChange({
      ...config,
      dailyExpenses: config.dailyExpenses.map((p) =>
        p.id === id ? { ...p, ...updates } : p
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
          <h2 className="text-2xl font-black italic">Gastos Diarios</h2>
          <p className="text-stone-400 text-sm mt-1">
            Comidas, viáticos, recargas de saldo (calculado x 22 días
            trabajables).
          </p>
        </div>
        <div className="bg-stone-900 border border-stone-800 p-4 rounded-2xl flex items-center gap-6 divide-x divide-stone-800">
          <div>
            <div className="text-xs uppercase font-bold text-stone-500 tracking-widest text-center">
              Gasto Diario
            </div>
            <div className="text-xl font-mono text-orange-400 font-bold text-center">
              Bs {totalDaily.toFixed(2)}
            </div>
          </div>
          <div className="pl-6">
            <div className="text-xs uppercase font-bold text-stone-500 tracking-widest text-center">
              Impacto al mes
            </div>
            <div className="text-3xl font-mono text-red-400 font-bold text-center">
              Bs {totalMonthly.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={addExpense}
        className="w-full sm:w-auto bg-orange-500/10 text-orange-500 border border-orange-500/30 px-6 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-orange-500/20 font-mono text-xs uppercase tracking-widest font-bold"
      >
        <Plus className="w-4 h-4" /> Añadir Gasto Diario
      </button>

      <div className="grid gap-3">
        {config.dailyExpenses.map((exp) => (
          <div
            key={exp.id}
            className="bg-stone-900 border border-stone-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-end gap-4"
          >
            <div className="flex-1">
              <label className="text-xs uppercase font-bold tracking-widest text-stone-500 block mb-1">
                Concepto del Gasto
              </label>
              <input
                value={exp.name}
                onChange={(e) =>
                  updateExpense(exp.id, { name: e.target.value })
                }
                className="bg-stone-950 text-white font-bold text-sm border-b border-transparent hover:border-stone-700 focus:border-orange-500 rounded p-2 focus:outline-none w-full"
              />
            </div>
            <div className="w-full sm:w-32 shrink-0">
              <label className="text-xs uppercase font-bold tracking-widest text-stone-500 block mb-1">
                Gasto por DÍA
              </label>
              <input
                type="number"
                value={exp.amount}
                onChange={(e) =>
                  updateExpense(exp.id, { amount: Number(e.target.value) })
                }
                className="bg-stone-950 border border-stone-800 text-orange-400 font-mono text-sm rounded p-2 focus:outline-none w-full text-right"
              />
            </div>
            <button
              onClick={() => removeExpense(exp.id)}
              className="self-end p-2 text-stone-600 hover:text-red-500 shrink-0 hidden sm:block"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => removeExpense(exp.id)}
              className="w-full sm:hidden py-2 bg-red-500/10 text-red-500 rounded-lg text-sm font-bold mt-2"
            >
              Eliminar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
