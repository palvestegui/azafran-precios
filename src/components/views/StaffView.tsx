import React, { useState } from "react";
import { Plus, Trash2, Check, X } from "lucide-react";
import { GlobalConfig, Staff } from "../../types";
import { calculateMonthlyStaff } from "../../utils/calculations";

export interface StaffViewProps {
  config: GlobalConfig;
  onChange: (c: GlobalConfig) => void;
  onNotify?: (text: string, type: "success" | "error" | "info") => void;
}

export function StaffView({ config, onChange, onNotify }: StaffViewProps) {
  const [drafts, setDrafts] = useState<Record<string, Staff>>({});

  const generateId = () => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9);

  const addStaff = () => {
    const newEmployee: Staff = { id: generateId(), name: "", role: "", monthlySalary: 0, count: 1 };
    onChange({ ...config, staff: [newEmployee, ...config.staff] });
    setDrafts({ ...drafts, [newEmployee.id]: newEmployee });
    onNotify?.("Se añadió una fila a la planilla", "info");
  };

  const removeStaff = (id: string) => {
    const target = config.staff.find((p) => p.id === id);
    onChange({ ...config, staff: config.staff.filter((p) => p.id !== id) });
    const newDrafts = { ...drafts };
    delete newDrafts[id];
    setDrafts(newDrafts);
    onNotify?.(`"${target?.name || "Registro"}" eliminado`, "info");
  };

  const handleDraftChange = (id: string, field: keyof Staff, value: any) => {
    const original = config.staff.find((s) => s.id === id);
    const current = drafts[id] || original;
    if (!current) return;
    setDrafts({ ...drafts, [id]: { ...current, [field]: value } });
  };

  const saveRow = (id: string) => {
    const draft = drafts[id];
    if (!draft) return;
    onChange({ ...config, staff: config.staff.map((p) => (p.id === id ? draft : p)) });
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

  const totalMonthly = calculateMonthlyStaff(config.staff);

  return (
    <div className="w-full flex flex-col h-full">
      <div className="flex justify-between items-center mb-4 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Planilla de Sueldos</h2>
          <p className="text-stone-400 text-xs mt-0.5">Gestión de personal y salarios mensuales.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-stone-900 border border-stone-800 px-4 py-2 rounded-lg flex items-center gap-3">
            <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">Total Mensual</span>
            <span className="text-lg font-mono text-red-400 font-bold">Bs {totalMonthly.toFixed(2)}</span>
          </div>
          <button
            onClick={addStaff}
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
              <th className="px-4 py-3 font-mono font-bold text-stone-400 w-24">Cant.</th>
              <th className="px-4 py-3 font-mono font-bold text-stone-400">Nombre / Título</th>
              <th className="px-4 py-3 font-mono font-bold text-stone-400">Cargo / Función</th>
              <th className="px-4 py-3 font-mono font-bold text-stone-400 w-36">Sueldo Unit.</th>
              <th className="px-4 py-3 font-mono font-bold text-stone-400 w-36 text-right">TOTAL MENSUAL (BS)</th>
              <th className="px-4 py-3 font-mono font-bold text-stone-400 w-28 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-800/50 font-mono text-xs">
            {config.staff.map((emp) => {
              const isDirty = !!drafts[emp.id];
              const data = drafts[emp.id] || emp;
              const rowTotal = data.count * data.monthlySalary;

              return (
                <tr key={emp.id} className={isDirty ? "bg-orange-500/5" : "hover:bg-stone-800/20"}>
                  <td className="px-4 py-2 text-stone-400">
                    <input
                      type="number"
                      min="1"
                      className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1.5 focus:border-orange-500 outline-none text-white text-center"
                      value={data.count || ""}
                      onChange={(e) => handleDraftChange(emp.id, "count", parseInt(e.target.value) || 0)}
                      onWheel={(e) => e.currentTarget.blur()}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      placeholder="Nombre..."
                      className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1.5 focus:border-orange-500 outline-none text-white"
                      value={data.name}
                      onChange={(e) => handleDraftChange(emp.id, "name", e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      placeholder="Cargo..."
                      className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1.5 focus:border-orange-500 outline-none text-white"
                      value={data.role}
                      onChange={(e) => handleDraftChange(emp.id, "role", e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-2 text-stone-400 relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none">Bs</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      className="w-full bg-stone-950 border border-stone-800 rounded pl-8 pr-2 py-1.5 focus:border-orange-500 outline-none text-white"
                      value={data.monthlySalary || ""}
                      onChange={(e) => handleDraftChange(emp.id, "monthlySalary", parseFloat(e.target.value) || 0)}
                      onWheel={(e) => e.currentTarget.blur()}
                    />
                  </td>
                  <td className="px-4 py-2 text-right font-bold text-red-400">
                    Bs {rowTotal.toFixed(2)}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-center gap-1">
                      {isDirty ? (
                        <>
                          <button onClick={() => saveRow(emp.id)} className="p-1.5 text-emerald-400 hover:bg-emerald-400/10 rounded transition-colors" title="Guardar">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => discardRow(emp.id)} className="p-1.5 text-stone-400 hover:bg-stone-800 rounded transition-colors" title="Descartar">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <button onClick={() => removeStaff(emp.id)} className="p-1.5 text-stone-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors" title="Eliminar">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {config.staff.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-stone-500">
                  No hay personal registrado en planilla.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
