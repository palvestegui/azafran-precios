import React from "react";
import { Save, RotateCcw, Check } from "lucide-react";
import { cn } from "../../lib/utils";

export interface CardDraftFooterProps {
  isDirty: boolean;
  onSave: () => void | Promise<void>;
  onDiscard: () => void;
  statusMessage?: { text: string; type: "success" | "info" } | null;
  saveLabel?: string;
  discardLabel?: string;
  compact?: boolean;
  className?: string;
}

/**
 * Universal action bar for draft-protected cards and table rows.
 * Provides unambiguous visual indication of uncommitted edits
 * and explicit confirmation / revert actions.
 */
export function CardDraftFooter({
  isDirty,
  onSave,
  onDiscard,
  statusMessage,
  saveLabel = "Guardar Cambios",
  discardLabel = "Descartar",
  compact = false,
  className,
}: CardDraftFooterProps) {
  if (compact) {
    return (
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-2.5 pt-2.5 mt-2 border-t border-stone-800/60",
          className
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          {isDirty ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Sin guardar
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-stone-500 shrink-0 whitespace-nowrap">
              <Check className="w-3 h-3 text-emerald-500/70" />
              Guardado
            </span>
          )}
          {statusMessage && (
            <span
              className={cn(
                "text-[10px] font-mono px-2 py-0.5 rounded truncate transition-all",
                statusMessage.type === "success"
                  ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                  : "text-stone-300 bg-stone-800"
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
            title="Descartar cambios"
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all border whitespace-nowrap select-none shrink-0",
              isDirty
                ? "bg-stone-900 border-stone-700 text-stone-300 hover:text-white hover:bg-stone-800 active:scale-95 cursor-pointer"
                : "bg-stone-900/40 border-stone-800/40 text-stone-600 cursor-not-allowed"
            )}
          >
            <RotateCcw className="w-3 h-3 shrink-0" />
            <span>{discardLabel}</span>
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!isDirty}
            title="Guardar cambios"
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-mono font-bold transition-all shadow-sm whitespace-nowrap select-none shrink-0",
              isDirty
                ? "bg-orange-500 text-stone-950 hover:bg-orange-400 active:scale-95 shadow-orange-500/20 cursor-pointer"
                : "bg-stone-800/80 text-stone-500 cursor-not-allowed"
            )}
          >
            <Save className="w-3 h-3 shrink-0" />
            <span>{saveLabel}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 pt-3 mt-3 border-t border-stone-800/80",
        className
      )}
    >
      <div className="flex items-center gap-2">
        {isDirty ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            Cambios sin guardar
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono text-stone-500 bg-stone-950/60 border border-stone-800/60 whitespace-nowrap">
            <Check className="w-3.5 h-3.5 text-emerald-500" />
            Al día
          </span>
        )}
        {statusMessage && (
          <span
            className={cn(
              "text-xs font-mono px-2 py-0.5 rounded-md transition-all animate-in fade-in",
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
            "flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-mono uppercase tracking-wider font-bold transition-all border whitespace-nowrap select-none shrink-0",
            isDirty
              ? "bg-stone-900 border-stone-700 text-stone-300 hover:text-white hover:bg-stone-800 active:scale-95 cursor-pointer"
              : "bg-stone-900/30 border-stone-800/40 text-stone-600 cursor-not-allowed"
          )}
        >
          <RotateCcw className="w-3 h-3 shrink-0" />
          <span>{discardLabel}</span>
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!isDirty}
          className={cn(
            "flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-mono uppercase tracking-wider font-bold transition-all shadow-md whitespace-nowrap select-none shrink-0",
            isDirty
              ? "bg-orange-500 text-stone-950 hover:bg-orange-400 active:scale-95 shadow-orange-500/20 cursor-pointer"
              : "bg-stone-800 text-stone-500 cursor-not-allowed"
          )}
        >
          <Save className="w-3.5 h-3.5 shrink-0" />
          <span>{saveLabel}</span>
        </button>
      </div>
    </div>
  );
}
