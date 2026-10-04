import React, { useRef, useState, useEffect } from "react";
import {
  UploadCloud,
  ArrowLeftRight,
  Trash2,
  Image as ImageIcon,
  Sparkles,
  Loader2,
  Scissors,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Product } from "../../types";
import { cropCenter916, splitDualDiptych } from "../../utils/imageSplitter";

interface ProductMediaEditorProps {
  key?: string;
  draftProduct: Product;
  updateDraft: (updates: Partial<Product>) => void;
}

export function ProductMediaEditor({
  draftProduct,
  updateDraft,
}: ProductMediaEditorProps) {
  const [isMediaDrawerOpen, setIsMediaDrawerOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Collapse drawer when selected product changes to preserve workspace ergonomics
  useEffect(() => {
    setIsMediaDrawerOpen(false);
  }, [draftProduct.id]);

  const dualInputRef = useRef<HTMLInputElement>(null);
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  const charCount = draftProduct.description?.trim().length || 0;
  const hasFront = Boolean(draftProduct.imageUrl);
  const hasBack = Boolean(draftProduct.backImageUrl);
  const photoCount = (hasFront ? 1 : 0) + (hasBack ? 1 : 0);
  const photoBadgeText =
    photoCount === 2
      ? "2/2 fotos"
      : hasFront
      ? "Frontal cargada"
      : hasBack
      ? "Posterior cargada"
      : "Sin fotos";

  const handleDualFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const { front, back } = await splitDualDiptych(file);
      updateDraft({
        imageUrl: front,
        backImageUrl: back,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al procesar foto doble";
      setErrorMsg(msg);
    } finally {
      setIsProcessing(false);
      if (dualInputRef.current) dualInputRef.current.value = "";
    }
  };

  const handleSingleUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "front" | "back"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const base64 = await cropCenter916(file);
      if (type === "front") {
        updateDraft({ imageUrl: base64 });
      } else {
        updateDraft({ backImageUrl: base64 });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error procesando imagen";
      setErrorMsg(msg);
    } finally {
      setIsProcessing(false);
      if (type === "front" && frontInputRef.current) frontInputRef.current.value = "";
      if (type === "back" && backInputRef.current) backInputRef.current.value = "";
    }
  };

  const handleSwapViews = () => {
    const front = draftProduct.imageUrl;
    const back = draftProduct.backImageUrl;
    updateDraft({
      imageUrl: back,
      backImageUrl: front,
    });
  };

  const handleRemoveView = (type: "front" | "back") => {
    if (type === "front") {
      updateDraft({ imageUrl: undefined });
    } else {
      updateDraft({ backImageUrl: undefined });
    }
  };

  return (
    <div className="bg-stone-900/60 border border-stone-800/80 rounded-2xl overflow-hidden transition-all duration-200">
      {/* Hidden File Inputs */}
      <input
        ref={dualInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleDualFileUpload}
      />
      <input
        ref={frontInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleSingleUpload(e, "front")}
      />
      <input
        ref={backInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleSingleUpload(e, "back")}
      />

      {/* Accordion Header Bar (always visible) */}
      <div
        onClick={() => setIsMediaDrawerOpen(!isMediaDrawerOpen)}
        className="w-full min-h-[42px] px-3.5 py-2 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-stone-800/30 transition-colors"
      >
        {/* Left: Sparkle icon & title */}
        <div className="flex items-center gap-2 shrink-0">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-stone-300">
            Descripción & Fotos de Catálogo (9:16)
          </span>
        </div>

        {/* Center / Metadata Badges */}
        <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
          {/* Character counter chip */}
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono tracking-tight shrink-0 ${
              charCount > 0
                ? "bg-stone-950 text-stone-300 border border-stone-800"
                : "bg-stone-950/50 text-stone-500 border border-stone-800/60"
            }`}
          >
            {charCount > 0 ? `${charCount} caracteres` : "Sin descripción"}
          </span>

          {/* Photo status chip */}
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono tracking-tight shrink-0 ${
              photoCount === 2
                ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/50"
                : photoCount === 1
                ? "bg-amber-950/60 text-amber-400 border border-amber-800/50"
                : "bg-stone-950/50 text-stone-500 border border-stone-800/60"
            }`}
          >
            <ImageIcon className="w-3 h-3" />
            <span>{photoBadgeText}</span>
          </span>

          {/* Collapsed Description Preview */}
          {!isMediaDrawerOpen && draftProduct.description?.trim() && (
            <span className="text-xs text-stone-500 truncate max-w-md italic hidden md:inline ml-1">
              {draftProduct.description.trim()}
            </span>
          )}
        </div>

        {/* Right: Sleek toggle button with chevron */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsMediaDrawerOpen(!isMediaDrawerOpen);
          }}
          className="flex items-center gap-1.5 text-xs font-bold text-amber-500 hover:text-amber-400 transition bg-stone-900 border border-stone-800 px-3 py-1.5 rounded-lg shrink-0 cursor-pointer"
        >
          <span>{isMediaDrawerOpen ? "Contraer" : "Expandir"}</span>
          {isMediaDrawerOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Collapsible Drawer Body */}
      {isMediaDrawerOpen && (
        <div className="border-t border-stone-800/80 p-4 flex flex-col gap-4 bg-stone-900/40">
          {/* Grid: Description & 9:16 Photo Catalog */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: Description Column */}
            <div className="lg:col-span-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] uppercase font-bold text-stone-400 tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Descripción del Producto
                  </label>
                  <span className="text-[10px] text-stone-500 font-mono">
                    {draftProduct.description?.length || 0} caracteres
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={draftProduct.description || ""}
                  onChange={(e) => updateDraft({ description: e.target.value })}
                  placeholder="Descripción para catálogo y ventas: detalles de corte, acabados, usos recomendados..."
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-stone-200 placeholder:text-stone-600 focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 outline-none resize-none transition-colors"
                />
              </div>

              {/* Quick Dual Upload Bar */}
              <div className="mt-3 bg-stone-950/70 border border-stone-800/80 rounded-xl p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400">
                    <Scissors className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-bold text-stone-300 truncate">
                      Dividir Foto Doble (Díptico)
                    </p>
                    <p className="text-[10px] text-stone-500">
                      Corta frente (izq.) y espalda (der.) automáticamente
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => dualInputRef.current?.click()}
                  className="shrink-0 bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
                >
                  {isProcessing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  ) : (
                    <Scissors className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  <span>✂️ Dividir Foto Doble</span>
                </button>
              </div>

              {errorMsg && (
                <p className="mt-2 text-xs text-red-400 bg-red-950/40 border border-red-800/40 rounded-lg p-2">
                  {errorMsg}
                </p>
              )}
            </div>

            {/* Right: Dual 9:16 Photo Views (Frente / Espalda) */}
            <div className="lg:col-span-6 flex flex-col">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] uppercase font-bold text-stone-400 tracking-wider flex items-center gap-1.5">
                  <span>Fotografía de Catálogo (9:16)</span>
                </label>
                {(draftProduct.imageUrl || draftProduct.backImageUrl) && (
                  <button
                    type="button"
                    onClick={handleSwapViews}
                    className="text-[10px] uppercase font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition cursor-pointer"
                    title="Intercambiar Vista Frontal y Posterior"
                  >
                    <ArrowLeftRight className="w-3 h-3" />
                    <span>Intercambiar Vistas</span>
                  </button>
                )}
              </div>

              {/* Cards Container */}
              <div className="grid grid-cols-2 gap-3.5">
                {/* Vista Frontal Card */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-stone-400 px-0.5">
                    <span>[ Vista Frontal ]</span>
                    {draftProduct.imageUrl && (
                      <button
                        type="button"
                        onClick={() => handleRemoveView("front")}
                        className="text-stone-500 hover:text-red-400 transition cursor-pointer p-0.5"
                        title="Eliminar vista frontal"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="w-full aspect-[9/16] max-h-[380px] rounded-xl border border-stone-800 bg-stone-950 p-1 overflow-hidden relative group flex items-center justify-center">
                    {draftProduct.imageUrl ? (
                      <img
                        src={draftProduct.imageUrl}
                        alt="Vista Frontal"
                        className="max-w-full max-h-full object-contain select-none"
                      />
                    ) : (
                      <div className="text-center p-3 flex flex-col items-center gap-1.5 text-stone-600">
                        <ImageIcon className="w-6 h-6 stroke-1" />
                        <span className="text-[10px]">Sin vista frontal</span>
                      </div>
                    )}
                    {/* Overlay Action Button */}
                    <button
                      type="button"
                      onClick={() => frontInputRef.current?.click()}
                      className="absolute inset-0 bg-stone-950/70 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 text-white text-xs font-bold transition-opacity cursor-pointer backdrop-blur-[2px]"
                    >
                      <UploadCloud className="w-4 h-4 text-amber-400" />
                      <span>{draftProduct.imageUrl ? "Reemplazar" : "Subir Frente"}</span>
                    </button>
                  </div>
                </div>

                {/* Vista Posterior / Espalda Card */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-stone-400 px-0.5">
                    <span>[ Vista Posterior ]</span>
                    {draftProduct.backImageUrl && (
                      <button
                        type="button"
                        onClick={() => handleRemoveView("back")}
                        className="text-stone-500 hover:text-red-400 transition cursor-pointer p-0.5"
                        title="Eliminar vista posterior"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="w-full aspect-[9/16] max-h-[380px] rounded-xl border border-stone-800 bg-stone-950 p-1 overflow-hidden relative group flex items-center justify-center">
                    {draftProduct.backImageUrl ? (
                      <img
                        src={draftProduct.backImageUrl}
                        alt="Vista Posterior"
                        className="max-w-full max-h-full object-contain select-none"
                      />
                    ) : (
                      <div className="text-center p-3 flex flex-col items-center gap-1.5 text-stone-600">
                        <ImageIcon className="w-6 h-6 stroke-1" />
                        <span className="text-[10px]">Sin vista posterior</span>
                      </div>
                    )}
                    {/* Overlay Action Button */}
                    <button
                      type="button"
                      onClick={() => backInputRef.current?.click()}
                      className="absolute inset-0 bg-stone-950/70 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 text-white text-xs font-bold transition-opacity cursor-pointer backdrop-blur-[2px]"
                    >
                      <UploadCloud className="w-4 h-4 text-amber-400" />
                      <span>{draftProduct.backImageUrl ? "Reemplazar" : "Subir Espalda"}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
