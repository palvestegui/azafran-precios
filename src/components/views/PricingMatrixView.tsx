import React, { useState, useEffect } from "react";
import { UploadCloud, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
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
  const [isPublishing, setIsPublishing] = useState(false);
  const [confirmStep, setConfirmStep] = useState(false);
  const [publishMessage, setPublishMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Reset confirmation state after 4 seconds of inactivity
  useEffect(() => {
    if (!confirmStep) return;
    const timer = setTimeout(() => setConfirmStep(false), 4000);
    return () => clearTimeout(timer);
  }, [confirmStep]);

  const handlePublishClick = async () => {
    if (!confirmStep) {
      setConfirmStep(true);
      return;
    }

    setConfirmStep(false);
    setIsPublishing(true);
    setPublishMessage(null);

    try {
      const res = await fetch("/api/sync-to-ventas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Error HTTP ${res.status}`);
      }

      setPublishMessage({
        text: `Sincronización exitosa: ${data.baseCount} base, ${data.catalogCount} catálogo.`,
        isError: false,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setPublishMessage({
        text: `Fallo de conexión con el servidor: ${msg}`,
        isError: true,
      });
    } finally {
      setIsPublishing(false);
      setTimeout(() => setPublishMessage(null), 6000);
    }
  };

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

  const publishActionButton = (
    <button
      type="button"
      onClick={handlePublishClick}
      disabled={isPublishing}
      title="Publicar catálogo y tarifas calculadas directamente a Ventas"
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-medium shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer ${
        confirmStep
          ? "bg-amber-600 hover:bg-amber-500 text-white animate-pulse"
          : "bg-orange-600 hover:bg-orange-500 text-white"
      }`}
    >
      {isPublishing ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : confirmStep ? (
        <AlertTriangle className="w-3.5 h-3.5" />
      ) : (
        <UploadCloud className="w-3.5 h-3.5" />
      )}
      <span>
        {isPublishing
          ? "Publicando..."
          : confirmStep
          ? "¿Confirmar publicación?"
          : "Publicar en Ventas"}
      </span>
    </button>
  );

  const publishMessageBanner = publishMessage ? (
    <div
      className={`p-3 rounded-xl border text-xs font-mono flex items-center gap-2 animate-in fade-in ${
        publishMessage.isError
          ? "bg-red-950/40 border-red-500/40 text-red-300"
          : "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
      }`}
    >
      {publishMessage.isError ? (
        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
      ) : (
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
      )}
      <span>{publishMessage.text}</span>
    </div>
  ) : null;

  return (
    <PricingMatrixTable
      products={config.products}
      fabrics={config.materials}
      config={config}
      onUpdateProductMeters={handleUpdateProductMeters}
      publishAction={publishActionButton}
      publishBanner={publishMessageBanner}
    />
  );
};