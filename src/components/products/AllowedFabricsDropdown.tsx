import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "../../lib/utils";

export interface FabricOption {
  id: string;
  name: string;
}

interface AllowedFabricsDropdownProps {
  allowedFabrics: string[];
  allFabrics: (string | FabricOption)[];
  baseFabric: string;
  onChange: (newAllowed: string[]) => void;
}

export function AllowedFabricsDropdown({
  allowedFabrics,
  allFabrics,
  baseFabric,
  onChange,
}: AllowedFabricsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const normalizedFabrics: FabricOption[] = allFabrics.map((f) =>
    typeof f === "string" ? { id: f, name: f } : f
  );

  const toggleFabric = (fabricId: string) => {
    if (fabricId === baseFabric) return;
    onChange(
      allowedFabrics.includes(fabricId)
        ? allowedFabrics.filter((id) => id !== fabricId)
        : [...allowedFabrics, fabricId]
    );
  };

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="bg-stone-950/90 border border-stone-800/80 px-3 py-1.5 rounded-xl font-bold text-xs text-amber-400 hover:border-stone-700 flex items-center justify-between gap-2 cursor-pointer transition-colors"
      >
        <span>Telas Permitidas: ({allowedFabrics.length} activas)</span>
        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1 left-0 z-50 w-64 bg-stone-900/98 border border-stone-800 rounded-xl shadow-2xl p-2.5 max-h-80 overflow-y-auto backdrop-blur-xl">
          <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-stone-800 text-[11px] font-mono">
            <button
              type="button"
              onClick={() => onChange(normalizedFabrics.map((f) => f.id))}
              className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white transition-colors cursor-pointer"
            >
              Todas
            </button>
            <button
              type="button"
              onClick={() => onChange(baseFabric ? [baseFabric] : [])}
              className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white transition-colors cursor-pointer"
            >
              Ninguna
            </button>
          </div>
          <div className="flex flex-col gap-1">
            {normalizedFabrics.map((fabric) => {
              const isChecked = allowedFabrics.includes(fabric.id);
              const isBase = fabric.id === baseFabric;
              return (
                <label
                  key={fabric.id}
                  onClick={() => toggleFabric(fabric.id)}
                  className={cn(
                    "flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs cursor-pointer select-none transition-colors",
                    isBase ? "text-amber-400 font-semibold" : "text-stone-300 hover:bg-stone-800/60"
                  )}
                >
                  <div
                    className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center text-[10px] shrink-0 transition-colors",
                      isChecked ? "bg-amber-500 border-amber-500 text-stone-950 font-black" : "border-stone-700 bg-stone-950 text-transparent"
                    )}
                  >
                    {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span className="truncate flex-1">{fabric.name}</span>
                  {isBase && (
                    <span className="text-[9px] uppercase font-mono px-1 py-0.5 rounded bg-amber-500/10 text-amber-500/80 border border-amber-500/20">
                      Base
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
