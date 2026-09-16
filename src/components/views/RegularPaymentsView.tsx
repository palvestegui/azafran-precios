import React, { useState } from "react";
import { Plus, Trash2, Check, X } from "lucide-react";
import { GlobalConfig, Expense, PaymentPeriod } from "../../types";
import { calculateMonthlyRegular } from "../../utils/calculations";

export interface RegularPaymentsViewProps {
  config: GlobalConfig;
  onChange: (c: GlobalConfig) => void;
  onNotify?: (text: string, type: "success" | "error" | "info") => void;
}

const PERIOD_LABELS: Record<PaymentPeriod, string> = {
  weekly: "Semanal",
  fortnightly: "Quincenal",
  monthly: "Mensual",
  bimonthly: "Bimestral",
  quarterly: "Trimestral",
  semiannually: "Semestral",
  yearly: "Anual",
};

const PERIOD_MULTIPLIERS: Record<PaymentPeriod, number> = {
  weekly: 4.33,
  fortnightly: 2.16,
  monthly: 1,
  bimonthly: 0.5,
  quarterly: 0.333,
  semiannually: 0.166,
  yearly: 0.083,
};

export function RegularPaymentsView({ config, onChange, onNotify }: RegularPaymentsViewProps) {
  const [drafts, setDrafts] = useState<Record<string, Expense>>({});

  const generateId = () => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9);

  const addPayment = () => {
    const newPayment: Expense = { id: generateId(), name: "", amount: 0, period: "monthly" };
    onChange({ ...config, regularPayments: [newPayment, ...config.regularPayments] });
    setDrafts({ ...drafts, [newPayment.id]: newPayment });
    onNotify?.("Se agregó una fila", "info");
  };

  const removePayment = (id: string) => {
    const target = config.regularPayments.find((p) => p.id === id);
    onChange({ ...config, regularPayments: config.regularPayments.filter((p) => p.id !== id) });
    const newDrafts = { ...drafts };
    delete newDrafts[id];
    setDrafts(newDrafts);
    onNotify?.(`"${target?.name || "Pago"}" eliminado`, "info");
  };

  const handleDraftChange = (id: string, field: keyof Expense, value: any) => {
    const original = config.regularPayments.find((s) => s.id === id);
    const current = drafts[id] || original;
    if (!current) return;
    setDrafts({ ...drafts, [id]: { ...current, [field]: value } });
  };

  const saveRow = (id: string) => {
    const draft = drafts[id];
    if (!draft) return;
    onChange({ ...config, regularPayments: config.regularPayments.map((p) => (p.id === id ? draft : p)) });
    const newDrafts = { ...drafts };
    delete newDrafts[id];
    setDrafts(newDrafts);
    onNotify?.("Fila guardada", "success");
  };

  const discardRow = (id: string) => {
    const newDrafts = { ...drafts };
    delete newDrafts[id];
    setDrafts(newDrafts);
  };

  const totalMonthly = calculateMonthlyRegular(config.regularPayments);

  return (
    <div className="w-full flex flex-col h-full">
      <div className="flex justify-between items-center mb-4 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Pagos Regulares</h2>
          <p className="text-stone-400 text-xs mt-0.5">Suscripciones, alquileres, servicios, mantenimiento.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-stone-900 border border-stone-800 px-4 py-2 rounded-lg flex items-center gap-3">
            <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">Total Mensual</span>
            <span className="text-lg font-mono text-red-400 font-bold">Bs {totalMonthly.toFixed(2)}</span>
          </div>
          <button
            onClick={addPayment}
            className="bg-orange-500 text-black px-4 py-2 rounded-lg font-mono text-xs uppercase tracking-wider font-bold hover:bg-orange-400 transition-colors flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" /> Añadir
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-stone-900/50 border border-stone-800 rounded-xl relative">
        <table className="w-full text-left text-sm text-stone-300">
          <thead className="text-xs uppercase bg-stone-900/80 sticky top-0 z-10 shadow-sm border-b border-stone-800">
            <tr>
              <th className="px-4 py-3 font-mono font-bold text-stone-400">Concepto</th>
              <th className="px-4 py-3 font-mono font-bold text-stone-400 w-36">Monto (Bs)</th>
              <th className="px-4 py-3 font-mono font-bold text-stone-400 w-40">Frecuencia</th>
              <th className="px-4 py-3 font-mono font-bold text-stone-400 w-40 text-right">Impacto Mensual</th>
              <th className="px-4 py-3 font-mono font-bold text-stone-400 w-28 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-800/50 font-mono text-xs">
            {config.regularPayments.map((pay) => {
              const isDirty = !!drafts[pay.id];
              const data = drafts[pay.id] || pay;
              const rowImpact = data.amount * (PERIOD_MULTIPLIERS[data.period] || 0);

              return (
                <tr key={pay.id} className={isDirty ? "bg-orange-500/5" : "hover:bg-stone-800/20"}>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      placeholder="Concepto..."
                      className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1.5 focus:border-orange-500 outline-none text-white"
                      value={data.name}
                      onChange={(e) => handleDraftChange(pay.id, "name", e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-2 text-stone-400 relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none">Bs</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      className="w-full bg-stone-950 border border-stone-800 rounded pl-8 pr-2 py-1.5 focus:border-orange-500 outline-none text-white"
                      value={data.amount || ""}
                      onChange={(e) => handleDraftChange(pay.id, "amount", parseFloat(e.target.value) || 0)}
                      onWheel={(e) => e.currentTarget.blur()}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <select
                      className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1.5 focus:border-orange-500 outline-none text-white"
                      value={data.period}
                      onChange={(e) => handleDraftChange(pay.id, "period", e.target.value as PaymentPeriod)}
                    >
                      {Object.entries(PERIOD_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2 text-right font-bold text-red-400">
                    Bs {rowImpact.toFixed(2)}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-center gap-1">
                      {isDirty ? (
                        <>
                          <button onClick={() => saveRow(pay.id)} className="p-1.5 text-emerald-400 hover:bg-emerald-400/10 rounded transition-colors" title="Guardar">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => discardRow(pay.id)} className="p-1.5 text-stone-400 hover:bg-stone-800 rounded transition-colors" title="Descartar">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <button onClick={() => removePayment(pay.id)} className="p-1.5 text-stone-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors" title="Eliminar">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {config.regularPayments.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-stone-500">
                  No hay pagos regulares registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
