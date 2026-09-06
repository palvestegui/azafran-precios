import React from "react";
import { Trash2 } from "lucide-react";
import { DailyExpense } from "../../types";
import { useDraftState } from "../../hooks/useDraftState";
import { CardDraftFooter } from "../common/CardDraftFooter";
import { cn } from "../../lib/utils";

export interface DailyExpenseCardProps {
  key?: React.Key;
  expense: DailyExpense;
  onSave: (saved: DailyExpense) => void;
  onRemove: (id: string) => void;
  onNotify?: (text: string, type: "success" | "error" | "info") => void;
}

export function DailyExpenseCard({
  expense,
  onSave,
  onRemove,
  onNotify,
}: DailyExpenseCardProps) {
  const {
    draft,
    isDirty,
    updateField,
    commit,
    discard,
    statusMessage,
  } = useDraftState<DailyExpense>(expense, onSave, {
    entityName: expense.name,
    onNotify,
  });

  return (
    <div
      className={cn(
        "bg-stone-900 border rounded-2xl p-4 flex flex-col gap-2 group transition-all duration-200",
        isDirty
          ? "border-amber-500/50 shadow-lg shadow-amber-500/5"
          : "border-stone-800 hover:border-stone-700"
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1">
          <label className="text-xs uppercase font-bold tracking-widest text-stone-500 block mb-1">
            Concepto del Gasto
          </label>
          <input
            value={draft.name}
            onChange={(e) => updateField("name", e.target.value)}
            placeholder="Ej: Refrigerio, Viáticos, Transporte"
            className="bg-stone-950 text-white font-bold text-sm border border-stone-800 hover:border-stone-700 focus:border-orange-500 rounded-lg p-2 focus:outline-none w-full"
          />
        </div>

        <div className="w-full sm:w-36 shrink-0">
          <label className="text-xs uppercase font-bold tracking-widest text-stone-500 block mb-1">
            Gasto por DÍA (Bs)
          </label>
          <input
            type="number"
            min="0"
            step="0.5"
            value={draft.amount}
            onWheel={(e) => e.currentTarget.blur()}
            onChange={(e) =>
              updateField("amount", Math.max(0, Number(e.target.value)))
            }
            className="bg-stone-950 border border-stone-800 text-orange-400 font-mono text-sm rounded-lg p-2 focus:outline-none focus:border-orange-500 w-full text-right"
          />
        </div>

        <button
          type="button"
          onClick={() => onRemove(draft.id)}
          className="self-end p-2 text-stone-600 hover:text-red-500 shrink-0 hidden sm:block transition-colors cursor-pointer mb-0.5"
          title="Eliminar gasto diario"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onRemove(draft.id)}
          className="w-full sm:hidden py-2 bg-red-500/10 text-red-500 rounded-lg text-sm font-bold mt-1"
        >
          Eliminar Gasto
        </button>
      </div>

      <CardDraftFooter
        isDirty={isDirty}
        onSave={commit}
        onDiscard={discard}
        statusMessage={statusMessage}
        compact
      />
    </div>
  );
}
