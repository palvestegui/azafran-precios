import React from "react";
import { GlobalConfig, Product } from "../../types";
import { PricingMatrixTable } from "../pricing/PricingMatrixTable";

interface PricingMatrixViewProps {
  config: GlobalConfig;
  onChange?: (newConfig: GlobalConfig) => void;
}

export const PricingMatrixView: React.FC<PricingMatrixViewProps> = ({
  config,
  onChange,
}) => {
  const handleUpdateProductMeters = (productId: string, newMeters: number) => {
    if (!onChange) return;
    const updatedProducts = config.products.map((p: Product) =>
      p.id === productId ? { ...p, fabricQuantity: newMeters } : p
    );
    onChange({
      ...config,
      products: updatedProducts,
    });
  };

  return (
    <PricingMatrixTable
      products={config.products}
      fabrics={config.materials}
      config={config}
      onUpdateProductMeters={handleUpdateProductMeters}
    />
  );
};