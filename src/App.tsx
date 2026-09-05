import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Package,
  Scissors,
  Receipt,
  Coffee,
  Users,
  TrendingUp,
  LogOut,
  LayoutDashboard,
  Table,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Briefcase,
  ChevronDown,
} from "lucide-react";
import { GlobalConfig } from "./types";
import {
  getGlobalConfig,
  saveGlobalConfig,
  loginWithGoogle,
  logout,
  auth,
} from "./services/firebaseService";
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
import { BackupModal } from "./components/modals/BackupModal";

type ViewState =
  | "materials"
  | "products"
  | "pricingMatrix"
  | "regularPayments"
  | "dailyExpenses"
  | "staff"
  | "profit"
  | "dashboard";

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
  const [isFinanceOpen, setIsFinanceOpen] = useState(false);
  const [feedback, setFeedback] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const financeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        financeDropdownRef.current &&
        !financeDropdownRef.current.contains(e.target as Node)
      ) {
        setIsFinanceOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsFinanceOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (user) {
      const unsub = getGlobalConfig((c) => {
        if (c) {
          const validated = validateAndNormalizeGlobalConfig(c, DEFAULT_GLOBAL_CONFIG);
          setConfig(validated);
          try {
            localStorage.setItem(
              "azafran_backup_config",
              JSON.stringify(validated)
            );
          } catch {
            // Ignore
          }
        }
        setLoading(false);
      });
      return unsub;
    } else {
      setLoading(false);
      setConfig(DEFAULT_GLOBAL_CONFIG);
    }
  }, [user]);

  const saveConfig = async (newConfig: GlobalConfig) => {
    setConfig(newConfig);
    try {
      localStorage.setItem(
        "azafran_backup_config",
        JSON.stringify(newConfig)
      );
    } catch {
      // Ignore
    }
    if (!user) return; // Don't save to DB if logged out
    setIsSaving(true);
    await saveGlobalConfig(newConfig);
    setIsSaving(false);
  };

  const handleRestoreConfig = async (restored: GlobalConfig) => {
    await saveConfig(restored);
    setFeedback({
      text: `¡Catálogo restaurado y sincronizado con éxito! (${restored.products.length} productos, ${restored.materials.length} materiales)`,
      type: "success",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center text-orange-500 font-mono">
        Cargando...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center text-white px-4">
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

  const primaryTabs = [
    {
      id: "dashboard" as const,
      label: "Resumen",
      icon: LayoutDashboard,
    },
    {
      id: "pricingMatrix" as const,
      label: "Matriz de Precios",
      icon: Table,
    },
    { id: "materials" as const, label: "Materiales", icon: Package },
    { id: "products" as const, label: "Productos", icon: Scissors },
  ];

  const financeTabs = [
    {
      id: "regularPayments" as const,
      label: "Pagos Regulares",
      icon: Receipt,
    },
    {
      id: "dailyExpenses" as const,
      label: "Gastos Diarios",
      icon: Coffee,
    },
    { id: "staff" as const, label: "Planilla", icon: Users },
    {
      id: "profit" as const,
      label: "Rentabilidad",
      icon: TrendingUp,
    },
  ];

  const isFinanceActive = financeTabs.some((tab) => tab.id === view);

  return (
    <div className="min-h-screen bg-stone-950 text-white selection:bg-orange-500/30 w-full pb-32">
      {/* Top Header Navigation */}
      <header className="border-b border-stone-800 bg-stone-950/80 backdrop-blur-xl sticky top-0 z-50 overflow-visible">
        <div className="max-w-7xl mx-auto flex items-center justify-between p-4 overflow-visible">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center p-1 overflow-hidden shadow-[0_0_20px_rgba(255,255,255,0.2)]">
              <img
                src="/logo.png"
                alt="Azafrán Chefwear Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-black italic text-xl tracking-tight leading-none">
                Azafrán
              </h1>
              <p className="text-xs text-orange-500 font-mono uppercase tracking-[0.2em]">
                Data System
              </p>
            </div>
          </div>

          {/* Clean Left Side Navigation Tabs & Grouped Costos Dropdown */}
          <nav className="flex items-center gap-1.5 p-1 bg-stone-900 border border-stone-800 rounded-xl overflow-visible">
            {primaryTabs.map((tab) => {
              const isActive = view === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setView(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg font-mono text-xs uppercase tracking-wider whitespace-nowrap transition-all",
                    isActive
                      ? "bg-orange-500 text-black font-bold shadow-sm"
                      : "text-stone-400 hover:text-white hover:bg-stone-800"
                  )}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{tab.label}</span>
                </button>
              );
            })}

            {/* Grouped Costos & Finanzas Dropdown */}
            <div className="relative overflow-visible" ref={financeDropdownRef}>
              <button
                onClick={() => setIsFinanceOpen((prev) => !prev)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg font-mono text-xs uppercase tracking-wider whitespace-nowrap transition-all",
                  isFinanceActive
                    ? "bg-orange-500 text-black font-bold shadow-sm"
                    : "text-stone-400 hover:text-white hover:bg-stone-800"
                )}
                title="Costos & Finanzas"
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Costos & Finanzas</span>
                <ChevronDown
                  className={cn(
                    "w-3.5 h-3.5 transition-transform duration-200",
                    isFinanceOpen && "rotate-180"
                  )}
                />
              </button>

              {isFinanceOpen && (
                <div className="absolute top-full left-0 mt-2 w-52 bg-stone-900 border border-stone-800 rounded-xl shadow-2xl py-1.5 z-50 backdrop-blur-md animate-in fade-in zoom-in-95">
                  {financeTabs.map((tab) => {
                    const isChildActive = view === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setView(tab.id);
                          setIsFinanceOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-mono transition-colors text-left",
                          isChildActive
                            ? "bg-orange-500/15 text-orange-400 font-bold"
                            : "text-stone-300 hover:bg-stone-800 hover:text-white"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <tab.icon
                            className={cn(
                              "w-3.5 h-3.5",
                              isChildActive ? "text-orange-400" : "text-stone-400"
                            )}
                          />
                          <span>{tab.label}</span>
                        </div>
                        {isChildActive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>

          {/* Right Side Controls: Shield Button, User Avatar, Exit Icon */}
          <div className="flex items-center gap-3 shrink-0">
            {isSaving && (
              <span className="text-orange-500 text-xs animate-pulse font-mono hidden sm:inline">
                Guardando...
              </span>
            )}
            <button
              onClick={() => setIsBackupOpen(true)}
              title="Centro de Respaldo y Seguridad"
              className="p-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-300 hover:text-orange-400 hover:border-orange-500/40 transition-all text-xs font-mono shadow-sm active:scale-95"
            >
              <ShieldCheck className="w-4 h-4 text-orange-500" />
            </button>
            <div className="flex items-center gap-2.5 border-l border-stone-800 pl-3">
              <img
                src={user.photoURL || ""}
                alt="avatar"
                className="w-8 h-8 rounded-full border border-stone-700 object-cover"
              />
              <button
                onClick={logout}
                title="Cerrar Sesión"
                className="text-stone-500 hover:text-red-500 transition-colors p-1"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {feedback && (
        <div className="max-w-7xl mx-auto px-4 md:px-8 mt-3">
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
              onClick={() => setFeedback(null)}
              className="text-stone-400 hover:text-white text-xs px-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {view === "dashboard" && <DashboardView config={config} />}
            {view === "pricingMatrix" && (
              <PricingMatrixView config={config} onChange={saveConfig} />
            )}
            {view === "materials" && (
              <MaterialsView config={config} onChange={saveConfig} />
            )}
            {view === "products" && (
              <ProductsView config={config} onChange={saveConfig} />
            )}
            {view === "regularPayments" && (
              <RegularPaymentsView config={config} onChange={saveConfig} />
            )}
            {view === "dailyExpenses" && (
              <DailyExpensesView config={config} onChange={saveConfig} />
            )}
            {view === "staff" && (
              <StaffView config={config} onChange={saveConfig} />
            )}
            {view === "profit" && (
              <ProfitView config={config} onChange={saveConfig} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

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
