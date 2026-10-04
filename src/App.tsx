import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Menu,
} from "lucide-react";
import { GlobalConfig, Material, Product } from "./types";
import {
  getGlobalConfig,
  saveGlobalConfig,
  loginWithGoogle,
  logout,
  auth,
} from "./services/firebaseService";
import { subscribeProductMedia, ProductMedia } from "./services/productMediaService";
import { DEFAULT_GLOBAL_CONFIG } from "./data/defaultCatalog";
import { validateAndNormalizeGlobalConfig } from "./utils/validation";
import { onAuthStateChanged, User } from "firebase/auth";
import { cn } from "./lib/utils";
import { DashboardView } from "./components/views/DashboardView";
import { MaterialsView } from "./components/views/MaterialsView";
import { ProductsView } from "./components/views/ProductsView";
import { PricingMatrixView } from "./components/views/PricingMatrixView";
import { RegularPaymentsView } from "./components/views/RegularPaymentsView";
import { DailyExpensesView } from "./components/views/DailyExpensesView";
import { StaffView } from "./components/views/StaffView";
import { ProfitView } from "./components/views/ProfitView";
import { UsersView } from "./components/views/UsersView";
import { AccessoriesView } from "./components/views/AccessoriesView";
import { BackupModal } from "./components/modals/BackupModal";
import { SidebarNav, ViewState } from "./components/common/SidebarNav";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [config, setConfig] = useState<GlobalConfig>(() => {
    try {
      const localBackup = localStorage.getItem("azafran_backup_config");
      if (localBackup) {
        const parsed = JSON.parse(localBackup);
        if (
          parsed &&
          typeof parsed === "object" &&
          (Array.isArray(parsed.products) || Array.isArray(parsed.materials))
        ) {
          return validateAndNormalizeGlobalConfig(parsed, DEFAULT_GLOBAL_CONFIG);
        }
      }
    } catch {
      // Ignore
    }
    try {
      localStorage.setItem(
        "azafran_backup_config",
        JSON.stringify(DEFAULT_GLOBAL_CONFIG)
      );
    } catch {
      // Ignore
    }
    return DEFAULT_GLOBAL_CONFIG;
  });
  const [view, setView] = useState<ViewState>("dashboard");
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [feedback, setFeedback] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('azafran_sidebar_collapsed') === 'true';
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('azafran_sidebar_collapsed', String(next));
      return next;
    });
  };

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  useEffect(() => {
    const handleWheel = () => {
      if (
        document.activeElement instanceof HTMLInputElement &&
        document.activeElement.type === "number"
      ) {
        document.activeElement.blur();
      }
    };
    window.addEventListener("wheel", handleWheel, { passive: true });
    return () => window.removeEventListener("wheel", handleWheel);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return unsubscribe;
  }, []);

  const mediaMapRef = useRef<Record<string, ProductMedia>>({});

  const mergeProductsWithMedia = (
    products: Product[],
    mediaMap: Record<string, ProductMedia>
  ): Product[] => {
    return products.map((p) => {
      const media = mediaMap[p.id];
      if (media) {
        return {
          ...p,
          imageUrl: media.imageUrl !== undefined ? media.imageUrl : p.imageUrl,
          backImageUrl: media.backImageUrl !== undefined ? media.backImageUrl : p.backImageUrl,
        };
      }
      return p;
    });
  };

  useEffect(() => {
    if (user) {
      const unsubMedia = subscribeProductMedia((mediaMap) => {
        mediaMapRef.current = mediaMap;
        setConfig((prev) => ({
          ...prev,
          products: mergeProductsWithMedia(prev.products, mediaMap),
        }));
      });

      const unsub = getGlobalConfig((c) => {
        if (c) {
          let validated = validateAndNormalizeGlobalConfig(c, DEFAULT_GLOBAL_CONFIG);
          if (user && user.email) {
            const hasUser = validated.authorizedUsers?.some((u) => u.email === user.email);
            if (!hasUser) {
              validated = {
                ...validated,
                authorizedUsers: [
                  ...(validated.authorizedUsers || []),
                  {
                    id: `usr-${Date.now()}`,
                    email: user.email,
                    name: user.displayName || user.email.split("@")[0],
                    role: "admin",
                    status: "ACTIVO",
                    createdAt: new Date().toISOString().split("T")[0],
                  },
                ],
              };
              saveGlobalConfig(validated);
            }
          }
          const hydrated: GlobalConfig = {
            ...validated,
            products: mergeProductsWithMedia(validated.products, mediaMapRef.current),
          };
          setConfig(hydrated);
          try {
            localStorage.setItem("azafran_backup_config", JSON.stringify(hydrated));
          } catch {
            // Ignore
          }
        }
        setLoading(false);
      });
      return () => {
        unsubMedia();
        unsub();
      };
    } else {
      setLoading(false);
      setConfig(DEFAULT_GLOBAL_CONFIG);
    }
  }, [user]);

  const saveConfig = async (newConfig: GlobalConfig) => {
    setConfig(newConfig);
    try {
      localStorage.setItem("azafran_backup_config", JSON.stringify(newConfig));
    } catch {
      // Ignore
    }
    if (!user) return;
    setIsSaving(true);
    try {
      await saveGlobalConfig(newConfig);
    } catch (err: unknown) {
      console.error("Save config error:", err);
      const msg = err instanceof Error ? err.message : "Error al guardar en el servidor";
      setFeedback({ text: `Error al guardar: ${msg}`, type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestoreConfig = async (restored: GlobalConfig) => {
    await saveConfig(restored);
    const telasCount = restored.materials.filter(
      (m: Material) => m.category === "fabric"
    ).length;
    const insumosCount = restored.materials.filter(
      (m: Material) => m.category === "other"
    ).length;
    const accesoriosCount = restored.materials.filter(
      (m: Material) => m.category === "accessory" || m.category === "service"
    ).length;
    const productosCount = restored.products.length;

    setFeedback({
      text: `¡Catálogo restaurado y sincronizado con éxito! (${telasCount} telas, ${insumosCount} insumos, ${accesoriosCount} accesorios, ${productosCount} productos)`,
      type: "success",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center text-orange-500 font-mono">
        Cargando...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex flex-col items-center justify-center text-white px-4">
        <h1 className="text-4xl font-black text-orange-500 italic mb-6">
          Azafrán App
        </h1>
        <p className="text-stone-400 mb-8 max-w-sm text-center font-mono text-sm">
          Organiza los costos de fabricación al detalle.
        </p>
        <button
          onClick={loginWithGoogle}
          className="bg-orange-500 text-black px-8 py-4 rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-orange-400 transition-all flex items-center gap-3"
        >
          Iniciar Sesión con Google
        </button>
      </div>
    );
  }

  const renderActiveView = () => (
    <AnimatePresence mode="wait">
      <motion.div
        key={view}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className="w-full h-full"
      >
        {view === "dashboard" && <DashboardView config={config} />}
        {view === "pricingMatrix" && (
          <PricingMatrixView config={config} onChange={saveConfig} />
        )}
        {view === "fabrics" && (
          <MaterialsView
            mode="fabrics"
            config={config}
            onChange={saveConfig}
            onNotify={(text, type) => setFeedback({ text, type })}
            onNavigate={setView}
          />
        )}
        {view === "supplies" && (
          <MaterialsView
            mode="supplies"
            config={config}
            onChange={saveConfig}
            onNotify={(text, type) => setFeedback({ text, type })}
            onNavigate={setView}
          />
        )}
        {view === "products" && (
          <ProductsView
            config={config}
            onChange={saveConfig}
            onNotify={(text, type) => setFeedback({ text, type })}
          />
        )}
        {view === "accessories" && (
          <AccessoriesView
            config={config}
            onChange={saveConfig}
            onNotify={(text, type) => setFeedback({ text, type })}
          />
        )}
        {view === "regularPayments" && (
          <RegularPaymentsView
            config={config}
            onChange={saveConfig}
            onNotify={(text, type) => setFeedback({ text, type })}
          />
        )}
        {view === "dailyExpenses" && (
          <DailyExpensesView
            config={config}
            onChange={saveConfig}
            onNotify={(text, type) => setFeedback({ text, type })}
          />
        )}
        {view === "staff" && (
          <StaffView
            config={config}
            onChange={saveConfig}
            onNotify={(text, type) => setFeedback({ text, type })}
          />
        )}
        {view === "profit" && (
          <ProfitView
            config={config}
            onChange={saveConfig}
            onNotify={(text, type) => setFeedback({ text, type })}
          />
        )}
        {view === "users" && (
          <UsersView
            config={config}
            onChange={saveConfig}
            onNotify={(text, type) => setFeedback({ text, type })}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-stone-950 text-white select-none">
      {/* DESKTOP IN-FLOW SIDEBAR */}
      <aside
        className={cn(
          "hidden lg:flex flex-col justify-between shrink-0 h-full border-r border-stone-800 bg-stone-950/90 transition-all duration-300 z-20 overflow-x-hidden overflow-y-hidden",
          isSidebarCollapsed ? "w-16" : "w-64"
        )}
      >
        <SidebarNav
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebar}
          activeTab={view}
          setActiveTab={setView}
          user={user}
          onLogout={logout}
        />
      </aside>

      {/* MOBILE DRAWER */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className="relative flex flex-col w-64 h-full bg-stone-950 border-r border-stone-800 z-10 shadow-2xl overflow-x-hidden overflow-y-hidden">
            <SidebarNav
              isCollapsed={false}
              onToggleCollapse={() => setIsMobileMenuOpen(false)}
              activeTab={view}
              setActiveTab={(nextView) => {
                setView(nextView);
                setIsMobileMenuOpen(false);
              }}
              user={user}
              onLogout={logout}
            />
          </aside>
        </div>
      )}

      {/* MAIN CONTENT AREA - AUTOMATIC DYNAMIC FLOW */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Top Breadcrumb Bar */}
        <header className="h-12 border-b border-stone-800 bg-[#0c0a09]/90 backdrop-blur-md px-4 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-2 text-xs font-mono">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-1.5 -ml-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-900 transition-colors cursor-pointer"
              title="Abrir Menú"
            >
              <Menu className="w-4 h-4" />
            </button>
            <span className="text-stone-500">Azafrán Precios</span>
            <span className="text-stone-700">/</span>
            <span className="text-orange-400 font-bold uppercase tracking-wider">
              {view === "products"
                ? "TALLER DE PRENDAS"
                : view === "fabrics"
                ? "TELAS •"
                : view === "supplies"
                ? "INSUMOS •"
                : view}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {isSaving && <span className="text-orange-500 text-xs animate-pulse font-mono">Guardando...</span>}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Sincronizado</span>
            </div>
            <button
              type="button"
              onClick={() => setIsBackupOpen(true)}
              className="p-1.5 rounded-lg bg-stone-900 border border-stone-800 text-stone-300 hover:text-orange-400 transition-colors cursor-pointer"
              title="Copia de Seguridad"
            >
              <ShieldCheck className="w-4 h-4 text-orange-500" />
            </button>
          </div>
        </header>

        {feedback && (
          <div className="px-4 md:px-6 pt-4 shrink-0">
            <div
              className={cn(
                "p-3 rounded-xl text-xs font-mono flex items-center justify-between gap-3 border transition-all animate-in fade-in slide-in-from-top-2",
                feedback.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-red-500/10 border-red-500/30 text-red-300"
              )}
            >
              <div className="flex items-center gap-2">
                {feedback.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                )}
                <span>{feedback.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="text-stone-400 hover:text-white text-xs px-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Main Viewport: Automatically resizes and re-flows with sidebar width */}
        <main className="w-full h-full p-2 pt-1 flex-1 overflow-y-auto">
          {renderActiveView()}
        </main>
      </div>

      <BackupModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
        config={config}
        onRestore={handleRestoreConfig}
        isCloudConnected={Boolean(user) && (typeof navigator !== "undefined" ? navigator.onLine : true)}
      />
    </div>
  );
}
