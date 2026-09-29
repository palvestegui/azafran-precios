import React, { useState, useMemo, useEffect } from "react";
import { Plus, Search, X } from "lucide-react";
import { GlobalConfig, Product, VariantPriceOverride } from "../../types";
import { cn } from "../../lib/utils";
import { NavigationShieldModal } from "../products/NavigationShieldModal";
import { DeleteProductModal } from "../products/DeleteProductModal";
import { ProductIngredientsTable } from "../products/ProductIngredientsTable";
import { ProductProjectedPrices } from "../products/ProductProjectedPrices";
import { ProductWorkbenchHeader } from "../products/ProductWorkbenchHeader";
import { ProductMediaEditor } from "../products/ProductMediaEditor";

interface ProductsViewProps {
  config: GlobalConfig;
  onChange: (c: GlobalConfig) => Promise<void> | void;
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

  const [committedProduct, setCommittedProduct] = useState<Product | null>(() => {
    const initial = config.products.length > 0 ? config.products[0] : null;
    return initial ? JSON.parse(JSON.stringify(initial)) : null;
  });

  const [pendingProductId, setPendingProductId] = useState<string | null>(null);
  const [pendingCloneId, setPendingCloneId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const sortedAndFilteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return [...config.products]
      .sort((a, b) => (a.name || "").localeCompare(b.name || "", "es", { sensitivity: "base" }))
      .filter((p) => !term || (p.name || "").toLowerCase().includes(term));
  }, [config.products, searchTerm]);

  // Sync draft whenever selectedProductId or products change
  useEffect(() => {
    const target = selectedProduct || (config.products.length > 0 ? config.products[0] : null);
    if (target) {
      if (target.id !== selectedProductId) setSelectedProductId(target.id);
      const cloned = JSON.parse(JSON.stringify(target));
      setDraftProduct(cloned);
      setCommittedProduct(cloned);
    } else {
      setDraftProduct(null);
      setCommittedProduct(null);
    }
  }, [selectedProductId, selectedProduct, config.products]);

  const isDirty = Boolean(
    (draftProduct &&
      committedProduct &&
      JSON.stringify(draftProduct) !== JSON.stringify(committedProduct)) ||
      (pendingCloneId && draftProduct?.id === pendingCloneId)
  );

  const generateId = () =>
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2, 9);

  const selectProductById = (id: string) => {
    setSelectedProductId(id);
    const target = config.products.find((p) => p.id === id);
    const cloned = target ? JSON.parse(JSON.stringify(target)) : null;
    setDraftProduct(cloned);
    setCommittedProduct(cloned);
  };

  const createNewProduct = () => {
    const newProduct: Product = {
      id: generateId(),
      name: "Nueva Prenda",
      ingredients: [],
      productionWeight: 1.0,
      fabricQuantity: 1,
    };
    onChange({ ...config, products: [newProduct, ...config.products] });
    selectProductById(newProduct.id);
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
    selectProductById(id);
  };

  const handleConfirmNavigation = () => {
    const nextId = pendingProductId;
    setPendingProductId(null);
    setPendingCloneId(null);
    if (!nextId) return;

    if (nextId === "NEW_PRODUCT") {
      createNewProduct();
    } else {
      selectProductById(nextId);
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
      category: activeProduct.category,
      description: activeProduct.description,
      imageUrl: activeProduct.imageUrl,
      backImageUrl: activeProduct.backImageUrl,
      productionWeight: activeProduct.productionWeight ?? 1.0,
      fabricQuantity: activeProduct.fabricQuantity ?? 1,
      defaultFabricId: activeProduct.defaultFabricId,
      allowedFabricIds: activeProduct.allowedFabricIds ? [...activeProduct.allowedFabricIds] : [],
      ingredients: activeProduct.ingredients ? activeProduct.ingredients.map((i) => ({ ...i })) : [],
      profitMargin: activeProduct.profitMargin,
      wholesaleMargin: activeProduct.wholesaleMargin,
      variantOverrides: activeProduct.variantOverrides ? JSON.parse(JSON.stringify(activeProduct.variantOverrides)) : {},
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
      const cloned = nextProduct ? JSON.parse(JSON.stringify(nextProduct)) : null;
      setDraftProduct(cloned);
      setCommittedProduct(cloned);
    }
    onNotify?.("Prenda eliminada", "info");
  };

  const updateDraft = (updates: Partial<Product>) => {
    setDraftProduct((prev) => {
      if (!prev) return null;
      const next: Product = { ...prev, ...updates };
      if (next.profitMargin === undefined) delete next.profitMargin;
      if (next.wholesaleMargin === undefined) delete next.wholesaleMargin;
      return next;
    });
  };

  const updateDraftProduct = <K extends keyof Product>(field: K, value: Product[K]) => {
    updateDraft({ [field]: value });
  };

  const markCurrentProductClean = () => {
    if (draftProduct) {
      const cleanCopy = JSON.parse(JSON.stringify(draftProduct));
      setCommittedProduct(cleanCopy);
      setDraftProduct(cleanCopy);
    }
  };

  const handleSave = async () => {
    if (!draftProduct) return;
    setPendingCloneId(null);

    // 1. Commit active product draft if it has pending changes
    let updatedProducts = [...config.products];
    if (isDirty && draftProduct) {
      const exists = updatedProducts.some((p) => p.id === draftProduct.id);
      if (exists) {
        updatedProducts = updatedProducts.map((p) =>
          p.id === draftProduct.id ? draftProduct : p
        );
      } else {
        updatedProducts = [draftProduct, ...updatedProducts];
      }
    }

    // 2. Write to Firestore immediately in one run
    const newConfig: GlobalConfig = {
      ...config,
      products: updatedProducts,
    };

    // 3. Mark draft clean so header immediately flips to '✓ Al día' on first click
    markCurrentProductClean();

    await onChange(newConfig);
    onNotify?.(`✓ Receta de ${draftProduct.name || "Prenda"} guardada y al día`, "success");
  };

  const handleDiscard = () => {
    const base = committedProduct || selectedProduct;
    if (!base) return;
    setPendingCloneId(null);
    const clean = JSON.parse(JSON.stringify(base));
    setDraftProduct(clean);
    setCommittedProduct(clean);
    onNotify?.("Cambios descartados", "info");
  };

  const fabrics = useMemo(() => config.materials.filter((m) => m.category === "fabric"), [config.materials]);
  const insumos = useMemo(() => config.materials.filter((m) => m.category !== "fabric"), [config.materials]);

  const handleAddIngredient = (matId: string) => {
    if (!draftProduct || draftProduct.ingredients.some((i) => i.materialId === matId)) return;
    updateDraftProduct("ingredients", [...draftProduct.ingredients, { materialId: matId, quantity: 1 }]);
  };

  const handleUpdateIngredient = (matId: string, quantity: number) => {
    if (!draftProduct) return;
    updateDraftProduct("ingredients", draftProduct.ingredients.map((i) => (i.materialId === matId ? { ...i, quantity } : i)));
  };

  const handleRemoveIngredient = (matId: string) => {
    if (!draftProduct) return;
    updateDraftProduct("ingredients", draftProduct.ingredients.filter((i) => i.materialId !== matId));
  };

  const handleUpdateOverride = (fabricId: string, override: VariantPriceOverride | null) => {
    setDraftProduct((prev) => {
      if (!prev) return null;
      const current = prev.variantOverrides ? { ...prev.variantOverrides } : {};
      if (!override || (override.customRetailPrice === undefined && override.customWholesalePrice === undefined)) {
        delete current[fabricId];
      } else {
        current[fabricId] = override;
      }
      return { ...prev, variantOverrides: Object.keys(current).length > 0 ? current : undefined };
    });
  };

  return (
    <div className="w-full p-2 pt-0 mt-0 flex flex-1 h-[calc(100vh-65px)] min-h-0 overflow-hidden">
      {/* Left Garment Selector Column */}
      <div className="w-80 h-full flex flex-col pr-3 border-r border-stone-800/50 shrink-0">
        {/* Real-Time Garment Search */}
        <div className="relative mb-2 shrink-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-500 pointer-events-none" />
          <input
            id="garment-search-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar prenda..."
            className="w-full bg-stone-900 border border-stone-800 rounded-lg pl-8 pr-7 py-1.5 text-xs text-stone-200 placeholder:text-stone-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-colors"
          />
          {searchTerm && (
            <button
              id="clear-garment-search-btn"
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 p-0.5 rounded cursor-pointer transition-colors"
              title="Limpiar búsqueda"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-col gap-1 flex-1 overflow-y-auto min-h-0">
          {sortedAndFilteredProducts.length === 0 ? (
            <div className="text-center py-8 px-2 text-xs text-stone-500 italic">
              No se encontraron prendas
            </div>
          ) : (
            sortedAndFilteredProducts.map((p) => {
              const isSelected = p.id === selectedProductId;
              const fabricsCount = p.allowedFabricIds?.length || 0;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectProduct(p.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex flex-col gap-1 cursor-pointer ${
                    isSelected
                      ? "bg-amber-500/10 border-amber-500/60 text-white shadow-md"
                      : "bg-stone-900/40 border-stone-800 text-stone-300 hover:bg-stone-900 hover:border-stone-700"
                  }`}
                >
                  {/* Full Garment Name taking full width without truncation */}
                  <div className="font-bold text-xs text-stone-100 break-words leading-snug flex items-start justify-between gap-1.5">
                    <span>{p.name || "Sin nombre"}</span>
                    {isSelected && isDirty && (
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0 mt-0.5"
                        title="Cambios pendientes"
                      />
                    )}
                  </div>

                  {/* Workshop Specs: Telas & Meterage */}
                  <div className="text-[10px] text-stone-500 font-mono uppercase tracking-wider">
                    {fabricsCount} TELAS • {p.fabricQuantity || 0}M
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

        {/* Right Configuration Canvas */}
        {draftProduct ? (
          <div className="flex-1 w-full h-full flex flex-col pl-4 overflow-y-auto relative">
            {/* Two-Column Grid: Garment Configuration & Insumos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-3 mb-3 border-b border-stone-800/40">
              {/* Column 1: Garment input controls & margins */}
              <ProductWorkbenchHeader
                draftProduct={draftProduct}
                config={config}
                fabrics={fabrics}
                updateDraft={updateDraft}
                onCloneProduct={handleCloneProduct}
                onDeleteProduct={() => setIsDeleteModalOpen(true)}
              />

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

            {/* Fotografía de Catálogo (9:16) y Descripción */}
            <div className="w-full pb-3 mb-3 border-b border-stone-800/40">
              <ProductMediaEditor
                draftProduct={draftProduct}
                updateDraft={updateDraft}
              />
            </div>

            {/* Precios Finales Proyectados */}
            <div className="w-full pb-3 mb-3 border-b border-stone-800/40">
              <ProductProjectedPrices
                draftProduct={draftProduct}
                config={config}
                isDirty={isDirty}
                onUpdateOverride={handleUpdateOverride}
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
