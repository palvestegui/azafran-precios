import React from "react";
import { AlertTriangle } from "lucide-react";

interface DeleteProductModalProps {
  isOpen: boolean;
  productName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteProductModal({
  isOpen,
  productName,
  onConfirm,
  onCancel,
}: DeleteProductModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#1c1917] border border-stone-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3 text-red-400">
          <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white text-base truncate">
            ¿Eliminar "{productName}"?
          </h3>
        </div>
        <p className="text-stone-300 text-sm leading-relaxed">
          Esta acción eliminará permanentemente la prenda del catálogo de precios, junto con su receta de insumos y configuración de telas.
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
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 transition cursor-pointer shadow-lg shadow-red-950/50"
          >
            Sí, Eliminar Prenda
          </button>
        </div>
      </div>
    </div>
  );
}
