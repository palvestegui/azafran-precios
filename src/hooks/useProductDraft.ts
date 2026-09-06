import { useState, useEffect, useCallback, useMemo } from "react";
import { Product, ProductIngredient, Material } from "../types";

export interface UseProductDraftOptions {
  product: Product;
  onSaveProduct: (savedProduct: Product) => void;
  onNotify?: (text: string, type: "success" | "error") => void;
}

export interface UseProductDraftReturn {
  draftProduct: Product;
  isDirty: boolean;
  updateDraft: (updates: Partial<Product>) => void;
  addIngredient: (
    category: "fabric" | "other" | "accessory",
    materials: Material[]
  ) => boolean;
  updateIngredient: (
    index: number,
    updates: Partial<ProductIngredient>
  ) => void;
  removeIngredient: (index: number) => void;
  saveDraft: () => void;
  discardDraft: () => void;
  statusMessage: { text: string; type: "success" | "info" } | null;
}

function cloneProduct(p: Product): Product {
  return {
    ...p,
    ingredients: p.ingredients ? p.ingredients.map((ing) => ({ ...ing })) : [],
    allowedFabricIds: p.allowedFabricIds ? [...p.allowedFabricIds] : undefined,
    variantOverrides: p.variantOverrides
      ? Object.fromEntries(
          Object.entries(p.variantOverrides).map(([k, v]) => [k, { ...v }])
        )
      : undefined,
  };
}

function areProductsEqual(a: Product, b: Product): boolean {
  if (a.id !== b.id) return false;
  if (a.name !== b.name) return false;
  if ((a.defaultFabricId || "") !== (b.defaultFabricId || "")) return false;
  if (Number(a.fabricQuantity || 0) !== Number(b.fabricQuantity || 0))
    return false;
  if (Number(a.profitMargin || 0) !== Number(b.profitMargin || 0))
    return false;
  if (Number(a.wholesaleMargin || 0) !== Number(b.wholesaleMargin || 0))
    return false;
  if (
    Number(a.productionWeight ?? 1.0) !== Number(b.productionWeight ?? 1.0)
  )
    return false;

  const aAllowed = a.allowedFabricIds ? [...a.allowedFabricIds].sort() : [];
  const bAllowed = b.allowedFabricIds ? [...b.allowedFabricIds].sort() : [];
  if (aAllowed.length !== bAllowed.length) return false;
  for (let i = 0; i < aAllowed.length; i++) {
    if (aAllowed[i] !== bAllowed[i]) return false;
  }

  if (a.ingredients.length !== b.ingredients.length) return false;
  for (let i = 0; i < a.ingredients.length; i++) {
    if (a.ingredients[i].materialId !== b.ingredients[i].materialId)
      return false;
    if (
      Number(a.ingredients[i].quantity || 0) !==
      Number(b.ingredients[i].quantity || 0)
    )
      return false;
  }

  // Compare variantOverrides
  const aOverrides = a.variantOverrides || {};
  const bOverrides = b.variantOverrides || {};
  const aKeys = Object.keys(aOverrides).sort();
  const bKeys = Object.keys(bOverrides).sort();
  if (aKeys.length !== bKeys.length) return false;
  for (let i = 0; i < aKeys.length; i++) {
    const k = aKeys[i];
    if (k !== bKeys[i]) return false;
    if (aOverrides[k]?.customRetailPrice !== bOverrides[k]?.customRetailPrice)
      return false;
    if (aOverrides[k]?.customWholesalePrice !== bOverrides[k]?.customWholesalePrice)
      return false;
  }

  return true;
}

export function useProductDraft({
  product,
  onSaveProduct,
  onNotify,
}: UseProductDraftOptions): UseProductDraftReturn {
  const [draftProduct, setDraftProduct] = useState<Product>(() =>
    cloneProduct(product)
  );
  const [statusMessage, setStatusMessage] = useState<{
    text: string;
    type: "success" | "info";
  } | null>(null);

  const isDirty = useMemo(
    () => !areProductsEqual(draftProduct, product),
    [draftProduct, product]
  );

  // Sync with upstream product changes only if not dirty
  useEffect(() => {
    if (!isDirty) {
      setDraftProduct(cloneProduct(product));
    }
  }, [product, isDirty]);

  // Auto-dismiss local status toast after 3 seconds
  useEffect(() => {
    if (!statusMessage) return;
    const timer = setTimeout(() => setStatusMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [statusMessage]);

  const updateDraft = useCallback((updates: Partial<Product>) => {
    setDraftProduct((prev) => ({
      ...prev,
      ...updates,
    }));
  }, []);

  const addIngredient = useCallback(
    (
      category: "fabric" | "other" | "accessory",
      materials: Material[]
    ): boolean => {
      const available = materials.filter((m) => {
        if (category === "fabric") return m.category === "fabric";
        if (category === "other") return m.category === "other";
        return m.category === "accessory";
      });

      if (available.length === 0) {
        onNotify?.(
          "Primero registra materiales de esta categoría en la pestaña Materiales",
          "error"
        );
        return false;
      }

      const newIng: ProductIngredient = {
        materialId: available[0].id,
        quantity: 1,
      };

      setDraftProduct((prev) => ({
        ...prev,
        ingredients: [...prev.ingredients, newIng],
      }));
      return true;
    },
    [onNotify]
  );

  const updateIngredient = useCallback(
    (index: number, updates: Partial<ProductIngredient>) => {
      setDraftProduct((prev) => {
        const next = [...prev.ingredients];
        if (index >= 0 && index < next.length) {
          next[index] = { ...next[index], ...updates };
        }
        return { ...prev, ingredients: next };
      });
    },
    []
  );

  const removeIngredient = useCallback((index: number) => {
    setDraftProduct((prev) => {
      const next = [...prev.ingredients];
      if (index >= 0 && index < next.length) {
        next.splice(index, 1);
      }
      return { ...prev, ingredients: next };
    });
  }, []);

  const saveDraft = useCallback(() => {
    onSaveProduct(draftProduct);
    setStatusMessage({
      text: "Cambios guardados correctamente",
      type: "success",
    });
    onNotify?.(
      `Cambios guardados en "${draftProduct.name}"`,
      "success"
    );
  }, [draftProduct, onSaveProduct, onNotify]);

  const discardDraft = useCallback(() => {
    setDraftProduct(cloneProduct(product));
    setStatusMessage({
      text: "Cambios descartados",
      type: "info",
    });
    onNotify?.(
      `Cambios descartados en "${product.name}"`,
      "success"
    );
  }, [product, onNotify]);

  return {
    draftProduct,
    isDirty,
    updateDraft,
    addIngredient,
    updateIngredient,
    removeIngredient,
    saveDraft,
    discardDraft,
    statusMessage,
  };
}
