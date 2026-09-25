import React from "react";
import { GlobalConfig } from "../../types";
import { PricingMatrixTable } from "./PricingMatrixTable";

export interface PricingMatrixViewProps {
  config: GlobalConfig;
  onChange?: (newConfig: GlobalConfig) => void;
}

export const PricingMatrixView: React.FC<PricingMatrixViewProps> = ({
  config,
  onChange,
}) => {
  return (
    <PricingMatrixTable
      products={config.products}
      fabrics={config.materials}
      config={config}
      onUpdateProductMeters={(productId, newMeters) => {
        if (!onChange) return;
        onChange({
          ...config,
          products: config.products.map((p) =>
            p.id === productId ? { ...p, fabricQuantity: newMeters } : p
          ),
        });
      }}
    />
  );
};
