import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { GlobalConfig, Expense, PaymentPeriod } from "../../types";
import { calculateMonthlyRegular } from "../../utils/calculations";
import { isPaymentPeriod } from "../../utils/validation";

interface RegularPaymentsViewProps {
  config: GlobalConfig;
  onChange: (c: GlobalConfig) => void;
}

export function RegularPaymentsView({
  config,
  onChange,
}: RegularPaymentsViewProps) {
  const generateId = () =>
    crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2, 9);

  const addPayment = () => {
    onChange({
      ...config,
      regularPayments: [
        {
          id: generateId(),
          name: "Nuevo Pago",
          amount: 0,
          period: "monthly",
        },
        ...config.regularPayments,
      ],
    });
  };

  const removePayment = (id: string) => {
    onChange({
      ...config,
      regularPayments: config.regularPayments.filter((p) => p.id !== id),
    });
  };

  const updatePayment = (id: string, updates: Partial<Expense>) => {
    onChange({
      ...config,
      regularPayments: config.regularPayments.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    });
  };

  const totalMonthly = calculateMonthlyRegular(config.regularPayments);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-2xl font-black italic">Pagos Regulares</h2>
          <p className="text-stone-400 text-sm mt-1">
            Suscripciones, alquileres, luz, agua, etc.
          </p>
        </div>
        <div className="bg-stone-900 border border-stone-800 px-6 py-4 rounded-2xl flex items-center gap-6">
          <div className="text-xs uppercase font-bold text-stone-500 tracking-widest">
            Total Gasto Mensual
            <br />
            Regular
          </div>
          <div className="text-3xl font-mono text-red-400 font-bold">
            Bs {totalMonthly.toFixed(2)}
          </div>
        </div>
      </div>

      <button
        onClick={addPayment}
        className="w-full sm:w-auto bg-orange-500/10 text-orange-500 border border-orange-500/30 px-6 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-orange-500/20 font-mono text-xs uppercase tracking-widest font-bold"
      >
        <Plus className="w-4 h-4" /> Añadir Pago Regular
      </button>

      <div className="grid gap-3">
        {config.regularPayments.map((pay) => (
          <div
            key={pay.id}
            className="bg-stone-900 border border-stone-800 rounded-xl p-4 flex flex-col md:flex-row md:items-end gap-4"
          >
            <div className="flex-1">
              <label className="text-xs uppercase font-bold tracking-widest text-stone-500 block mb-1">
                Nombre / Concepto
              </label>
              <input
                value={pay.name}
                onChange={(e) =>
                  updatePayment(pay.id, { name: e.target.value })
                }
                className="bg-stone-950 text-white font-bold text-sm border-b border-transparent hover:border-stone-700 focus:border-orange-500 rounded p-2 focus:outline-none w-full"
              />
            </div>
            <div className="w-full md:w-32 shrink-0">
              <label className="text-xs uppercase font-bold tracking-widest text-stone-500 block mb-1">
                Monto (Bs)
              </label>
              <input
                type="number"
                value={pay.amount}
                onChange={(e) =>
                  updatePayment(pay.id, { amount: Number(e.target.value) })
                }
                className="bg-stone-950 border border-stone-800 text-orange-400 font-mono text-sm rounded p-2 focus:outline-none w-full text-right"
              />
            </div>
            <div className="w-full md:w-40 shrink-0">
              <label className="text-xs uppercase font-bold tracking-widest text-stone-500 block mb-1">
                Frecuencia
              </label>
              <select
                value={pay.period}
                onChange={(e) => {
                  const val = e.target.value;
                  if (isPaymentPeriod(val)) {
                    updatePayment(pay.id, { period: val });
                  }
                }}
                className="bg-stone-950 border border-stone-800 text-white text-sm rounded p-2 focus:outline-none w-full"
              >
                <option value="weekly">Semanal</option>
                <option value="fortnightly">Quincenal</option>
                <option value="monthly">Mensual</option>
                <option value="bimonthly">Bimestral</option>
                <option value="quarterly">Trimestral</option>
                <option value="semiannually">Semestral</option>
                <option value="yearly">Anual</option>
              </select>
            </div>
            <button
              onClick={() => removePayment(pay.id)}
              className="self-end p-2 text-stone-600 hover:text-red-500 shrink-0 hidden md:block"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => removePayment(pay.id)}
              className="w-full md:hidden py-2 bg-red-500/10 text-red-500 rounded-lg text-sm font-bold mt-2"
            >
              Eliminar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
