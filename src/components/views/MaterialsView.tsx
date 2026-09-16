import React, { useState } from "react";
import { Plus } from "lucide-react";
import { GlobalConfig, Material } from "../../types";
import { MaterialCard } from "../materials/MaterialCard";
import { DEFAULT_RETAIL_MARGIN, DEFAULT_WHOLESALE_MARGIN } from "../../utils/calculations";
import { checkMaterialPriceImpact, MarginRiskItem } from "../../utils/marginSentinel";
import { MarginSentinelModal } from "../materials/MarginSentinelModal";

export interface MaterialsViewProps {
  mode?: "all" | "fabrics" | "supplies";
  config: GlobalConfig;
  onChange: (c: GlobalConfig) => void;
  onNotify?: (text: string, type: "success" | "error" | "info") => void;
  onNavigate?: (view: "products" | "materials" | "pricingMatrix" | "dashboard") => void;
}

export function MaterialsView({
  mode = "all",
  config,
  onChange,
  onNotify,
  onNavigate,
}: MaterialsViewProps) {
  const [sentinelRisks, setSentinelRisks] = useState<MarginRiskItem[]>([]);
  const [sentinelMaterialName, setSentinelMaterialName] = useState<string>("");
  const [isSentinelOpen, setIsSentinelOpen] = useState(false);

  const addMaterial = (
    category: "fabric" | "other" | "accessory" = "other"
  ) => {
    const newId = crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2, 9);

    const newMaterial: Material = {
      id: newId,
      name: category === "fabric" ? "Nueva Tela" : "Nuevo Material",
      category,
      unit: category === "fabric" ? "m" : "unit",
      pricePerUnit: 0,
      wastagePercentage: category === "fabric" ? 5 : 0,
    };

    onChange({
      ...config,
      materials: [newMaterial, ...config.materials],
    });

    onNotify?.(
      `Se agregó ${category === "fabric" ? "la tela" : "el insumo"} a la lista`,
      "info"
    );
  };

  const removeMaterial = (id: string) => {
    const target = config.materials.find((m) => m.id === id);
    const newProducts = config.products.map((p) => ({
      ...p,
      ingredients: p.ingredients.filter((i) => i.materialId !== id),
    }));

    onChange({
      ...config,
      products: newProducts,
      materials: config.materials.filter((m) => m.id !== id),
    });

    onNotify?.(`"${target?.name || "Material"}" eliminado`, "info");
  };

  const saveMaterial = (updated: Material) => {
    // 1. Audit cross-catalog margin risks against fixed variant overrides
    const risks = checkMaterialPriceImpact(updated, config);

    // 2. Commit updated material to state
    onChange({
      ...config,
      materials: config.materials.map((m) =>
        m.id === updated.id ? updated : m
      ),
    });

    // 3. Trigger Sentinel alert modal if selling prices fall below safe margins
    if (risks.length > 0) {
      setSentinelRisks(risks);
      setSentinelMaterialName(updated.name);
      setIsSentinelOpen(true);
      const criticalCount = risks.filter((r) => r.severity === "critical").length;
      if (criticalCount > 0) {
        onNotify?.(
          `¡Alerta Sentinel! Se detectaron ${criticalCount} prendas con venta a pérdida`,
          "error"
        );
      }
    }
  };

  const defaultRetail = config.profitMargin || DEFAULT_RETAIL_MARGIN;
  const defaultWholesale = config.wholesaleMargin || DEFAULT_WHOLESALE_MARGIN;

  const fabrics = config.materials.filter((m) => m.category === "fabric");
  const otherMaterials = config.materials.filter((m) => m.category === "other");

  return (
    <div className="space-y-10">
      {/* FABRICS SECTION */}
      {(mode === "all" || mode === "fabrics") && (
        <div className="space-y-6">
          <div className="flex justify-between items-end border-b border-stone-800 pb-4">
            <div>
              <h2 className="text-2xl font-black italic text-white">
                Telas Principales
              </h2>
              <p className="text-stone-400 text-sm mt-1">
                Registra la forma de compra y precio de tus telas. Todos los
                cambios se guardan explícitamente en cada tarjeta.
              </p>
            </div>
            <button
              type="button"
              onClick={() => addMaterial("fabric")}
              className="bg-orange-500/10 text-orange-500 border border-orange-500/30 px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-orange-500/20 font-mono text-xs uppercase tracking-widest font-bold active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-3 h-3" /> Agregar Tela
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {fabrics.map((mat) => (
              <MaterialCard
                key={mat.id}
                material={mat}
                allMaterials={config.materials}
                onSave={saveMaterial}
                onRemove={removeMaterial}
                onNotify={onNotify}
                defaultRetailMargin={defaultRetail}
                defaultWholesaleMargin={defaultWholesale}
              />
            ))}
            {fabrics.length === 0 && (
              <div className="col-span-full text-center py-10 bg-stone-900/30 border border-dashed border-stone-800 rounded-2xl text-stone-500 text-sm">
                No hay telas registradas. Haz clic en "Agregar Tela" para comenzar.
              </div>
            )}
          </div>
        </div>
      )}

      {/* OTHER INGREDIENTS SECTION */}
      {(mode === "all" || mode === "supplies") && (
        <div className="space-y-6">
          <div className="flex justify-between items-end border-b border-stone-800 pb-4">
            <div>
              <h2 className="text-2xl font-black italic text-white">
                Insumos y Materiales Secundarios
              </h2>
              <p className="text-stone-400 text-sm mt-1">
                Hilos, cierres, botones, etiquetas, servicios externos o cobros
                por lote.
              </p>
            </div>
            <button
              type="button"
              onClick={() => addMaterial("other")}
              className="bg-orange-500/10 text-orange-500 border border-orange-500/30 px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-orange-500/20 font-mono text-xs uppercase tracking-widest font-bold active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-3 h-3" /> Agregar Insumo
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {otherMaterials.map((mat) => (
              <MaterialCard
                key={mat.id}
                material={mat}
                allMaterials={config.materials}
                onSave={saveMaterial}
                onRemove={removeMaterial}
                onNotify={onNotify}
                defaultRetailMargin={defaultRetail}
                defaultWholesaleMargin={defaultWholesale}
              />
            ))}
            {otherMaterials.length === 0 && (
              <div className="col-span-full text-center py-10 bg-stone-900/30 border border-dashed border-stone-800 rounded-2xl text-stone-500 text-sm">
                No hay insumos secundarios registrados. Haz clic en "Agregar
                Insumo".
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sentinel Alert Modal */}
      <MarginSentinelModal
        isOpen={isSentinelOpen}
        risks={sentinelRisks}
        materialName={sentinelMaterialName}
        onClose={() => setIsSentinelOpen(false)}
        onViewProducts={
          onNavigate ? () => onNavigate("products") : undefined
        }
      />
    </div>
  );
}
