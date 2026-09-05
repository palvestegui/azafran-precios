import React from "react";
import { AlertCircle, Layers, Check, X } from "lucide-react";
import { Product, Material } from "../../types";
import { calculateAccessoryBatchPricing } from "../../utils/calculations";

export interface DashboardControlsProps {
  products: Product[];
  selectedProductId: string;
  onSelectProduct: (productId: string) => void;
  product?: Product;
  materials: Material[];
  activeFabricId: string;
  onSelectFabric: (fabricId: string) => void;
}

export interface AccessoryFilterBarProps {
  availableAccessories: Material[];
  selectedAccessoryIds: string[];
  onToggleAccessory: (accessoryId: string) => void;
}

/**
 * Simulator filter bar and recipe configuration controls for the Master Dashboard.
 */
export function DashboardControls({
  products,
  selectedProductId,
  onSelectProduct,
  product,
  materials,
  activeFabricId,
  onSelectFabric,
}: DashboardControlsProps) {
  const fabricMaterials = materials.filter((m) => m.category === "fabric");
  const filteredFabrics = fabricMaterials.filter((m) => {
    if (!product?.allowedFabricIds || product.allowedFabricIds.length === 0) {
      return true;
    }
    return product.allowedFabricIds.includes(m.id);
  });

  const hasMissingFabricConsumption =
    (!product?.fabricQuantity || product.fabricQuantity <= 0) &&
    activeFabricId !== "";

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs uppercase font-bold text-stone-500 tracking-widest block mb-2">
            Seleccionar Producto
          </label>
          <select
            value={selectedProductId}
            onChange={(e) => onSelectProduct(e.target.value)}
            className="w-full bg-stone-950 border border-stone-800 rounded-lg p-3 text-white font-bold focus:outline-none focus:border-orange-500"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs uppercase font-bold text-emerald-500 tracking-widest block mb-2">
            Simular con Tela:
          </label>
          <select
            value={activeFabricId}
            onChange={(e) => onSelectFabric(e.target.value)}
            className="w-full bg-stone-950 border border-emerald-500/30 rounded-lg p-3 text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
          >
            <option value="">(Sin tela principal)</option>
            {filteredFabrics.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          {hasMissingFabricConsumption && (
            <p className="text-orange-500 text-[10px] mt-2 font-bold uppercase tracking-widest flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Configura el consumo (m/un) en Productos para calcular el costo.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Filter bar pills for toggling available accessories and service batches into the quote.
 */
export function AccessoryFilterBar({
  availableAccessories,
  selectedAccessoryIds,
  onToggleAccessory,
}: AccessoryFilterBarProps) {
  return (
    <div className="space-y-2">
      <span className="text-xs uppercase font-bold text-stone-500 tracking-widest block">
        Seleccionar Accesorios Disponibles:
      </span>
      {availableAccessories.length === 0 ? (
        <p className="text-xs text-stone-500 italic">
          No hay accesorios registrados en el catálogo.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {availableAccessories.map((acc) => {
            const isSelected = selectedAccessoryIds.includes(acc.id);
            const isBatch = acc.unit === "batch";
            return (
              <button
                key={acc.id}
                type="button"
                onClick={() => onToggleAccessory(acc.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                  isSelected
                    ? "bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20"
                    : "bg-stone-950 text-stone-400 border border-stone-800 hover:text-white hover:border-stone-700"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded flex items-center justify-center text-[10px] ${
                    isSelected
                      ? "bg-stone-950 text-amber-400"
                      : "border border-stone-700"
                  }`}
                >
                  {isSelected ? <Check className="w-3 h-3" /> : null}
                </div>
                <span>{acc.name}</span>
                {isBatch && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                      isSelected
                        ? "bg-stone-950/20 text-stone-950"
                        : "bg-amber-500/10 text-amber-400"
                    }`}
                  >
                    Lote ({acc.batchSize || 6}u)
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export interface AccessoryConfigCardProps {
  key?: string;
  accessory: Material;
  quantity: number;
  materials: Material[];
  onUpdateQuantity: (accId: string, quantity: number) => void;
  onRemove: (accId: string) => void;
}

/**
 * Interactive card for configuring individual accessory quantities and reviewing batch costs/margins.
 */
export function AccessoryConfigCard({
  accessory,
  quantity,
  materials,
  onUpdateQuantity,
  onRemove,
}: AccessoryConfigCardProps) {
  const isBatch = accessory.unit === "batch";
  const calc = calculateAccessoryBatchPricing(accessory, quantity, materials);

  return (
    <div className="bg-stone-950 border border-stone-800 p-4 rounded-2xl space-y-3 relative group">
      <button
        type="button"
        onClick={() => onRemove(accessory.id)}
        className="absolute top-3 right-3 text-stone-500 hover:text-red-400 p-1"
        title="Quitar accesorio"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start justify-between pr-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-sm">{accessory.name}</span>
            {isBatch && (
              <span className="bg-amber-500/20 text-amber-300 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                Cobro por Lote
              </span>
            )}
          </div>
          <p className="text-[11px] text-stone-400 mt-0.5">
            {isBatch
              ? `Costo proveedor: Bs ${accessory.pricePerUnit.toFixed(
                  2
                )} por cada bloque de 1 a ${
                  accessory.batchSize || 6
                } unidades`
              : `Costo unitario: Bs ${accessory.pricePerUnit.toFixed(2)}`}
          </p>
        </div>
      </div>

      <div className="bg-stone-900/70 p-3 rounded-xl border border-stone-800 space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-[11px] uppercase font-bold text-stone-400">
            Cantidad en este pedido:
          </label>
          <span className="font-mono text-xs font-bold text-amber-400">
            {quantity} {quantity === 1 ? "unidad" : "unidades"}
          </span>
        </div>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) =>
              onUpdateQuantity(accessory.id, parseInt(e.target.value) || 1)
            }
            className="w-20 bg-stone-950 border border-stone-700 rounded-lg p-1.5 text-amber-400 font-mono font-bold text-center text-xs focus:outline-none focus:border-amber-500"
          />
          <div className="flex flex-wrap gap-1 flex-1">
            {[1, 3, 6, 8, 12, 30].map((presetQty) => (
              <button
                key={presetQty}
                type="button"
                onClick={() => onUpdateQuantity(accessory.id, presetQty)}
                className={`px-2 py-1 rounded text-[11px] font-mono font-bold transition-all ${
                  quantity === presetQty
                    ? "bg-amber-500 text-stone-950"
                    : "bg-stone-950 text-stone-400 border border-stone-800 hover:text-white"
                }`}
              >
                {presetQty}u
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-1.5 text-xs font-mono">
        {isBatch && (
          <div className="flex justify-between text-stone-400">
            <span>Bloques contratados ({accessory.batchSize || 6}u):</span>
            <span className="text-white font-bold">
              {calc.batchesCount}{" "}
              {calc.batchesCount === 1 ? "lote" : "lotes"} (Bs{" "}
              {calc.totalCost.toFixed(2)})
            </span>
          </div>
        )}
        <div className="flex justify-between text-stone-400">
          <span>Costo asignado al accesorio:</span>
          <span className="text-stone-300">
            Bs {calc.unitCost.toFixed(2)} / unidad
          </span>
        </div>
        <div className="flex justify-between text-stone-400 pt-1 border-t border-stone-800/80">
          <span>Precio sugerido (Al detalle):</span>
          <span className="text-amber-400 font-bold">
            Bs {calc.unitRetailPrice.toFixed(2)} / u
          </span>
        </div>
        <div className="flex justify-between text-stone-400">
          <span>Cobro total accesorio ({quantity} u.):</span>
          <span className="text-white font-bold">
            Bs {calc.totalRetailPrice.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between text-stone-400">
          <span>Ganancia neta accesorio:</span>
          <span className="text-emerald-400 font-bold">
            +Bs {calc.retailProfit.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}

