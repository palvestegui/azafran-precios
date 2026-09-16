import React, { useState, useMemo, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { GlobalConfig, Product } from "../../types";
import { cn } from "../../lib/utils";
import { NavigationShieldModal } from "../products/NavigationShieldModal";
import { ProductIngredientsTable } from "../products/ProductIngredientsTable";
import { ProductProjectedPrices } from "../products/ProductProjectedPrices";

interface ProductsViewProps {
  config: GlobalConfig;
  onChange: (c: GlobalConfig) => void;
  onNotify?: (text: string, type: "success" | "error" | "info") => void;
}

export function ProductsView({ config, onChange, onNotify }: ProductsViewProps) {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    config.products.length > 0 ? config.products[0].id : null
  );

  const selectedProduct = useMemo(
    () => config.products.find((p) => p.id === selectedProductId) || null,
    [config.products, selectedProductId]
  );

  const [draftProduct, setDraftProduct] = useState<Product | null>(() => {
    const initial = config.products.length > 0 ? config.products[0] : null;
    return initial ? JSON.parse(JSON.stringify(initial)) : null;
  });

  const [pendingProductId, setPendingProductId] = useState<string | null>(null);

  // Sync draft whenever selectedProductId changes
  useEffect(() => {
    if (selectedProduct) {
      setDraftProduct(JSON.parse(JSON.stringify(selectedProduct)));
    } else if (config.products.length > 0) {
      setSelectedProductId(config.products[0].id);
      setDraftProduct(JSON.parse(JSON.stringify(config.products[0])));
    } else {
      setDraftProduct(null);
    }
  }, [selectedProductId]);

  // Keep fallback if active product gets removed from catalog
  useEffect(() => {
    if (selectedProductId && !config.products.some((p) => p.id === selectedProductId)) {
      const fallback = config.products.length > 0 ? config.products[0] : null;
      setSelectedProductId(fallback ? fallback.id : null);
      setDraftProduct(fallback ? JSON.parse(JSON.stringify(fallback)) : null);
    }
  }, [config.products, selectedProductId]);

  const isDirty = Boolean(
    draftProduct &&
    selectedProduct &&
    JSON.stringify(draftProduct) !== JSON.stringify(selectedProduct)
  );

  const generateId = () =>
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2, 9);

  const createNewProduct = () => {
    const newProduct: Product = {
      id: generateId(),
      name: "Nueva Prenda",
      ingredients: [],
      productionWeight: 1.0,
      fabricQuantity: 1,
    };
    onChange({ ...config, products: [newProduct, ...config.products] });
    setSelectedProductId(newProduct.id);
    setDraftProduct(JSON.parse(JSON.stringify(newProduct)));
    onNotify?.("Nueva prenda creada", "success");
  };

  const handleAddProductClick = () => {
    if (isDirty) {
      setPendingProductId("NEW_PRODUCT");
      return;
    }
    createNewProduct();
  };

  const handleSelectProduct = (id: string) => {
    if (id === selectedProductId) return;
    if (isDirty) {
      setPendingProductId(id);
      return;
    }
    setSelectedProductId(id);
    const target = config.products.find((p) => p.id === id);
    setDraftProduct(target ? JSON.parse(JSON.stringify(target)) : null);
  };

  const handleConfirmNavigation = () => {
    const nextId = pendingProductId;
    setPendingProductId(null);
    if (!nextId) return;

    if (nextId === "NEW_PRODUCT") {
      createNewProduct();
    } else {
      setSelectedProductId(nextId);
      const target = config.products.find((p) => p.id === nextId);
      setDraftProduct(target ? JSON.parse(JSON.stringify(target)) : null);
    }
  };

  const handleCancelNavigation = () => {
    setPendingProductId(null);
  };

  const removeProduct = (id: string) => {
    const newProducts = config.products.filter((p) => p.id !== id);
    onChange({ ...config, products: newProducts });
    if (selectedProductId === id) {
      const nextProduct = newProducts.length > 0 ? newProducts[0] : null;
      setSelectedProductId(nextProduct ? nextProduct.id : null);
      setDraftProduct(nextProduct ? JSON.parse(JSON.stringify(nextProduct)) : null);
    }
    onNotify?.("Prenda eliminada", "info");
  };

  const updateDraftProduct = <K extends keyof Product>(field: K, value: Product[K]) => {
    setDraftProduct((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  const handleSave = () => {
    if (!draftProduct || !selectedProduct) return;
    const updatedProducts = config.products.map((p) =>
      p.id === draftProduct.id ? draftProduct : p
    );
    onChange({
      ...config,
      products: updatedProducts,
    });
    onNotify?.(`✓ Receta de ${draftProduct.name || "Prenda"} actualizada`, "success");
  };

  const handleDiscard = () => {
    if (!selectedProduct) return;
    setDraftProduct(JSON.parse(JSON.stringify(selectedProduct)));
    onNotify?.("Cambios descartados", "info");
  };

  const fabrics = useMemo(
    () => config.materials.filter((m) => m.category === "fabric"),
    [config.materials]
  );
  const insumos = useMemo(
    () => config.materials.filter((m) => m.category !== "fabric"),
    [config.materials]
  );

  const toggleFabric = (fabricId: string) => {
    if (!draftProduct) return;
    const current = draftProduct.allowedFabricIds || [];
    const next = current.includes(fabricId)
      ? current.filter((id) => id !== fabricId)
      : [...current, fabricId];
    updateDraftProduct("allowedFabricIds", next);
  };

  const handleAddIngredient = (matId: string) => {
    if (!draftProduct) return;
    if (draftProduct.ingredients.some((i) => i.materialId === matId)) return;
    updateDraftProduct("ingredients", [
      ...draftProduct.ingredients,
      { materialId: matId, quantity: 1 },
    ]);
  };

  const handleUpdateIngredient = (matId: string, quantity: number) => {
    if (!draftProduct) return;
    updateDraftProduct(
      "ingredients",
      draftProduct.ingredients.map((i) =>
        i.materialId === matId ? { ...i, quantity } : i
      )
    );
  };

  const handleRemoveIngredient = (matId: string) => {
    if (!draftProduct) return;
    updateDraftProduct(
      "ingredients",
      draftProduct.ingredients.filter((i) => i.materialId !== matId)
    );
  };

  return (
    <div className="w-full flex flex-col h-full">
      <div className="flex justify-between items-center mb-4 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Taller de Prendas</h2>
          <p className="text-stone-400 text-xs mt-0.5">Configurador y costeador de productos.</p>
        </div>
      </div>

      <div className="flex-1 grid lg:grid-cols-12 gap-4 min-h-0">
        {/* Left Rail */}
        <div className="lg:col-span-3 flex flex-col gap-2 bg-stone-900/40 border border-stone-800 rounded-xl p-2 overflow-y-auto min-h-0">
          <div className="flex flex-col gap-1 flex-1 overflow-y-auto">
            {config.products.map((p) => {
              const isSelected = p.id === selectedProductId;
              const fabricCount = p.allowedFabricIds?.length || 0;
              return (
                <button
                  key={p.id}
                  onClick={() => handleSelectProduct(p.id)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg border transition-all text-sm flex items-center justify-between cursor-pointer",
                    isSelected
                      ? "bg-amber-500/10 border-amber-500/50 text-amber-500"
                      : "bg-stone-950 border-stone-800 text-stone-300 hover:border-stone-600"
                  )}
                >
                  <div className="truncate pr-2">
                    <div className="font-bold truncate flex items-center gap-1.5">
                      <span>{p.name || "Sin nombre"}</span>
                      {isSelected && isDirty && (
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0"
                          title="Cambios pendientes"
                        />
                      )}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider font-mono opacity-60 mt-1">
                      {fabricCount} telas • {p.fabricQuantity || 0}m
                    </div>
                  </div>
                  <div className="shrink-0 bg-stone-900 px-2 py-1 rounded font-mono text-[10px] border border-stone-800">
                    {(p.productionWeight || 1).toFixed(1)}x
                  </div>
                </button>
              );
            })}
          </div>
          <button
            onClick={handleAddProductClick}
            className="w-full mt-2 bg-stone-800 text-white p-2 rounded-lg text-xs font-mono uppercase tracking-wider font-bold hover:bg-stone-700 transition-colors flex justify-center items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Nueva Prenda
          </button>
        </div>

        {/* Right Canvas */}
        <div className="lg:col-span-9 flex flex-col gap-4 min-h-0">
          {draftProduct ? (
            <div className="flex-1 flex flex-col bg-stone-900/40 border border-stone-800 rounded-2xl p-6 min-h-0 overflow-y-auto relative">
              {/* Top Toolbar */}
              <div className="flex flex-wrap items-end gap-4 pb-4 border-b border-stone-800 shrink-0">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-[10px] uppercase font-bold text-stone-500 tracking-wider mb-1 block">
                    Nombre de Prenda
                  </label>
                  <input
                    type="text"
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-white focus:border-amber-500 outline-none text-sm font-bold"
                    value={draftProduct.name}
                    onChange={(e) => updateDraftProduct("name", e.target.value)}
                  />
                </div>
                <div className="w-32">
                  <label className="text-[10px] uppercase font-bold text-stone-500 tracking-wider mb-1 block">
                    Esfuerzo (x)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.1"
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-white focus:border-amber-500 outline-none text-sm font-mono text-center"
                    value={draftProduct.productionWeight ?? 1}
                    onChange={(e) =>
                      updateDraftProduct("productionWeight", parseFloat(e.target.value) || 0)
                    }
                    onWheel={(e) => e.currentTarget.blur()}
                  />
                </div>
                <div className="w-48">
                  <label className="text-[10px] uppercase font-bold text-stone-500 tracking-wider mb-1 block">
                    Tela Principal
                  </label>
                  <select
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-white focus:border-amber-500 outline-none text-sm"
                    value={draftProduct.defaultFabricId || ""}
                    onChange={(e) => updateDraftProduct("defaultFabricId", e.target.value)}
                  >
                    <option value="">Seleccionar...</option>
                    {fabrics.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-32">
                  <label className="text-[10px] uppercase font-bold text-stone-500 tracking-wider mb-1 block">
                    Metros/Unidad
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-white focus:border-amber-500 outline-none text-sm font-mono text-center"
                    value={draftProduct.fabricQuantity ?? 0}
                    onChange={(e) =>
                      updateDraftProduct("fabricQuantity", parseFloat(e.target.value) || 0)
                    }
                    onWheel={(e) => e.currentTarget.blur()}
                  />
                </div>
                <button
                  onClick={() => removeProduct(draftProduct.id)}
                  className="p-2.5 text-stone-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors border border-transparent hover:border-red-400/20 self-end h-10 cursor-pointer"
                  title="Eliminar prenda"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Two-Column Split */}
              <div className="grid md:grid-cols-2 gap-6 py-4 flex-1 min-h-0 shrink-0">
                {/* Left: Allowed Fabrics */}
                <div className="flex flex-col h-full min-h-0">
                  <label className="text-[10px] uppercase font-bold text-stone-500 tracking-wider mb-2 block">
                    Telas Permitidas (Matriz)
                  </label>
                  <div className="flex-1 border border-stone-800 bg-stone-950 rounded-xl p-3 overflow-y-auto flex flex-wrap gap-2 content-start">
                    {fabrics.map((f) => {
                      const isAllowed = (draftProduct.allowedFabricIds || []).includes(f.id);
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => toggleFabric(f.id)}
                          className={cn(
                            "px-3 py-1.5 rounded-full text-xs font-mono transition-all border cursor-pointer",
                            isAllowed
                              ? "bg-amber-500/20 border-amber-500/40 text-amber-400 font-bold"
                              : "bg-stone-900 border-stone-800 text-stone-500 hover:bg-stone-800 hover:text-stone-300"
                          )}
                        >
                          {f.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Right: Ingredients Table */}
                <ProductIngredientsTable
                  draftProduct={draftProduct}
                  config={config}
                  insumos={insumos}
                  onAddIngredient={handleAddIngredient}
                  onUpdateIngredient={handleUpdateIngredient}
                  onRemoveIngredient={handleRemoveIngredient}
                />
              </div>

              {/* Bottom Strip: Precios Finales por Tela */}
              <ProductProjectedPrices
                draftProduct={draftProduct}
                config={config}
                isDirty={isDirty}
              />

              {/* Sticky Draft Action Dock */}
              <div className="sticky bottom-0 z-10 mt-6 -mx-6 -mb-6 p-4 px-6 bg-stone-950/95 backdrop-blur-md border-t border-stone-800 flex items-center justify-between gap-3 shadow-2xl rounded-b-2xl">
                <div className="flex items-center gap-2">
                  {isDirty ? (
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      Cambios pendientes de confirmación
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono text-stone-500 bg-stone-900 border border-stone-800">
                      ✓ Al día con el catálogo
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!isDirty}
                    onClick={handleDiscard}
                    className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-stone-400 hover:text-stone-200 bg-stone-900 hover:bg-stone-800 border border-stone-800 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Descartar
                  </button>
                  <button
                    type="button"
                    disabled={!isDirty}
                    onClick={handleSave}
                    className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-stone-950 bg-amber-400 hover:bg-amber-300 transition shadow-lg shadow-amber-950/40 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-stone-900/40 border border-stone-800 rounded-xl text-stone-500 italic text-sm">
              Selecciona o crea una prenda para comenzar.
            </div>
          )}
        </div>
      </div>

      {/* Navigation Shield Confirmation Barrier */}
      <NavigationShieldModal
        isOpen={Boolean(pendingProductId)}
        onConfirm={handleConfirmNavigation}
        onCancel={handleCancelNavigation}
      />
    </div>
  );
}
