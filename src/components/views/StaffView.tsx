import React from "react";
import { Plus } from "lucide-react";
import { GlobalConfig, Staff } from "../../types";
import { calculateMonthlyStaff } from "../../utils/calculations";
import { StaffCard } from "../staff/StaffCard";

export interface StaffViewProps {
  config: GlobalConfig;
  onChange: (c: GlobalConfig) => void;
  onNotify?: (text: string, type: "success" | "error" | "info") => void;
}

export function StaffView({ config, onChange, onNotify }: StaffViewProps) {
  const generateId = () =>
    crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2, 9);

  const addStaff = () => {
    const newEmployee: Staff = {
      id: generateId(),
      name: "Nuevo Trabajador",
      role: "",
      monthlySalary: 0,
      count: 1,
    };

    onChange({
      ...config,
      staff: [newEmployee, ...config.staff],
    });

    onNotify?.("Se añadió un nuevo puesto a la planilla", "info");
  };

  const removeStaff = (id: string) => {
    const target = config.staff.find((p) => p.id === id);
    onChange({
      ...config,
      staff: config.staff.filter((p) => p.id !== id),
    });
    onNotify?.(`"${target?.name || "Trabajador"}" eliminado`, "info");
  };

  const saveStaff = (updated: Staff) => {
    onChange({
      ...config,
      staff: config.staff.map((p) => (p.id === updated.id ? updated : p)),
    });
  };

  const totalMonthly = calculateMonthlyStaff(config.staff);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-2xl font-black italic text-white">
            Planilla de Sueldos
          </h2>
          <p className="text-stone-400 text-sm mt-1">
            Registra al personal y cuánto se les paga mensualmente. Los cambios
            en sueldos no alteran los costos unitarios hasta que sean confirmados.
          </p>
        </div>
        <div className="bg-stone-900 border border-stone-800 p-4 px-8 rounded-2xl flex flex-col items-center shadow-lg">
          <div className="text-xs uppercase font-bold text-stone-500 tracking-widest text-center">
            Gasto Salarial Mensual Activo
          </div>
          <div className="text-3xl font-mono text-red-400 font-bold mt-1">
            Bs {totalMonthly.toFixed(2)}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={addStaff}
        className="w-full sm:w-auto bg-orange-500/10 text-orange-500 border border-orange-500/30 px-6 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-orange-500/20 font-mono text-xs uppercase tracking-widest font-bold transition-all active:scale-95 cursor-pointer"
      >
        <Plus className="w-4 h-4" /> Añadir Personal
      </button>

      <div className="grid gap-4">
        {config.staff.map((emp) => (
          <StaffCard
            key={emp.id}
            staff={emp}
            onSave={saveStaff}
            onRemove={removeStaff}
            onNotify={onNotify}
          />
        ))}
        {config.staff.length === 0 && (
          <div className="text-center py-12 bg-stone-900/30 border border-dashed border-stone-800 rounded-2xl text-stone-500 text-sm">
            No hay personal registrado en planilla. Haz clic en "Añadir
            Personal".
          </div>
        )}
      </div>
    </div>
  );
}
