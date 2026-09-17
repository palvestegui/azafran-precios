import React, { useState, useEffect, useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Layers } from "lucide-react";
import { GlobalConfig, Product } from "../../types";
import { calculateProductAnalysis } from "../../utils/calculations";
import { MarginCalculatorCard } from "../dashboard/MarginCalculatorCard";
import { CombinedQuoteCard } from "../dashboard/CombinedQuoteCard";
import {
  DashboardControls,
  AccessoryFilterBar,
  AccessoryConfigCard,
} from "../dashboard/DashboardControls";

export function DashboardView({ config }: { config: GlobalConfig }) {
  const sellableAccessories: Product[] = config.materials
    .filter((m) => m.category === "accessory" && m.isSoldSeparately)
    .map((m) => ({
      id: m.id,
      name: `[Accesorio] ${m.name}`,
      ingredients: [{ materialId: m.id, quantity: 1 }],
      profitMargin: m.retailMargin,
      wholesaleMargin: m.wholesaleMargin,
    }));

  const allProducts = [...config.products, ...sellableAccessories];

  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const product =
    allProducts.find((p) => p.id === selectedProductId) || allProducts[0];
  const activeProductId = product?.id || "";
  const [overrideFabricId, setOverrideFabricId] = useState<string | null>(null);

  useEffect(() => {
    setOverrideFabricId(null);
  }, [activeProductId]);

  const activeFabricId =
    overrideFabricId !== null
      ? overrideFabricId
      : product?.defaultFabricId || "";

  const [customRetailPrice, setCustomRetailPrice] = useState<string>("");
  const [customWholesalePrice, setCustomWholesalePrice] = useState<string>("");

  const [selectedAccessoryIds, setSelectedAccessoryIds] = useState<string[]>([]);
  const [accessoryQuantities, setAccessoryQuantities] = useState<
    Record<string, number>
  >({});

  useEffect(() => {
    setCustomRetailPrice("");
    setCustomWholesalePrice("");
  }, [activeProductId, activeFabricId]);

  const data = useMemo(() => {
    if (!product) return [];
    const analysis = calculateProductAnalysis(
      product,
      config,
      activeFabricId
    );
    return [
      { name: "Materiales", value: analysis.materialCost, color: "#fbbf24" },
      {
        name: "Mano de Obra",
        value: analysis.laborAllocation,
        color: "#f97316",
      },
      {
        name: "Gastos Fijos",
        value: analysis.overheadAllocation,
        color: "#f43f5e",
      },
      {
        name: "Ganancia (Menor)",
        value: analysis.profitPerUnit,
        color: "#3b82f6",
      },
    ];
  }, [product, config, activeFabricId]);

  if (config.products.length === 0) {
    return (
      <div className="text-center text-stone-500 mt-10">
        Aún no hay productos creados. Ve a la pestaña 'Productos' para crear uno.
      </div>
    );
  }

  const analysis = product
    ? calculateProductAnalysis(product, config, activeFabricId)
    : null;

  const activeOverride =
    activeFabricId && product?.variantOverrides
      ? product.variantOverrides[activeFabricId]
      : undefined;

  const effectiveRecommendedPrice =
    activeOverride?.customRetailPrice !== undefined &&
    activeOverride.customRetailPrice > 0
      ? activeOverride.customRetailPrice
      : analysis?.recommendedPrice || 0;

  const effectiveRecommendedWholesalePrice =
    activeOverride?.customWholesalePrice !== undefined &&
    activeOverride.customWholesalePrice > 0
      ? activeOverride.customWholesalePrice
      : analysis?.recommendedWholesalePrice || 0;

  const availableAccessories = config.materials.filter(
    (m) => m.category === "accessory"
  );

  const toggleAccessory = (accId: string) => {
    if (selectedAccessoryIds.includes(accId)) {
      setSelectedAccessoryIds((prev) => prev.filter((id) => id !== accId));
    } else {
      setSelectedAccessoryIds((prev) => [...prev, accId]);
      if (!accessoryQuantities[accId]) {
        const acc = config.materials.find((m) => m.id === accId);
        setAccessoryQuantities((prev) => ({
          ...prev,
          [accId]: acc?.batchSize || 6,
        }));
      }
    }
  };

  const updateAccessoryQuantity = (accId: string, qty: number) => {
    setAccessoryQuantities((prev) => ({
      ...prev,
      [accId]: Math.max(1, qty),
    }));
  };

  return (
    <div className="space-y-5">
      {/* INTEGRATED HEADER & SELECTOR TOOLBAR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-stone-800/80">
        <div>
          <h2 className="text-xl font-black italic tracking-tight text-white">Resumen Master</h2>
          <p className="text-stone-400 text-xs mt-0.5">
            Simula tu precio de venta final cambiando la tela y personalizando con accesorios.
          </p>
        </div>

        <DashboardControls
          products={allProducts}
          selectedProductId={activeProductId}
          onSelectProduct={setSelectedProductId}
          product={product}
          materials={config.materials}
          activeFabricId={activeFabricId}
          onSelectFabric={setOverrideFabricId}
        />
      </div>

      {product && analysis && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 bg-stone-900 border border-stone-800 rounded-xl p-4 sm:p-5">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={105}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={true}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => `Bs ${value.toFixed(2)}`}
                  contentStyle={{
                    backgroundColor: "#0c0a09",
                    borderColor: "#292524",
                    borderRadius: "8px",
                  }}
                  itemStyle={{ color: "#fff" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <MarginCalculatorCard
            customRetailPrice={customRetailPrice}
            setCustomRetailPrice={setCustomRetailPrice}
            customWholesalePrice={customWholesalePrice}
            setCustomWholesalePrice={setCustomWholesalePrice}
            costFloor={analysis.costFloor}
            recommendedPrice={effectiveRecommendedPrice}
            recommendedWholesalePrice={effectiveRecommendedWholesalePrice}
          />

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 w-full mt-4 lg:col-span-2 border-t border-stone-800/80 pt-4">
            {data.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-stone-950 px-3 py-2.5 rounded-xl border border-stone-800/80 shadow-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-bold text-xs text-stone-300 truncate">
                    {item.name}
                  </span>
                </div>
                <span className="font-mono text-xs text-white font-bold shrink-0 ml-2">
                  Bs {item.value.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-stone-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-500" />
              <h3 className="text-base font-black italic text-white">
                Personalizaciones y Accesorios Seleccionados
              </h3>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              Elige solo los accesorios o bordados que deseas cotizar para este
              pedido. Los cobros por lote se calculan escalonados únicamente para
              los accesorios que selecciones.
            </p>
          </div>
        </div>

        <AccessoryFilterBar
          availableAccessories={availableAccessories}
          selectedAccessoryIds={selectedAccessoryIds}
          onToggleAccessory={toggleAccessory}
        />

        {selectedAccessoryIds.length > 0 && (
          <div className="space-y-3 pt-1">
            <h4 className="text-[11px] uppercase font-bold text-amber-400 tracking-wider">
              Detalle de Accesorios en este Pedido:
            </h4>
            <div className="grid grid-cols-1 gap-3 w-full">
              {selectedAccessoryIds.map((accId) => {
                const acc = config.materials.find((m) => m.id === accId);
                if (!acc) return null;
                const qty = accessoryQuantities[accId] || acc.batchSize || 6;
                return (
                  <AccessoryConfigCard
                    key={acc.id}
                    accessory={acc}
                    quantity={qty}
                    materials={config.materials}
                    onUpdateQuantity={updateAccessoryQuantity}
                    onRemove={toggleAccessory}
                  />
                );
              })}
            </div>

            {analysis && (
              <CombinedQuoteCard
                customRetailPrice={customRetailPrice}
                customWholesalePrice={customWholesalePrice}
                recommendedPrice={effectiveRecommendedPrice}
                recommendedWholesalePrice={effectiveRecommendedWholesalePrice}
                costFloor={analysis.costFloor}
                selectedAccessoryIds={selectedAccessoryIds}
                accessoryQuantities={accessoryQuantities}
                materials={config.materials}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
