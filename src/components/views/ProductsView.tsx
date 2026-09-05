import React, { useState } from "react";
import { Plus } from "lucide-react";
import { GlobalConfig, Product, ProductIngredient, Material } from "../../types";
import { ProductCard } from "../products/ProductCard";
import { AccessoryCard } from "../materials/AccessoryCard";

interface ProductsViewProps {
  config: GlobalConfig;
  onChange: (c: GlobalConfig) => void;
}

export function ProductsView({ config, onChange }: ProductsViewProps) {
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
    onChange({
      ...config,
      products: [
        {
          id: generateId(),
          name: "Nuevo Producto",
          ingredients: [],
        },
        ...config.products,
      ],
    });
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    onChange({
      ...config,
      products: config.products.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    });
  };

  const removeProduct = (id: string) => {
    onChange({
      ...config,
      products: config.products.filter((p) => p.id !== id),
    });
  };

  const toggleProduct = (id: string) => {
    setExpandedProducts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const addMaterial = (category: "fabric" | "other" | "accessory") => {
    onChange({
      ...config,
      materials: [
        {
          id: generateId(),
          name: "Nuevo",
          category,
          unit: "m",
          pricePerUnit: 0,
        },
        ...config.materials,
      ],
    });
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

  const addIngredient = (
    productId: string,
    category: "fabric" | "other" | "accessory" = "other"
  ) => {
    const prod = config.products.find((p) => p.id === productId);
    if (!prod) return;

    const available = config.materials.filter((m) => {
      if (category === "fabric") return m.category === "fabric";
      if (category === "other") return m.category === "other";
      return m.category === "accessory";
    });

    if (available.length === 0) {
      alert(
        "Primero registra materiales de esta categoría en la pestaña Materiales"
      );
      return;
    }

    const newIng: ProductIngredient = {
      materialId: available[0].id,
      quantity: 1,
    };

    updateProduct(productId, {
      ingredients: [...prod.ingredients, newIng],
    });
  };

  const updateIngredient = (
    productId: string,
    index: number,
    updates: Partial<ProductIngredient>
  ) => {
    const prod = config.products.find((p) => p.id === productId);
    if (!prod) return;
    const newIngredients = [...prod.ingredients];
    newIngredients[index] = { ...newIngredients[index], ...updates };
    updateProduct(productId, { ingredients: newIngredients });
  };

  const removeIngredient = (productId: string, index: number) => {
    const prod = config.products.find((p) => p.id === productId);
    if (!prod) return;
    const newIngredients = [...prod.ingredients];
    newIngredients.splice(index, 1);
    updateProduct(productId, { ingredients: newIngredients });
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
              className="bg-orange-500 text-black px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-orange-400 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Nuevo Producto
            </button>
          ) : (
            <button
              onClick={() => addMaterial("accessory")}
              className="bg-orange-500 text-black px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-orange-400 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Agregar Accesorio
            </button>
          )}
        </div>

        <div className="flex gap-6 mt-4">
          <button
            onClick={() => setActiveTab("products")}
            className={`px-2 py-2 font-bold uppercase text-sm tracking-widest border-b-2 transition-colors ${
              activeTab === "products"
                ? "border-orange-500 text-orange-500"
                : "border-transparent text-stone-500 hover:text-stone-300"
            }`}
          >
            Productos
          </button>
          <button
            onClick={() => setActiveTab("accessories")}
            className={`px-2 py-2 font-bold uppercase text-sm tracking-widest border-b-2 transition-colors ${
              activeTab === "accessories"
                ? "border-orange-500 text-orange-500"
                : "border-transparent text-stone-500 hover:text-stone-300"
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
              onUpdateProduct={(updates) => updateProduct(prod.id, updates)}
              onRemoveProduct={() => removeProduct(prod.id)}
              onAddIngredient={(cat) => addIngredient(prod.id, cat)}
              onUpdateIngredient={(idx, updates) =>
                updateIngredient(prod.id, idx, updates)
              }
              onRemoveIngredient={(idx) => removeIngredient(prod.id, idx)}
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
