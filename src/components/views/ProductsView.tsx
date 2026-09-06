import { useState } from "react";
import { Plus } from "lucide-react";
import { GlobalConfig, Product, Material } from "../../types";
import { ProductCard } from "../products/ProductCard";
import { AccessoryCard } from "../materials/AccessoryCard";

interface ProductsViewProps {
  config: GlobalConfig;
  onChange: (c: GlobalConfig) => void;
  onNotify?: (text: string, type: "success" | "error") => void;
}

export function ProductsView({ config, onChange, onNotify }: ProductsViewProps) {
  const [activeTab, setActiveTab] = useState<"products" | "accessories">(
    "products"
  );
  const [expandedProducts, setExpandedProducts] = useState<
    Record<string, boolean>
  >({});

  const generateId = () =>
    crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2, 9);

  const addProduct = () => {
    const newProduct: Product = {
      id: generateId(),
      name: "Nuevo Producto",
      ingredients: [],
      productionWeight: 1.0,
    };
    onChange({
      ...config,
      products: [newProduct, ...config.products],
    });
    setExpandedProducts((prev) => ({ ...prev, [newProduct.id]: true }));
    onNotify?.("Nuevo producto creado", "success");
  };

  const saveProduct = (savedProduct: Product) => {
    onChange({
      ...config,
      products: config.products.map((p) =>
        p.id === savedProduct.id ? savedProduct : p
      ),
    });
  };

  const removeProduct = (id: string) => {
    const target = config.products.find((p) => p.id === id);
    onChange({
      ...config,
      products: config.products.filter((p) => p.id !== id),
    });
    onNotify?.(
      `Producto "${target?.name || "eliminado"}" eliminado del catálogo`,
      "success"
    );
  };

  const toggleProduct = (id: string) => {
    setExpandedProducts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const updateMaterial = (id: string, updates: Partial<Material>) => {
    onChange({
      ...config,
      materials: config.materials.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
    });
  };

  const removeMaterial = (id: string) => {
    onChange({
      ...config,
      materials: config.materials.filter((m) => m.id !== id),
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col space-y-4 border-b border-stone-800 pb-4">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-black italic text-white">
              Catálogo de Productos
            </h2>
            <p className="text-stone-400 mt-2 max-w-2xl text-sm">
              Diseña tus recetas de confección y administra accesorios.
            </p>
          </div>
          {activeTab === "products" ? (
            <button
              onClick={addProduct}
              className="bg-orange-500 text-black px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-orange-400 transition-all flex items-center gap-2 shadow-lg shadow-orange-500/10 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Nuevo Producto
            </button>
          ) : (
            <button
              onClick={() => {
                const newMat: Material = {
                  id: generateId(),
                  name: "Nuevo Accesorio",
                  category: "accessory",
                  unit: "unit",
                  pricePerUnit: 0,
                };
                onChange({
                  ...config,
                  materials: [newMat, ...config.materials],
                });
                onNotify?.("Nuevo accesorio añadido", "success");
              }}
              className="bg-orange-500 text-black px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-orange-400 transition-all flex items-center gap-2 shadow-lg shadow-orange-500/10 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Nuevo Accesorio
            </button>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("products")}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === "products"
                ? "bg-stone-800 text-white shadow-sm border border-stone-700"
                : "text-stone-500 hover:text-stone-300"
            }`}
          >
            Prendas Confección
          </button>
          <button
            onClick={() => setActiveTab("accessories")}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === "accessories"
                ? "bg-stone-800 text-white shadow-sm border border-stone-700"
                : "text-stone-500 hover:text-stone-300"
            }`}
          >
            Accesorios
          </button>
        </div>
      </div>

      {activeTab === "products" && (
        <div className="space-y-6">
          {config.products.map((prod) => (
            <ProductCard
              key={prod.id}
              prod={prod}
              config={config}
              isExpanded={!!expandedProducts[prod.id]}
              onToggleExpand={() => toggleProduct(prod.id)}
              onSaveProduct={saveProduct}
              onRemoveProduct={() => removeProduct(prod.id)}
              onNotify={onNotify}
            />
          ))}
        </div>
      )}

      {activeTab === "accessories" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in duration-300">
          {config.materials
            .filter((m) => m.category === "accessory")
            .map((mat) => (
              <AccessoryCard
                key={mat.id}
                mat={mat}
                materials={config.materials}
                updateMaterial={updateMaterial}
                removeMaterial={removeMaterial}
              />
            ))}
        </div>
      )}
    </div>
  );
}
