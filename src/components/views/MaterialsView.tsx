import React, { useState } from "react";
import { Plus, Trash2, Check, X } from "lucide-react";
import { GlobalConfig, Material, Unit } from "../../types";
import { cn } from "../../lib/utils";
import {
  DEFAULT_RETAIL_MARGIN,
  DEFAULT_WHOLESALE_MARGIN,
  convertUnitCost,
} from "../../utils/calculations";
import { isUnit } from "../../utils/validation";
import {
  checkMaterialPriceImpact,
  MarginRiskItem,
} from "../../utils/marginSentinel";
import { MarginSentinelModal } from "../materials/MarginSentinelModal";

export interface MaterialsViewProps {
  config: GlobalConfig;
  onChange: (c: GlobalConfig) => void;
  onNotify?: (text: string, type: "success" | "error" | "info") => void;
  onNavigate?: (
    view: "products" | "materials" | "pricingMatrix" | "dashboard"
  ) => void;
  // Allows the view to be controlled either via prop or via internal toggle
  mode?: "all" | "fabrics" | "supplies";
}

export function MaterialsView({
  config,
  onChange,
  onNotify,
  onNavigate,
  mode = "all",
}: MaterialsViewProps) {
  const [sentinelRisks, setSentinelRisks] = useState<MarginRiskItem[]>([]);
  const [sentinelMaterialName, setSentinelMaterialName] = useState<string>("");
  const [isSentinelOpen, setIsSentinelOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState<string>("");

  const [draftSupplyRows, setDraftSupplyRows] = useState<Record<string, Partial<Material>>>({});
  const [draftFabricRows, setDraftFabricRows] = useState<Record<string, Partial<Material>>>({});

  const addMaterial = (category: "fabric" | "other") => {
    const newId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9);
    const newMaterial: Material = {
      id: newId,
      name: category === "fabric" ? "Nueva Tela" : "Nuevo Insumo",
      category,
      unit: category === "fabric" ? "m" : "unit",
      pricePerUnit: 0,
      wastagePercentage: category === "fabric" ? 3 : 0,
    };
    onChange({ ...config, materials: [newMaterial, ...config.materials] });
    onNotify?.(`Se agregó ${category === "fabric" ? "la tela" : "el insumo"} a la lista`, "info");
  };

  const removeMaterial = (id: string) => {
    const target = config.materials.find((m) => m.id === id);
    const newProducts = config.products.map((p) => ({
      ...p,
      ingredients: p.ingredients.filter((i) => i.materialId !== id),
    }));
    onChange({ ...config, products: newProducts, materials: config.materials.filter((m) => m.id !== id) });
    setDraftFabricRows((prev) => { if (!prev[id]) return prev; const next = { ...prev }; delete next[id]; return next; });
    setDraftSupplyRows((prev) => { if (!prev[id]) return prev; const next = { ...prev }; delete next[id]; return next; });
    onNotify?.(`"${target?.name || "Material"}" eliminado`, "info");
  };

  const saveMaterial = (updated: Material) => {
    const risks = checkMaterialPriceImpact(updated, config);
    onChange({ ...config, materials: config.materials.map((m) => (m.id === updated.id ? updated : m)) });
    if (risks.length > 0) {
      setSentinelRisks(risks);
      setSentinelMaterialName(updated.name);
      setIsSentinelOpen(true);
      const criticalCount = risks.filter((r) => r.severity === "critical").length;
      if (criticalCount > 0) {
        onNotify?.(`¡Alerta Sentinel! Se detectaron ${criticalCount} prendas con venta a pérdida`, "error");
      }
    }
  };

  const updateFabricField = <K extends keyof Material>(id: string, field: K, value: Material[K]) => {
    const original = config.materials.find((m) => m.id === id);
    if (!original) return;
    setDraftFabricRows((prev) => ({ ...prev, [id]: { ...(prev[id] || original), [field]: value } }));
  };

  const handleSaveFabricRow = (id: string) => {
    const draft = draftFabricRows[id];
    const original = config.materials.find((m) => m.id === id);
    if (!draft || !original) return;
    const updated: Material = { ...original, ...draft };
    saveMaterial(updated);
    setDraftFabricRows((prev) => { const next = { ...prev }; delete next[id]; return next; });
    onNotify?.(`"${updated.name}" guardada`, "success");
  };

  const handleCancelFabricRow = (id: string) => {
    setDraftFabricRows((prev) => { const next = { ...prev }; delete next[id]; return next; });
  };

  const updateSupplyField = <K extends keyof Material>(id: string, field: K, value: Material[K]) => {
    const original = config.materials.find((m) => m.id === id);
    if (!original) return;
    setDraftSupplyRows((prev) => ({ ...prev, [id]: { ...(prev[id] || original), [field]: value } }));
  };

  const handleSaveSupplyRow = (id: string) => {
    const draft = draftSupplyRows[id];
    const original = config.materials.find((m) => m.id === id);
    if (!draft || !original) return;
    const updated: Material = { ...original, ...draft };
    saveMaterial(updated);
    setDraftSupplyRows((prev) => { const next = { ...prev }; delete next[id]; return next; });
    onNotify?.(`"${updated.name}" guardado`, "success");
  };

  const handleCancelSupplyRow = (id: string) => {
    setDraftSupplyRows((prev) => { const next = { ...prev }; delete next[id]; return next; });
  };

  const defaultRetail = config.profitMargin || DEFAULT_RETAIL_MARGIN;
  const defaultWholesale = config.wholesaleMargin || DEFAULT_WHOLESALE_MARGIN;

  const fabrics = config.materials
    .filter((m) => m.category === "fabric")
    .filter((m) =>
      searchFilter.trim() === ""
        ? true
        : m.name.toLowerCase().includes(searchFilter.toLowerCase())
    );

  const supplies = config.materials
    .filter((m) => m.category === "other")
    .filter((m) =>
      searchFilter.trim() === ""
        ? true
        : m.name.toLowerCase().includes(searchFilter.toLowerCase())
    );

  const showFabrics = mode === "all" || mode === "fabrics";
  const showSupplies = mode === "all" || mode === "supplies";

  return (
    <div className="space-y-8">
      {/* 1. TELAS COMMAND TABLE (When mode is 'all' or 'fabrics') */}
      {showFabrics && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 border-b border-stone-800 pb-4">
            <div>
              <h2 className="text-2xl font-black italic text-white">
                Telas Principales
              </h2>
              <p className="text-stone-400 text-sm mt-1">
                Catálogo maestro de telas, costos por metro y márgenes proyectados.
              </p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Buscar tela..."
                className="bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-stone-500 focus:outline-none focus:border-orange-500 w-full sm:w-48"
              />
              <button
                type="button"
                onClick={() => addMaterial("fabric")}
                className="bg-orange-500 text-black px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-orange-400 font-mono text-xs uppercase tracking-widest font-bold active:scale-95 transition-all cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar Tela
              </button>
            </div>
          </div>

          <div className="w-full bg-stone-900/60 rounded-xl border border-stone-800/80 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-stone-800 bg-stone-950/80 text-[11px] font-mono uppercase tracking-wider text-stone-400">
                    <th className="py-3 px-4">Tela</th>
                    <th className="py-3 px-3 w-28">Unidad</th>
                    <th className="py-3 px-3 w-32">Costo / Metro (Bs)</th>
                    <th className="py-3 px-3 w-28">Extra Logística</th>
                    <th className="py-3 px-3 w-24">Merma (%)</th>
                    <th className="py-3 px-4 w-44">Costo Real / Metro</th>
                    <th className="py-3 px-3 w-32">Margen</th>
                    <th className="py-3 px-3 w-16 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60">
                  {fabrics.map((mat) => {
                    const isDirty = Boolean(draftFabricRows[mat.id]);
                    const current = draftFabricRows[mat.id] ? { ...mat, ...draftFabricRows[mat.id] } : mat;
                    const baseMetroCost = (Number(current.pricePerUnit) || 0) + (Number(current.extraCosts) || 0);
                    const realMetroCost = baseMetroCost * (1 + (Number(current.wastagePercentage) || 0) / 100);
                    return (
                      <tr key={mat.id} className={cn("transition-colors group", isDirty ? "bg-amber-500/5 hover:bg-amber-500/10" : "hover:bg-stone-800/30")}>
                        <td className="py-2.5 px-4">
                          <input
                            type="text"
                            value={current.name}
                            onChange={(e) => updateFabricField(mat.id, "name", e.target.value)}
                            className="bg-transparent text-white font-bold text-sm w-full border-b border-transparent hover:border-stone-700 focus:border-orange-500 focus:outline-none"
                          />
                        </td>
                        <td className="py-2.5 px-3 font-mono text-xs text-stone-400">Metro</td>
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            step="0.5"
                            value={current.pricePerUnit === 0 && !draftFabricRows[mat.id] ? 0 : current.pricePerUnit ?? ""}
                            onWheel={(e) => e.currentTarget.blur()}
                            onChange={(e) => updateFabricField(mat.id, "pricePerUnit", e.target.value === "" ? 0 : Number(e.target.value))}
                            className="w-full bg-stone-950 border border-stone-800 rounded-lg p-1.5 text-xs font-mono text-amber-400 text-right focus:outline-none focus:border-orange-500"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={current.extraCosts ?? ""}
                            placeholder="0.00"
                            onWheel={(e) => e.currentTarget.blur()}
                            onChange={(e) => {
                              const val = e.target.value.trim();
                              updateFabricField(mat.id, "extraCosts", val === "" ? 0 : Number(val));
                            }}
                            className="w-full bg-stone-950 border border-stone-800 rounded-lg p-1.5 text-xs font-mono text-stone-300 focus:outline-none focus:border-orange-500 text-right"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            step="0.5"
                            value={current.wastagePercentage ?? ""}
                            onWheel={(e) => e.currentTarget.blur()}
                            onChange={(e) => updateFabricField(mat.id, "wastagePercentage", e.target.value === "" ? 0 : Number(e.target.value))}
                            className="w-full bg-stone-950 border border-stone-800 rounded-lg p-1.5 text-xs font-mono text-red-400 text-right focus:outline-none focus:border-orange-500"
                          />
                        </td>
                        <td className="py-2.5 px-4 font-mono">
                          <span className="text-sm font-bold text-amber-400">
                            Bs {realMetroCost.toFixed(2)} / m
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[10px] text-stone-400">
                          {current.retailMargin ? `${current.retailMargin}% / ${current.wholesaleMargin}%` : `Global (${defaultRetail}/${defaultWholesale})`}
                        </td>
                        <td className="py-2.5 px-3 w-16 text-center">
                          {isDirty ? (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleSaveFabricRow(mat.id)}
                                className="p-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg transition-colors cursor-pointer"
                                title="Confirmar cambios"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCancelFabricRow(mat.id)}
                                className="p-1 text-stone-400 hover:text-white hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
                                title="Descartar cambios"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => removeMaterial(mat.id)}
                              className="p-1 text-stone-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. INSUMOS COMMAND TABLE (When mode is 'all' or 'supplies') */}
      {showSupplies && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 border-b border-stone-800 pb-4">
            <div>
              <h2 className="text-2xl font-black italic text-white">
                Insumos y Materiales Secundarios
              </h2>
              <p className="text-stone-400 text-sm mt-1">
                Hilos, cierres, botones, elásticos y servicios con costo atómico unitario.
              </p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Buscar insumo..."
                className="bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-stone-500 focus:outline-none focus:border-orange-500 w-full sm:w-48"
              />
              <button
                type="button"
                onClick={() => addMaterial("other")}
                className="bg-orange-500 text-black px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-orange-400 font-mono text-xs uppercase tracking-widest font-bold active:scale-95 transition-all cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar Insumo
              </button>
            </div>
          </div>

          <div className="w-full bg-stone-900/60 rounded-xl border border-stone-800/80 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-stone-800 bg-stone-950/80 text-[11px] font-mono uppercase tracking-wider text-stone-400">
                    <th className="py-3 px-4">Insumo</th>
                    <th className="py-3 px-3 w-36">Presentación / Unidad</th>
                    <th className="py-3 px-3 w-32">Costo Compra (Bs)</th>
                    <th className="py-3 px-3 w-28">Extra Logística</th>
                    <th className="py-3 px-3 w-24">Merma (%)</th>
                    <th className="py-3 px-4 w-44">Costo Efectivo / Unidad</th>
                    <th className="py-3 px-3 w-32">Margen</th>
                    <th className="py-3 px-3 w-16 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60">
                  {supplies.map((mat) => {
                    const isDirty = Boolean(draftSupplyRows[mat.id]);
                    const current = draftSupplyRows[mat.id] ? { ...mat, ...draftSupplyRows[mat.id] } : mat;
                    const totalUnitBase = (Number(current.pricePerUnit) || 0) + (Number(current.extraCosts) || 0);
                    const baseUnitCost = convertUnitCost(totalUnitBase, current.unit, current.batchSize);
                    const effectiveUnitCost = baseUnitCost * (1 + (Number(current.wastagePercentage) || 0) / 100);

                    return (
                      <tr key={mat.id} className={cn("transition-colors group", isDirty ? "bg-amber-500/5 hover:bg-amber-500/10" : "hover:bg-stone-800/30")}>
                        <td className="py-2.5 px-4">
                          <input
                            type="text"
                            value={current.name}
                            onChange={(e) => updateSupplyField(mat.id, "name", e.target.value)}
                            className="bg-transparent text-white font-bold text-sm w-full border-b border-transparent hover:border-stone-700 focus:border-orange-500 focus:outline-none"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <select
                            value={current.unit}
                            onChange={(e) => isUnit(e.target.value) && updateSupplyField(mat.id, "unit", e.target.value as Unit)}
                            className="w-full bg-stone-950 border border-stone-800 rounded-lg p-1.5 text-xs font-mono text-orange-400 focus:outline-none"
                          >
                            <option value="unit">Unidad</option>
                            <option value="100pack">Ciento (100u)</option>
                            <option value="dozen">Docena (12u)</option>
                            <option value="spool">Cono</option>
                            <option value="m">Metro</option>
                            <option value="pie">Pie</option>
                            <option value="service">Servicio</option>
                            <option value="batch">Lote / Bloque</option>
                          </select>
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            step="0.01"
                            value={current.pricePerUnit === 0 && !draftSupplyRows[mat.id] ? 0 : current.pricePerUnit ?? ""}
                            onWheel={(e) => e.currentTarget.blur()}
                            onChange={(e) => updateSupplyField(mat.id, "pricePerUnit", e.target.value === "" ? 0 : Number(e.target.value))}
                            className="w-full bg-stone-950 border border-stone-800 rounded-lg p-1.5 text-xs font-mono text-amber-400 text-right focus:outline-none"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={current.extraCosts ?? ""}
                            placeholder="0.00"
                            onWheel={(e) => e.currentTarget.blur()}
                            onChange={(e) => {
                              const val = e.target.value.trim();
                              updateSupplyField(mat.id, "extraCosts", val === "" ? 0 : Number(val));
                            }}
                            className="w-full bg-stone-950 border border-stone-800 rounded-lg p-1.5 text-xs font-mono text-stone-300 focus:outline-none focus:border-orange-500 text-right"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            step="0.5"
                            value={current.wastagePercentage ?? ""}
                            onWheel={(e) => e.currentTarget.blur()}
                            onChange={(e) => updateSupplyField(mat.id, "wastagePercentage", e.target.value === "" ? 0 : Number(e.target.value))}
                            className="w-full bg-stone-950 border border-stone-800 rounded-lg p-1.5 text-xs font-mono text-red-400 text-right focus:outline-none"
                          />
                        </td>
                        <td className="py-2.5 px-4 font-mono font-bold text-amber-400 text-sm">
                          Bs {effectiveUnitCost.toFixed(3)}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[10px] text-stone-400">
                          {current.retailMargin ? `${current.retailMargin}% / ${current.wholesaleMargin}%` : `Global (${defaultRetail}/${defaultWholesale})`}
                        </td>
                        <td className="py-2.5 px-3 w-16 text-center">
                          {isDirty ? (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleSaveSupplyRow(mat.id)}
                                className="p-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg transition-colors cursor-pointer"
                                title="Confirmar cambios"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCancelSupplyRow(mat.id)}
                                className="p-1 text-stone-400 hover:text-white hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
                                title="Descartar cambios"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => removeMaterial(mat.id)}
                              className="p-1 text-stone-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Cross-Catalog Margin Sentinel Modal */}
      <MarginSentinelModal
        isOpen={isSentinelOpen}
        risks={sentinelRisks}
        materialName={sentinelMaterialName}
        onClose={() => setIsSentinelOpen(false)}
        onViewProducts={onNavigate ? () => onNavigate("products") : undefined}
      />
    </div>
  );
}