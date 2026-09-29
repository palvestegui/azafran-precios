import React, { useState, useEffect } from "react";
import { UploadCloud, Loader2, CheckCircle2, AlertTriangle, Settings } from "lucide-react";
import { GlobalConfig, Product } from "../../types";
import { PricingMatrixTable } from "../pricing/PricingMatrixTable";
import { buildVentasPayload } from "../../utils/ventasPublisher";

interface PricingMatrixViewProps {
  config: GlobalConfig;
  onChange?: (newConfig: GlobalConfig) => void;
}

export const PricingMatrixView: React.FC<PricingMatrixViewProps> = ({
  config,
  onChange,
}) => {
  const [ventasUrl, setVentasUrl] = useState<string>(() => {
    return localStorage.getItem("azafran_target_ventas_url") || "https://sistema-azafran.ai.studio";
  });
  const [isPublishing, setIsPublishing] = useState(false);
  const [confirmStep, setConfirmStep] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  // Reset confirmation state after 4 seconds of inactivity
  useEffect(() => {
    if (!confirmStep) return;
    const timer = setTimeout(() => setConfirmStep(false), 4000);
    return () => clearTimeout(timer);
  }, [confirmStep]);

  const handleSaveVentasUrl = (newUrl: string) => {
    setVentasUrl(newUrl);
    localStorage.setItem("azafran_target_ventas_url", newUrl);
  };

  const handlePublishClick = async () => {
    if (!confirmStep) {
      setConfirmStep(true);
      return;
    }

    setConfirmStep(false);
    setIsPublishing(true);
    setPublishError(null);
    setPublishSuccess(false);

    try {
      const payload = buildVentasPayload(config);
      const cleanUrl = ventasUrl.trim().replace(/\/$/, "");

      let res: Response;
      try {
        res = await fetch(`${cleanUrl}/api/pricing/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch (fetchErr: unknown) {
        // Fallback to server-side proxy if direct browser fetch is blocked by CORS/network policy
        const proxyRes = await fetch("/api/sync-proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetUrl: cleanUrl, payload }),
        }).catch(() => null);

        if (proxyRes && proxyRes.ok) {
          res = proxyRes;
        } else {
          throw fetchErr;
        }
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Error HTTP ${res.status}`);
      }

      setPublishSuccess(true);
      setTimeout(() => setPublishSuccess(false), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setPublishError(msg);
      setTimeout(() => setPublishError(null), 8000);
    } finally {
      setIsPublishing(false);
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
    <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
      <div className="relative flex items-center group">
        <Settings className="w-3.5 h-3.5 absolute left-2 text-stone-500 pointer-events-none group-focus-within:text-orange-400 transition-colors" />
        <input
          type="text"
          value={ventasUrl}
          onChange={(e) => handleSaveVentasUrl(e.target.value)}
          placeholder="https://sistema-azafran.ai.studio"
          title="URL destino de Ventas para sincronización HTTP directa (editable)"
          className="w-44 sm:w-56 pl-7 pr-2 py-1.5 bg-stone-900 border border-stone-800 hover:border-stone-700 focus:border-orange-500 rounded-xl text-xs font-mono text-stone-300 placeholder:text-stone-600 focus:outline-none transition-all shadow-inner"
        />
      </div>

      <button
        type="button"
        onClick={handlePublishClick}
        disabled={isPublishing}
        title={`Publicar catálogo y tarifas calculadas directamente a ${ventasUrl}`}
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
    </div>
  );

  const publishMessageBanner = (
    <>
      {publishSuccess && (
        <div className="p-3 rounded-xl border border-emerald-500/40 bg-emerald-950/40 text-emerald-300 text-xs font-mono flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Sincronización exitosa con Ventas ({ventasUrl}). Catálogo y tarifas actualizadas.</span>
        </div>
      )}
      {publishError && (
        <div className="p-3 rounded-xl border border-red-500/40 bg-red-950/40 text-red-300 text-xs font-mono flex items-center gap-2 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>Error al sincronizar con Ventas: {publishError}</span>
        </div>
      )}
    </>
  );

  return (
    <PricingMatrixTable
      products={config.products}
      fabrics={config.materials}
      config={config}
      onUpdateProductMeters={handleUpdateProductMeters}
      publishAction={publishActionButton}
      publishBanner={publishSuccess || publishError ? publishMessageBanner : null}
    />
  );
};