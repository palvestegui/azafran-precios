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
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black italic">Resumen Master</h2>
          <p className="text-stone-400 text-sm mt-1">
            Simula tu precio de venta final cambiando la tela y personalizando con
            accesorios seleccionados.
          </p>
        </div>
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

      {product && analysis && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-stone-900 border border-stone-800 rounded-3xl p-6">
          <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={140}
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
              recommendedPrice={analysis.recommendedPrice}
              recommendedWholesalePrice={analysis.recommendedWholesalePrice}
            />

            <div className="space-y-4 max-w-sm mx-auto w-full mt-4 lg:col-span-2">
              {data.map((item, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center bg-stone-950 p-3 rounded-xl border border-stone-800"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="font-bold text-sm text-stone-300">
                      {item.name}
                    </span>
                  </div>
                  <span className="font-mono text-white font-bold">
                    Bs {item.value.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-stone-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-500" />
              <h3 className="text-lg font-black italic text-white">
                Personalizaciones y Accesorios Seleccionados
              </h3>
            </div>
            <p className="text-xs text-stone-400 mt-1">
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
          <div className="space-y-4 pt-2">
            <h4 className="text-xs uppercase font-bold text-amber-400 tracking-wider">
              Detalle de Accesorios en este Pedido:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                recommendedPrice={analysis.recommendedPrice}
                recommendedWholesalePrice={analysis.recommendedWholesalePrice}
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
