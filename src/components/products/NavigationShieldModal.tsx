import React from "react";
import { AlertCircle } from "lucide-react";

interface NavigationShieldModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function NavigationShieldModal({
  isOpen,
  onConfirm,
  onCancel,
}: NavigationShieldModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1c1917] border border-stone-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
        <div className="flex items-center gap-3 text-amber-400">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <h3 className="font-bold text-white text-base">Cambios sin guardar</h3>
        </div>
        <p className="text-stone-300 text-sm">
          Tienes cambios sin guardar en la prenda activa. ¿Deseas descartarlos para continuar?
        </p>
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-bold text-stone-400 hover:text-white bg-stone-900 border border-stone-800 transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl text-xs font-bold text-stone-950 bg-amber-400 hover:bg-amber-300 transition cursor-pointer"
          >
            Descartar y continuar
          </button>
        </div>
      </div>
    </div>
  );
}
