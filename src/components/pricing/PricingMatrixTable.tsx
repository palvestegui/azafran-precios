import React, { useState, useMemo } from "react";
import { GlobalConfig, Material, Product } from "../../types";
import {
  calculateMatrixCell,
  MatrixViewMode,
  exportMatrixToCsv,
} from "../../utils/pricingMatrix";
import { exportMatrixToPdf } from "../../utils/matrixPdfExport";
import {
  Scissors,
  Search,
  Check,
  Layers,
  FileSpreadsheet,
  Printer,
  ShoppingBag,
  Store,
  Info,
  CheckCircle2,
  UploadCloud,
  Loader2,
} from "lucide-react";

interface PricingMatrixTableProps {
  products: Product[];
  fabrics: Material[];
  config: GlobalConfig;
  mode?: MatrixViewMode;
  onUpdateProductMeters?: (productId: string, newMeters: number) => void;
  onPublishToVentas?: () => Promise<void>;
  isPublishing?: boolean;
  publishMessage?: string | null;
  publishAction?: React.ReactNode;
  publishBanner?: React.ReactNode;
}

export const PricingMatrixTable: React.FC<PricingMatrixTableProps> = ({
  products,
  fabrics,
  config,
  mode: initialMode = "combined",
  onUpdateProductMeters,
  onPublishToVentas,
  isPublishing: externalIsPublishing,
  publishMessage: externalPublishMessage,
  publishAction,
  publishBanner,
}) => {
  const [selectedProdId, setSelectedProdId] = useState<string>(products[0]?.id || "");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [editingMeters, setEditingMeters] = useState<boolean>(false);
  const [tempMeters, setTempMeters] = useState<string>("");
  const [currentMode, setCurrentMode] = useState<MatrixViewMode>(initialMode);
  const [showFormulas, setShowFormulas] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [internalPublishing, setInternalPublishing] = useState<boolean>(false);
  const [internalPublishMessage, setInternalPublishMessage] = useState<string | null>(null);

  const isPublishing = externalIsPublishing !== undefined ? externalIsPublishing : internalPublishing;
  const publishMessage = externalPublishMessage !== undefined ? externalPublishMessage : internalPublishMessage;

  const fabricList = useMemo(() => fabrics.filter((m) => m.category === "fabric"), [fabrics]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, searchQuery]);

  const activeProduct = useMemo(
    () => products.find((p) => p.id === selectedProdId) || filteredProducts[0] || products[0],
    [products, filteredProducts, selectedProdId]
  );

  const fabricLadder = useMemo(() => {
    if (!activeProduct) return [];
    const allowedSet = activeProduct.allowedFabricIds ? new Set(activeProduct.allowedFabricIds) : null;
    const applicable = fabricList.filter((f) => (allowedSet ? allowedSet.has(f.id) : true));

    const items = applicable.map((fabric) => {
      const cell = calculateMatrixCell(activeProduct, fabric, config);
      const fabricCost = (fabric.pricePerUnit || 0) * (activeProduct.fabricQuantity || 0) * (1 + (fabric.wastagePercentage || 0) / 100);
      return { fabric, cell, fabricCost };
    });

    return items.sort((a, b) => (a.cell.retailPrice || 0) - (b.cell.retailPrice || 0));
  }, [activeProduct, fabricList, config]);

  const priceRange = useMemo(() => {
    if (fabricLadder.length === 0) return null;
    return {
      minRetail: fabricLadder[0]?.cell.retailPrice || 0,
      maxRetail: fabricLadder[fabricLadder.length - 1]?.cell.retailPrice || 0,
      minWholesale: fabricLadder[0]?.cell.wholesalePrice || 0,
      maxWholesale: fabricLadder[fabricLadder.length - 1]?.cell.wholesalePrice || 0,
    };
  }, [fabricLadder]);

  const handleExport = (type: "csv" | "pdf") => {
    try {
      const fn = type === "csv"
        ? exportMatrixToCsv(products, fabricList, config, currentMode)
        : exportMatrixToPdf(products, fabricList, config, currentMode);
      setToastMessage(`Matriz exportada como ${fn}`);
      setTimeout(() => setToastMessage(null), 3000);
    } catch { /* ignore */ }
  };

  const handlePublishToVentas = async () => {
    if (onPublishToVentas) {
      await onPublishToVentas();
      return;
    }
    setInternalPublishing(true);
    try {
      const res = await fetch("/api/sync-to-ventas", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setInternalPublishMessage(`Sincronización exitosa: ${data.baseCount} base, ${data.catalogCount} catálogo.`);
      } else {
        setInternalPublishMessage(`Error: ${data.error}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setInternalPublishMessage(`Error de conexión: ${msg}`);
    } finally {
      setInternalPublishing(false);
      setTimeout(() => setInternalPublishMessage(null), 5000);
    }
  };

  const saveMeters = () => {
    const parsed = parseFloat(tempMeters);
    if (!isNaN(parsed) && parsed >= 0 && onUpdateProductMeters && activeProduct) {
      onUpdateProductMeters(activeProduct.id, parsed);
    }
    setEditingMeters(false);
  };

  return (
    <div className="w-full flex flex-col gap-2 h-[calc(100vh-115px)]">
      {/* INTEGRATED ACTION BAR: All controls on top, ZERO duplicate title */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="text-xs font-mono text-stone-400 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          <span className="font-bold text-stone-200">Cotizador Dinámico</span>
          <span className="text-stone-500">·</span>
          <span>{products.length} prendas</span>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            type="button"
            onClick={() => setShowFormulas((prev) => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs transition-all ${
              showFormulas ? "bg-orange-500/20 border-orange-500/50 text-orange-400" : "bg-stone-900 border-stone-800 text-stone-400 hover:text-white"
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Fórmulas</span>
          </button>

          <div className="inline-flex p-0.5 bg-stone-900 border border-stone-800 rounded-xl shadow-inner">
            <button
              type="button"
              onClick={() => setCurrentMode("retail")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${currentMode === "retail" ? "bg-emerald-500 text-black font-bold shadow" : "text-stone-400 hover:text-white"}`}
            >
              <Store className="w-3.5 h-3.5" /> <span>Minorista</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentMode("wholesale")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${currentMode === "wholesale" ? "bg-blue-500 text-black font-bold shadow" : "text-stone-400 hover:text-white"}`}
            >
              <ShoppingBag className="w-3.5 h-3.5" /> <span>Mayorista</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentMode("combined")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${currentMode === "combined" ? "bg-orange-500 text-black font-bold shadow" : "text-stone-400 hover:text-white"}`}
            >
              <Layers className="w-3.5 h-3.5" /> <span>Ambos</span>
            </button>
          </div>

          <button type="button" onClick={() => handleExport("csv")} title="Exportar CSV" className="p-1.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-300 hover:text-orange-400 transition-all shadow-sm active:scale-95">
            <FileSpreadsheet className="w-4 h-4 text-orange-400" />
          </button>
          <button type="button" onClick={() => handleExport("pdf")} title="Exportar PDF" className="p-1.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-300 hover:text-orange-400 transition-all shadow-sm active:scale-95">
            <Printer className="w-4 h-4 text-orange-400" />
          </button>

          {publishAction ? (
            publishAction
          ) : (
            <button
              type="button"
              onClick={handlePublishToVentas}
              disabled={isPublishing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white transition-all text-xs font-mono font-medium shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Publicar catálogo y tarifas calculadas directamente a Ventas"
            >
              {isPublishing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <UploadCloud className="w-3.5 h-3.5" />
              )}
              <span>{isPublishing ? "Publicando..." : "Publicar en Ventas"}</span>
            </button>
          )}
        </div>
      </div>

      {publishBanner}

      {!publishBanner && publishMessage && (
        <div className="p-3 rounded-xl bg-stone-900 border border-orange-500/40 text-orange-300 text-xs font-mono animate-in fade-in">
          {publishMessage}
        </div>
      )}

      {toastMessage && (
        <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> <span>{toastMessage}</span>
        </div>
      )}

      {showFormulas && (
        <div className="p-3 bg-stone-900/60 border border-stone-800/80 rounded-xl text-xs font-mono text-stone-400 space-y-1 animate-in fade-in">
          <div className="text-stone-300 font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-500" /> <span>Fórmulas de Costeo</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] text-stone-400 pt-1">
            <div className="p-2 rounded-lg bg-stone-950/60 border border-stone-800/50">
              <span className="text-orange-400 font-bold block mb-0.5">1. Materiales</span>
              <span>Tela (m × Bs/m × (1+Merma)) + Insumos de receta.</span>
            </div>
            <div className="p-2 rounded-lg bg-stone-950/60 border border-stone-800/50">
              <span className="text-orange-400 font-bold block mb-0.5">2. Indirectos</span>
              <span>(Overhead / Capacidad) × Esfuerzo confección.</span>
            </div>
            <div className="p-2 rounded-lg bg-stone-950/60 border border-stone-800/50">
              <span className="text-orange-400 font-bold block mb-0.5">3. Venta</span>
              <span>Piso / (1 - Margen %).</span>
            </div>
          </div>
        </div>
      )}

      {/* TWO-COLUMN DECK: GARMENT SELECTOR + PRICING LADDER */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 overflow-hidden">
        {/* LEFT COLUMN: GARMENT SELECTOR */}
        <div className="lg:col-span-4 xl:col-span-3 flex flex-col bg-stone-900/60 border border-stone-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-2.5 border-b border-stone-800/80 bg-stone-950/60">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar prenda..."
                className="w-full pl-8 pr-3 py-1.5 bg-stone-900 border border-stone-800 rounded-xl text-xs text-white placeholder:text-stone-500 focus:outline-none focus:border-orange-500"
              />
            </div>
            <div className="flex justify-between items-center mt-2 px-1 text-[11px] font-mono text-stone-400">
              <span>{filteredProducts.length} prendas</span>
              <span className="text-orange-400">Clic para cotizar</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-stone-800/50 p-1.5 space-y-1">
            {filteredProducts.map((prod) => {
              const isSelected = activeProduct?.id === prod.id;
              const meters = prod.fabricQuantity || 0;
              const allowedCount = prod.allowedFabricIds?.length ?? fabricList.length;

              return (
                <button
                  key={prod.id}
                  type="button"
                  onClick={() => setSelectedProdId(prod.id)}
                  className={`w-full text-left p-3 rounded-xl transition-all cursor-pointer flex flex-col gap-1.5 border ${
                    isSelected ? "bg-orange-500/10 border-orange-500/60 shadow-md shadow-orange-500/5" : "bg-transparent border-transparent hover:bg-stone-800/40 hover:border-stone-800 text-stone-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-sm font-bold truncate ${isSelected ? "text-orange-400" : "text-stone-100"}`}>{prod.name}</span>
                    {isSelected && <Check className="w-4 h-4 text-orange-400 shrink-0" />}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-mono text-stone-400">
                    <span className="flex items-center gap-1"><Scissors className="w-3 h-3 text-stone-500" />{meters}m</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><Layers className="w-3 h-3 text-stone-500" />{allowedCount} telas</span>
                  </div>
                </button>
              );
            })}
            {filteredProducts.length === 0 && (
              <div className="text-center py-10 text-stone-500 text-xs font-mono">No hay prendas.</div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: RANKED PRICING LADDER */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col bg-stone-900/60 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
          {activeProduct ? (
            <>
              <div className="p-3 border-b border-stone-800 bg-stone-950/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black italic text-white tracking-tight">{activeProduct.name}</h3>
                    {editingMeters ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={tempMeters}
                          onWheel={(e) => e.currentTarget.blur()}
                          onChange={(e) => setTempMeters(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveMeters();
                            if (e.key === "Escape") setEditingMeters(false);
                          }}
                          className="w-14 px-1 py-0.5 text-xs bg-stone-900 border border-orange-500 rounded text-orange-300 font-mono focus:outline-none"
                          autoFocus
                        />
                        <button type="button" onClick={saveMeters} className="text-[10px] bg-orange-500 text-black px-1.5 py-0.5 rounded font-bold">OK</button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => { setTempMeters(String(activeProduct.fabricQuantity || 0)); setEditingMeters(true); }}
                        title="Clic para modificar consumo de tela"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-mono bg-stone-900 border border-stone-700 text-stone-300 hover:border-orange-500 hover:text-orange-400 cursor-pointer"
                      >
                        <Scissors className="w-3 h-3 text-orange-400" />
                        <span>{activeProduct.fabricQuantity || 0} m/prenda</span>
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-stone-400 font-mono mt-0.5">
                    {fabricLadder.length} telas habilitadas · {activeProduct.ingredients?.length || 0} insumos en receta
                  </p>
                </div>

                {priceRange && (
                  <div className="flex items-center gap-3 bg-stone-900/90 border border-stone-800 p-1.5 px-2.5 rounded-xl font-mono text-xs">
                    <div className="flex flex-col text-right">
                      <span className="text-[9px] uppercase font-bold text-stone-400">Rango Menudeo</span>
                      <span className="text-xs font-bold text-emerald-400">Bs {priceRange.minRetail.toFixed(0)} — Bs {priceRange.maxRetail.toFixed(0)}</span>
                    </div>
                    <div className="h-4 w-px bg-stone-800" />
                    <div className="flex flex-col text-right">
                      <span className="text-[9px] uppercase font-bold text-stone-400">Rango Mayorista</span>
                      <span className="text-xs font-bold text-blue-400">Bs {priceRange.minWholesale.toFixed(0)} — Bs {priceRange.maxWholesale.toFixed(0)}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 z-20 bg-stone-950/95 backdrop-blur-md text-stone-400 font-mono text-[11px] uppercase tracking-wider border-b border-stone-800 shadow-sm">
                    <tr>
                      <th className="py-2.5 px-4">Tela / Calidad</th>
                      <th className="py-2.5 px-3 w-28 text-right">Costo Tela</th>
                      <th className="py-2.5 px-3 w-28 text-right">Costo Piso</th>
                      <th className="py-2.5 px-3 w-36 text-center">
                        {currentMode === "wholesale" ? "Precio Mayorista" : currentMode === "retail" ? "Precio Minorista" : "Minorista / Mayorista"}
                      </th>
                      <th className="py-2.5 px-3 w-24 text-right">Margen</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-stone-800/60 font-mono">
                    {fabricLadder.map(({ fabric, cell, fabricCost }) => {
                      const isDefaultFabric = activeProduct?.defaultFabricId === fabric.id;
                      const marginVal = currentMode === "wholesale" ? cell.wholesaleMargin || 0 : cell.retailMargin || 0;

                      return (
                        <tr key={fabric.id} className="hover:bg-stone-800/30 transition-colors group">
                          <td className="py-2.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-sans font-bold text-sm text-stone-100 group-hover:text-orange-400 transition-colors">{fabric.name}</span>
                              {isDefaultFabric && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                  [★ Principal]
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-stone-400 mt-0.5">
                              Bs {fabric.pricePerUnit.toFixed(2)}/m
                              {Boolean(fabric.wastagePercentage) && <span className="text-stone-500 ml-1">(+{fabric.wastagePercentage}% merma)</span>}
                            </div>
                          </td>

                          <td className="py-2.5 px-3 text-right text-stone-300">Bs {fabricCost.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right text-stone-400">Bs {(cell.costFloor || 0).toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-center">
                            {currentMode === "retail" ? (
                              <span className="text-sm font-bold text-emerald-400">Bs {(cell.retailPrice || 0).toFixed(0)}</span>
                            ) : currentMode === "wholesale" ? (
                              <span className="text-sm font-bold text-blue-400">Bs {(cell.wholesalePrice || 0).toFixed(0)}</span>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-stone-950 border border-stone-800">
                                <span className="text-xs font-bold text-emerald-400">Bs {(cell.retailPrice || 0).toFixed(0)}</span>
                                <span className="text-stone-600">/</span>
                                <span className="text-xs font-bold text-blue-400">Bs {(cell.wholesalePrice || 0).toFixed(0)}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${marginVal >= 30 ? "text-emerald-400 bg-emerald-500/10" : "text-amber-400 bg-amber-500/10"}`}>
                              {marginVal.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-stone-500 text-sm font-mono">
              Selecciona una prenda de la lista izquierda para cotizar.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};