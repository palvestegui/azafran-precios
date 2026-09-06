import React from "react";
import { Plus } from "lucide-react";
import { GlobalConfig, Expense } from "../../types";
import { calculateMonthlyRegular } from "../../utils/calculations";
import { RegularPaymentCard } from "../overhead/RegularPaymentCard";

export interface RegularPaymentsViewProps {
  config: GlobalConfig;
  onChange: (c: GlobalConfig) => void;
  onNotify?: (text: string, type: "success" | "error" | "info") => void;
}

export function RegularPaymentsView({
  config,
  onChange,
  onNotify,
}: RegularPaymentsViewProps) {
  const generateId = () =>
    crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2, 9);

  const addPayment = () => {
    const newPayment: Expense = {
      id: generateId(),
      name: "Nuevo Pago",
      amount: 0,
      period: "monthly",
    };

    onChange({
      ...config,
      regularPayments: [newPayment, ...config.regularPayments],
    });

    onNotify?.("Se agregó un nuevo pago regular", "info");
  };

  const removePayment = (id: string) => {
    const target = config.regularPayments.find((p) => p.id === id);
    onChange({
      ...config,
      regularPayments: config.regularPayments.filter((p) => p.id !== id),
    });
    onNotify?.(`"${target?.name || "Pago"}" eliminado`, "info");
  };

  const savePayment = (updated: Expense) => {
    onChange({
      ...config,
      regularPayments: config.regularPayments.map((p) =>
        p.id === updated.id ? updated : p
      ),
    });
  };

  const totalMonthly = calculateMonthlyRegular(config.regularPayments);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-2xl font-black italic text-white">
            Pagos Regulares
          </h2>
          <p className="text-stone-400 text-sm mt-1">
            Suscripciones, alquileres, luz, agua, mantenimiento. Los cambios
            requieren confirmación antes de impactar el costo indirecto por unidad.
          </p>
        </div>
        <div className="bg-stone-900 border border-stone-800 px-6 py-4 rounded-2xl flex items-center gap-6 shadow-lg">
          <div className="text-xs uppercase font-bold text-stone-500 tracking-widest">
            Total Mensual
            <br />
            Confirmado
          </div>
          <div className="text-3xl font-mono text-red-400 font-bold">
            Bs {totalMonthly.toFixed(2)}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={addPayment}
        className="w-full sm:w-auto bg-orange-500/10 text-orange-500 border border-orange-500/30 px-6 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-orange-500/20 font-mono text-xs uppercase tracking-widest font-bold transition-all active:scale-95 cursor-pointer"
      >
        <Plus className="w-4 h-4" /> Añadir Pago Regular
      </button>

      <div className="grid gap-3">
        {config.regularPayments.map((pay) => (
          <RegularPaymentCard
            key={pay.id}
            payment={pay}
            onSave={savePayment}
            onRemove={removePayment}
            onNotify={onNotify}
          />
        ))}
        {config.regularPayments.length === 0 && (
          <div className="text-center py-12 bg-stone-900/30 border border-dashed border-stone-800 rounded-2xl text-stone-500 text-sm">
            No hay pagos regulares registrados. Haz clic en "Añadir Pago
            Regular".
          </div>
        )}
      </div>
    </div>
  );
}
