import React from "react";
import { Trash2 } from "lucide-react";
import { Material } from "../../types";
import { isUnit } from "../../utils/validation";
import { useDraftState } from "../../hooks/useDraftState";
import { CardDraftFooter } from "../common/CardDraftFooter";
import { cn } from "../../lib/utils";

export interface MaterialCardProps {
  key?: React.Key;
  material: Material;
  allMaterials?: Material[];
  onSave: (saved: Material) => void;
  onRemove: (id: string) => void;
  onNotify?: (text: string, type: "success" | "error" | "info") => void;
  defaultRetailMargin?: number;
  defaultWholesaleMargin?: number;
}

export function MaterialCard({
  material,
  onSave,
  onRemove,
  onNotify,
  defaultRetailMargin = 35,
  defaultWholesaleMargin = 20,
}: MaterialCardProps) {
  const {
    draft,
    isDirty,
    updateField,
    updateDraft,
    commit,
    discard,
    statusMessage,
  } = useDraftState<Material>(material, onSave, {
    entityName: material.name,
    onNotify,
  });

  const isFabric = draft.category === "fabric";

  return (
    <div
      className={cn(
        "bg-stone-900 border p-4 rounded-2xl flex flex-col justify-between gap-3 group relative transition-all duration-200",
        isDirty
          ? "border-amber-500/50 shadow-lg shadow-amber-500/5"
          : "border-stone-800 hover:border-stone-700"
      )}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <input
            value={draft.name}
            onChange={(e) => updateField("name", e.target.value)}
            placeholder="Nombre del material"
            className="bg-transparent text-white font-bold text-lg border-b border-transparent hover:border-stone-700 focus:border-orange-500 focus:outline-none w-full transition-colors"
          />
          <button
            type="button"
            onClick={() => onRemove(draft.id)}
            title="Eliminar material"
            className="text-stone-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-1">
          <div className="space-y-1">
            <label className="text-[11px] uppercase font-bold tracking-widest text-stone-500">
              Unidad
            </label>
            <select
              value={draft.unit}
              onChange={(e) => {
                const val = e.target.value;
                if (isUnit(val)) {
                  updateField("unit", val);
                }
              }}
              className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2 text-xs font-mono text-orange-400 focus:outline-none focus:border-orange-500"
            >
              <option value="m">Metro</option>
              <option value="100pack">Ciento</option>
              <option value="dozen">Docena</option>
              <option value="unit">Unidad</option>
              <option value="spool">Cono</option>
              <option value="service">Servicio</option>
              {!isFabric && <option value="batch">Lote (Batch)</option>}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] uppercase font-bold tracking-widest text-stone-500">
              {draft.unit === "batch" ? "Costo Lote" : "Costo (Bs)"}
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={draft.pricePerUnit}
              onWheel={(e) => e.currentTarget.blur()}
              onChange={(e) =>
                updateField("pricePerUnit", Number(e.target.value))
              }
              className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2 text-xs font-mono text-amber-400 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="space-y-1">
            <label
              className="text-[11px] uppercase font-bold tracking-widest text-stone-500"
              title="Porcentaje de merma"
            >
              Merma (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={draft.wastagePercentage || 0}
              onWheel={(e) => e.currentTarget.blur()}
              onChange={(e) =>
                updateField("wastagePercentage", Number(e.target.value))
              }
              className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2 text-xs font-mono text-red-400 focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>

        {draft.unit === "batch" && !isFabric && (
          <div className="space-y-1 bg-orange-500/10 p-2.5 rounded-lg border border-orange-500/20">
            <label className="text-[10px] uppercase font-bold tracking-widest text-orange-500 block">
              Unidades por Lote / Bloque
            </label>
            <div className="flex gap-2 items-center">
              <span className="text-xs text-stone-400">1 Lote =</span>
              <input
                type="number"
                min="1"
                value={draft.batchSize || 1}
                onWheel={(e) => e.currentTarget.blur()}
                onChange={(e) =>
                  updateField("batchSize", Math.max(1, Number(e.target.value)))
                }
                className="w-20 bg-stone-950 border border-stone-800 rounded-lg p-1.5 text-xs font-mono text-white focus:outline-none text-right"
                placeholder="Ej: 6"
              />
              <span className="text-xs text-stone-400">
                unids. (ej. 1-6 = 1 lote)
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-stone-800/80">
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-[10px] uppercase font-bold tracking-widest text-stone-500">
                Margen Menor (%)
              </label>
              {draft.retailMargin !== undefined && (
                <span className="text-[9px] text-amber-400 font-bold uppercase tracking-wider">
                  Override
                </span>
              )}
            </div>
            <input
              type="number"
              value={draft.retailMargin !== undefined ? draft.retailMargin : ""}
              placeholder={`Heredado (${defaultRetailMargin}%)`}
              onWheel={(e) => e.currentTarget.blur()}
              onChange={(e) => {
                const val = e.target.value.trim();
                updateDraft({
                  retailMargin: val === "" ? undefined : Number(val),
                });
              }}
              className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2 text-xs font-mono text-emerald-400 placeholder:text-stone-600 focus:outline-none focus:border-orange-500 text-right"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-[10px] uppercase font-bold tracking-widest text-stone-500">
                Margen Mayor (%)
              </label>
              {draft.wholesaleMargin !== undefined && (
                <span className="text-[9px] text-amber-400 font-bold uppercase tracking-wider">
                  Override
                </span>
              )}
            </div>
            <input
              type="number"
              value={
                draft.wholesaleMargin !== undefined ? draft.wholesaleMargin : ""
              }
              placeholder={`Heredado (${defaultWholesaleMargin}%)`}
              onWheel={(e) => e.currentTarget.blur()}
              onChange={(e) => {
                const val = e.target.value.trim();
                updateDraft({
                  wholesaleMargin: val === "" ? undefined : Number(val),
                });
              }}
              className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2 text-xs font-mono text-blue-400 placeholder:text-stone-600 focus:outline-none focus:border-orange-500 text-right"
            />
          </div>
        </div>
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
