import { Save, RotateCcw, Check } from "lucide-react";
import { cn } from "../../lib/utils";

interface ProductDraftFooterProps {
  isDirty: boolean;
  statusMessage: { text: string; type: "success" | "info" } | null;
  onDiscard: () => void;
  onSave: () => void;
}

export function ProductDraftFooter({
  isDirty,
  statusMessage,
  onDiscard,
  onSave,
}: ProductDraftFooterProps) {
  return (
    <div className="sticky bottom-0 z-20 -mx-6 -mb-6 p-4 px-6 bg-stone-950/95 backdrop-blur-md border-t border-stone-800 flex flex-wrap items-center justify-between gap-3 shadow-2xl rounded-b-3xl">
      <div className="flex items-center gap-3">
        {isDirty ? (
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            Cambios pendientes de confirmación
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono text-stone-500 bg-stone-900 border border-stone-800">
            <Check className="w-3.5 h-3.5 text-emerald-500" />
            Al día con el catálogo
          </span>
        )}
        {statusMessage && (
          <span
            className={cn(
              "text-xs font-mono px-2.5 py-1 rounded-lg transition-all animate-in fade-in",
              statusMessage.type === "success"
                ? "text-emerald-300 bg-emerald-500/20 border border-emerald-500/30"
                : "text-stone-300 bg-stone-800 border border-stone-700"
            )}
          >
            {statusMessage.text}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={onDiscard}
          disabled={!isDirty}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider font-bold transition-all border whitespace-nowrap select-none shrink-0",
            isDirty
              ? "bg-stone-900 border-stone-700 text-stone-300 hover:text-white hover:bg-stone-800 active:scale-95 cursor-pointer"
              : "bg-stone-900/30 border-stone-800/50 text-stone-600 cursor-not-allowed"
          )}
        >
          <RotateCcw className="w-3.5 h-3.5 shrink-0" />
          <span>Descartar</span>
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!isDirty}
          className={cn(
            "flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-mono uppercase tracking-wider font-bold transition-all shadow-md whitespace-nowrap select-none shrink-0",
            isDirty
              ? "bg-orange-500 text-black hover:bg-orange-400 active:scale-95 shadow-orange-500/20 cursor-pointer"
              : "bg-stone-800 text-stone-500 cursor-not-allowed"
          )}
        >
          <Save className="w-3.5 h-3.5 shrink-0" />
          <span>Guardar Cambios</span>
        </button>
      </div>
    </div>
  );
}
