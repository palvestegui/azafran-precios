import React from "react";
import { Trash2 } from "lucide-react";
import { Staff } from "../../types";
import { useDraftState } from "../../hooks/useDraftState";
import { CardDraftFooter } from "../common/CardDraftFooter";
import { cn } from "../../lib/utils";

export interface StaffCardProps {
  key?: React.Key;
  staff: Staff;
  onSave: (saved: Staff) => void;
  onRemove: (id: string) => void;
  onNotify?: (text: string, type: "success" | "error" | "info") => void;
}

export function StaffCard({
  staff,
  onSave,
  onRemove,
  onNotify,
}: StaffCardProps) {
  const {
    draft,
    isDirty,
    updateField,
    commit,
    discard,
    statusMessage,
  } = useDraftState<Staff>(staff, onSave, {
    entityName: staff.name,
    onNotify,
  });

  const rowTotal = Math.max(1, draft.count || 1) * (draft.monthlySalary || 0);

  return (
    <div
      className={cn(
        "bg-stone-900 border rounded-2xl p-4 flex flex-col gap-3 group transition-all duration-200",
        isDirty
          ? "border-amber-500/50 shadow-lg shadow-amber-500/5"
          : "border-stone-800 hover:border-stone-700"
      )}
    >
      <div className="flex flex-col md:flex-row items-start md:items-end gap-4">
        <div className="w-full md:w-16 shrink-0">
          <label className="text-xs uppercase font-bold tracking-widest text-stone-500 block mb-1">
            Cant.
          </label>
          <input
            type="number"
            min={1}
            value={draft.count}
            onWheel={(e) => e.currentTarget.blur()}
            onChange={(e) =>
              updateField("count", Math.max(1, Number(e.target.value)))
            }
            className="bg-stone-950 border border-stone-800 text-orange-400 font-mono text-center text-lg font-black rounded-lg p-1.5 focus:outline-none focus:border-orange-500 w-full"
          />
        </div>

        <div className="flex-1 w-full">
          <label className="text-xs uppercase font-bold tracking-widest text-stone-500 block mb-1">
            Nombre / Título
          </label>
          <input
            value={draft.name}
            onChange={(e) => updateField("name", e.target.value)}
            placeholder="Nombre del personal"
            className="bg-stone-950 text-white font-bold text-base border border-stone-800 hover:border-stone-700 focus:border-orange-500 rounded-lg p-2 focus:outline-none w-full"
          />
        </div>

        <div className="flex-1 w-full">
          <label className="text-xs uppercase font-bold tracking-widest text-stone-500 block mb-1">
            Cargo / Función
          </label>
          <input
            value={draft.role || ""}
            onChange={(e) => updateField("role", e.target.value)}
            placeholder="Ej: Costurero, Diseñador, Cortador"
            className="bg-stone-950 text-stone-300 text-sm border border-stone-800 hover:border-stone-700 focus:border-orange-500 rounded-lg p-2 focus:outline-none w-full"
          />
        </div>

        <div className="w-full md:w-36 shrink-0">
          <label className="text-xs uppercase font-bold tracking-widest text-stone-500 block mb-1">
            Sueldo x1 (Bs)
          </label>
          <input
            type="number"
            min="0"
            step="10"
            value={draft.monthlySalary}
            onWheel={(e) => e.currentTarget.blur()}
            onChange={(e) =>
              updateField("monthlySalary", Math.max(0, Number(e.target.value)))
            }
            className="bg-stone-950 border border-stone-800 text-amber-400 font-mono text-sm rounded-lg p-2 focus:outline-none focus:border-orange-500 w-full text-right"
          />
        </div>

        <div className="w-full md:w-32 shrink-0 flex flex-col justify-end pb-1 text-right">
          <span className="text-[10px] uppercase font-bold text-stone-500 block mb-0.5">
            Total Fila
          </span>
          <span className="font-mono text-white font-bold text-base">
            Bs {rowTotal.toFixed(2)}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onRemove(draft.id)}
          className="hidden md:block self-end p-2 text-stone-600 hover:text-red-500 shrink-0 mb-1 transition-colors cursor-pointer"
          title="Eliminar personal"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onRemove(draft.id)}
          className="w-full md:hidden py-2 bg-red-500/10 text-red-500 rounded-lg text-sm font-bold mt-1"
        >
          Eliminar Personal
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
