import React, { useState, useMemo } from "react";
import { Plus, Trash2, Check, X, Search } from "lucide-react";
import { GlobalConfig, Material, Unit } from "../../types";

export interface AccessoriesViewProps {
  config: GlobalConfig;
  onChange: (c: GlobalConfig) => void;
  onNotify?: (text: string, type: "success" | "error" | "info") => void;
}

const VALID_UNITS: readonly Unit[] = ["unit", "m", "100pack", "dozen", "spool", "service", "batch"];

export function AccessoriesView({ config, onChange, onNotify }: AccessoriesViewProps) {
  const [drafts, setDrafts] = useState<Record<string, Material>>({});
  const [search, setSearch] = useState("");

  const accessories = useMemo(() => config.materials.filter((m) => m.category === "accessory"), [config.materials]);
  
  const filteredAccessories = useMemo(() => {
    if (!search.trim()) return accessories;
    const lower = search.toLowerCase();
    return accessories.filter((a) => a.name.toLowerCase().includes(lower));
  }, [accessories, search]);

  const generateId = () => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9);

  const addAccessory = () => {
    const newAcc: Material = {
      id: generateId(),
      name: "",
      category: "accessory",
      unit: "unit",
      pricePerUnit: 0,
      originType: "bought",
      extraCosts: 0,
      retailMargin: 50,
      wholesaleMargin: 20,
      isSoldSeparately: true,
    };
    onChange({ ...config, materials: [newAcc, ...config.materials] });
    setDrafts({ ...drafts, [newAcc.id]: newAcc });
    onNotify?.("Se agregó un nuevo accesorio", "info");
  };

  const removeAccessory = (id: string) => {
    const target = config.materials.find((p) => p.id === id);
    onChange({ ...config, materials: config.materials.filter((p) => p.id !== id) });
    const newDrafts = { ...drafts };
    delete newDrafts[id];
    setDrafts(newDrafts);
    onNotify?.(`"${target?.name || "Accesorio"}" eliminado`, "info");
  };

  const handleDraftChange = (id: string, field: keyof Material, value: any) => {
    const original = config.materials.find((s) => s.id === id);
    const current = drafts[id] || original;
    if (!current) return;
    setDrafts({ ...drafts, [id]: { ...current, [field]: value } });
  };

  const saveRow = (id: string) => {
    const draft = drafts[id];
    if (!draft) return;
    onChange({ ...config, materials: config.materials.map((p) => (p.id === id ? draft : p)) });
    const newDrafts = { ...drafts };
    delete newDrafts[id];
    setDrafts(newDrafts);
    onNotify?.("Accesorio guardado", "success");
  };

  const discardRow = (id: string) => {
    const newDrafts = { ...drafts };
    delete newDrafts[id];
    setDrafts(newDrafts);
  };

  return (
    <div className="w-full flex flex-col h-full">
      <div className="flex justify-between items-center mb-4 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Accesorios</h2>
          <p className="text-stone-400 text-xs mt-0.5">Gestión de accesorios y complementos vendidos o usados en producción.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
            <input
              type="text"
              placeholder="Buscar accesorio..."
              className="bg-stone-900 border border-stone-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:border-orange-500 outline-none w-64"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={addAccessory}
            className="bg-orange-500 text-black px-4 py-2 rounded-lg font-mono text-xs uppercase tracking-wider font-bold hover:bg-orange-400 transition-colors flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" /> Nuevo Accesorio
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-stone-900/50 border border-stone-800 rounded-xl relative">
        <table className="w-full text-left text-sm text-stone-300">
          <thead className="text-[10px] uppercase bg-stone-900/80 sticky top-0 z-10 shadow-sm border-b border-stone-800">
            <tr>
              <th className="px-3 py-3 font-mono font-bold text-stone-400">Accesorio</th>
              <th className="px-3 py-3 font-mono font-bold text-stone-400 w-28">Tipo</th>
              <th className="px-3 py-3 font-mono font-bold text-stone-400 w-28">Unidad</th>
              <th className="px-3 py-3 font-mono font-bold text-stone-400 w-28">Costo Compra</th>
              <th className="px-3 py-3 font-mono font-bold text-stone-400 w-28">Extra Logística</th>
              <th className="px-3 py-3 font-mono font-bold text-orange-400 w-28 text-right">Costo Real</th>
              <th className="px-3 py-3 font-mono font-bold text-stone-400 w-24">Margen Menor %</th>
              <th className="px-3 py-3 font-mono font-bold text-stone-400 w-24">Margen Mayor %</th>
              <th className="px-3 py-3 font-mono font-bold text-stone-400 w-24 text-center">Venta Separada</th>
              <th className="px-3 py-3 font-mono font-bold text-stone-400 w-24 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-800/50 font-mono text-xs">
            {filteredAccessories.map((acc) => {
              const isDirty = !!drafts[acc.id];
              const data = drafts[acc.id] || acc;
              const costoReal = (data.pricePerUnit || 0) + (data.extraCosts || 0);

              return (
                <tr key={acc.id} className={isDirty ? "bg-orange-500/5" : "hover:bg-stone-800/20"}>
                  <td className="px-3 py-1.5">
                    <input
                      type="text"
                      placeholder="Nombre..."
                      className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 focus:border-orange-500 outline-none text-white"
                      value={data.name}
                      onChange={(e) => handleDraftChange(acc.id, "name", e.target.value)}
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <select
                      className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 focus:border-orange-500 outline-none text-white"
                      value={data.originType || "bought"}
                      onChange={(e) => handleDraftChange(acc.id, "originType", e.target.value)}
                    >
                      <option value="bought">Comprado</option>
                      <option value="manufactured">Fabricado</option>
                    </select>
                  </td>
                  <td className="px-3 py-1.5">
                    <select
                      className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 focus:border-orange-500 outline-none text-white"
                      value={data.unit}
                      onChange={(e) => handleDraftChange(acc.id, "unit", e.target.value as Unit)}
                    >
                      {VALID_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-1.5 relative">
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      className="w-full bg-stone-950 border border-stone-800 rounded pl-2 pr-2 py-1 focus:border-orange-500 outline-none text-white"
                      value={data.pricePerUnit === 0 ? "" : data.pricePerUnit}
                      onChange={(e) => handleDraftChange(acc.id, "pricePerUnit", parseFloat(e.target.value) || 0)}
                      onWheel={(e) => e.currentTarget.blur()}
                    />
                  </td>
                  <td className="px-3 py-1.5 relative">
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      className="w-full bg-stone-950 border border-stone-800 rounded pl-2 pr-2 py-1 focus:border-orange-500 outline-none text-white"
                      value={data.extraCosts === 0 ? "" : data.extraCosts}
                      onChange={(e) => handleDraftChange(acc.id, "extraCosts", parseFloat(e.target.value) || 0)}
                      onWheel={(e) => e.currentTarget.blur()}
                    />
                  </td>
                  <td className="px-3 py-1.5 text-right font-bold text-orange-400">
                    Bs {costoReal.toFixed(2)}
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 focus:border-orange-500 outline-none text-white"
                      value={data.retailMargin ?? ""}
                      onChange={(e) => handleDraftChange(acc.id, "retailMargin", parseFloat(e.target.value) || 0)}
                      onWheel={(e) => e.currentTarget.blur()}
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 focus:border-orange-500 outline-none text-white"
                      value={data.wholesaleMargin ?? ""}
                      onChange={(e) => handleDraftChange(acc.id, "wholesaleMargin", parseFloat(e.target.value) || 0)}
                      onWheel={(e) => e.currentTarget.blur()}
                    />
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    <input
                      type="checkbox"
                      className="accent-orange-500 w-4 h-4 cursor-pointer"
                      checked={!!data.isSoldSeparately}
                      onChange={(e) => handleDraftChange(acc.id, "isSoldSeparately", e.target.checked)}
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <div className="flex items-center justify-center gap-1">
                      {isDirty ? (
                        <>
                          <button onClick={() => saveRow(acc.id)} className="p-1.5 text-emerald-400 hover:bg-emerald-400/10 rounded transition-colors" title="Guardar">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => discardRow(acc.id)} className="p-1.5 text-stone-400 hover:bg-stone-800 rounded transition-colors" title="Descartar">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <button onClick={() => removeAccessory(acc.id)} className="p-1.5 text-stone-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors" title="Eliminar">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredAccessories.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-stone-500">
                  No hay accesorios registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
