import React, { useState, useMemo, useEffect } from "react";
import { Plus, Trash2, Copy } from "lucide-react";
import { GlobalConfig, Product } from "../../types";
import { cn } from "../../lib/utils";
import { NavigationShieldModal } from "../products/NavigationShieldModal";
import { DeleteProductModal } from "../products/DeleteProductModal";
import { ProductIngredientsTable } from "../products/ProductIngredientsTable";
import { ProductProjectedPrices } from "../products/ProductProjectedPrices";
import { AllowedFabricsDropdown } from "../products/AllowedFabricsDropdown";

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
  const [pendingCloneId, setPendingCloneId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

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
    (draftProduct &&
      selectedProduct &&
      JSON.stringify(draftProduct) !== JSON.stringify(selectedProduct)) ||
      (pendingCloneId && draftProduct?.id === pendingCloneId)
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
    setPendingCloneId(null);
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
    setPendingCloneId(null);
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

  const handleCloneProduct = () => {
    const activeProduct = draftProduct || selectedProduct;
    if (!activeProduct) return;

    const clonedId = `garment_${Date.now()}`;
    const clonedProduct: Product = {
      id: clonedId,
      name: `Copia de ${activeProduct.name || "Prenda"}`,
      productionWeight: activeProduct.productionWeight ?? 1.0,
      fabricQuantity: activeProduct.fabricQuantity ?? 1,
      defaultFabricId: activeProduct.defaultFabricId,
      allowedFabricIds: activeProduct.allowedFabricIds
        ? [...activeProduct.allowedFabricIds]
        : [],
      ingredients: (activeProduct.ingredients || []).map((s) => ({ ...s })),
      profitMargin: activeProduct.profitMargin,
      wholesaleMargin: activeProduct.wholesaleMargin,
      variantOverrides: {},
    };

    const activeIdx = config.products.findIndex((p) => p.id === activeProduct.id);
    const updatedProducts = [...config.products];
    if (activeIdx >= 0) {
      updatedProducts.splice(activeIdx + 1, 0, clonedProduct);
    } else {
      updatedProducts.unshift(clonedProduct);
    }

    onChange({ ...config, products: updatedProducts });
    setSelectedProductId(clonedProduct.id);
    setDraftProduct(JSON.parse(JSON.stringify(clonedProduct)));
    setPendingCloneId(clonedProduct.id);
    onNotify?.(`Copia creada: ${clonedProduct.name}`, "success");
  };

  const confirmDeleteProduct = () => {
    if (!draftProduct && !selectedProduct) return;
    const targetId = draftProduct?.id || selectedProduct?.id;
    if (!targetId) return;
    setIsDeleteModalOpen(false);
    setPendingCloneId(null);
    removeProduct(targetId);
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
    setPendingCloneId(null);
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
    setPendingCloneId(null);
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
    <div className="w-full p-2 pt-0 mt-0 flex flex-1 h-[calc(100vh-65px)] min-h-0 overflow-hidden">
      {/* Left Garment Selector Column */}
      <div className="w-80 h-full flex flex-col pr-3 border-r border-stone-800/50 shrink-0">
        <div className="flex flex-col gap-1 flex-1 overflow-y-auto min-h-0">
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
        </div>

        {/* Right Configuration Canvas */}
        {draftProduct ? (
          <div className="flex-1 w-full h-full flex flex-col pl-4 overflow-y-auto relative">
            {/* Two-Column Grid: Garment Configuration & Insumos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-3 mb-3 border-b border-stone-800/40">
              {/* Column 1: Garment input controls */}
              <div className="flex flex-wrap items-end gap-4">
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
                <div className="relative">
                  <AllowedFabricsDropdown
                    allowedFabrics={draftProduct.allowedFabricIds || []}
                    allFabrics={fabrics}
                    baseFabric={draftProduct.defaultFabricId || ""}
                    onChange={(newAllowed) => updateDraftProduct("allowedFabricIds", newAllowed)}
                  />
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
                <div className="flex items-center gap-2 self-end">
                  <button
                    type="button"
                    onClick={handleCloneProduct}
                    className="text-amber-400 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-xs font-black uppercase px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer h-10 transition-colors"
                    title="Duplicar prenda"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Duplicar Prenda</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="p-2.5 text-stone-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-colors border border-transparent hover:border-red-400/20 h-10 flex items-center justify-center cursor-pointer"
                    title="Eliminar prenda"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Column 2: Insumos & Costos Fijos */}
              <div className="w-full">
                <ProductIngredientsTable
                  draftProduct={draftProduct}
                  config={config}
                  insumos={insumos}
                  onAddIngredient={handleAddIngredient}
                  onUpdateIngredient={handleUpdateIngredient}
                  onRemoveIngredient={handleRemoveIngredient}
                />
              </div>
            </div>

              {/* Precios Finales Proyectados */}
              <div className="w-full pb-3 mb-3 border-b border-stone-800/40">
                <ProductProjectedPrices
                  draftProduct={draftProduct}
                  config={config}
                  isDirty={isDirty}
                />
              </div>

              {/* Action Pill docked in top bar runway */}
              <div className="fixed top-2.5 right-44 z-50 bg-stone-900/90 border border-stone-800 px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-2.5 backdrop-blur-md">
                <div className="flex items-center gap-1.5">
                  {isDirty ? (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-amber-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      Cambios pendientes
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono text-stone-500">
                      ✓ Al día
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={!isDirty}
                    onClick={handleDiscard}
                    className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg text-stone-400 hover:text-white transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Descartar
                  </button>
                  <button
                    type="button"
                    disabled={!isDirty}
                    onClick={handleSave}
                    className="px-3 py-1 text-[10px] font-black uppercase rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </div>
            </div>
        ) : (
          <div className="flex-1 w-full h-full flex items-center justify-center pl-4 text-stone-500 italic text-sm">
            Selecciona o crea una prenda para comenzar.
          </div>
        )}

      {/* Docked "+ Nueva Prenda" Button in TopBar runway */}
      <button
        type="button"
        onClick={handleAddProductClick}
        className="fixed top-2.5 left-[340px] z-50 bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 px-3 py-1 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Nueva Prenda</span>
      </button>

      {/* Navigation Shield Confirmation Barrier */}
      <NavigationShieldModal
        isOpen={Boolean(pendingProductId)}
        onConfirm={handleConfirmNavigation}
        onCancel={handleCancelNavigation}
      />

      {/* Delete Product Confirmation Modal */}
      <DeleteProductModal
        isOpen={isDeleteModalOpen}
        productName={draftProduct?.name || selectedProduct?.name || "Prenda"}
        onConfirm={confirmDeleteProduct}
        onCancel={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
}
