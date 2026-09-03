import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Package,
  Scissors,
  Receipt,
  Coffee,
  Users,
  AlertCircle,
  TrendingUp,
  Plus,
  Trash2,
  Save,
  X,
  LogOut,
  LayoutDashboard,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  GlobalConfig,
  Material,
  Product,
  Expense,
  DailyExpense,
  Staff,
  Unit,
  PaymentPeriod,
  ProductIngredient,
} from "./types";
import {
  getGlobalConfig,
  saveGlobalConfig,
  generateDefaultId,
  loginWithGoogle,
  logout,
  auth,
  DEFAULT_CONFIG,
} from "./services/firebaseService";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { cn } from "./lib/utils";

type ViewState =
  | "materials"
  | "products"
  | "regularPayments"
  | "dailyExpenses"
  | "staff"
  | "profit"
  | "dashboard";

function calculateMonthlyRegular(payments: Expense[]) {
  return payments.reduce((acc, p) => {
    let monthly = p.amount;
    switch (p.period) {
      case "weekly":
        monthly = p.amount * 4.33;
        break;
      case "fortnightly":
        monthly = p.amount * 2.16;
        break;
      case "monthly":
        monthly = p.amount;
        break;
      case "bimonthly":
        monthly = p.amount / 2;
        break;
      case "quarterly":
        monthly = p.amount / 3;
        break;
      case "semiannually":
        monthly = p.amount / 6;
        break;
      case "yearly":
        monthly = p.amount / 12;
        break;
    }
    return acc + monthly;
  }, 0);
}

function calculateMonthlyDaily(expenses: DailyExpense[]) {
  return expenses.reduce((acc, p) => acc + p.amount * 22, 0); // Assuming 22 working days/mo
}

function calculateMonthlyStaff(staff: Staff[]) {
  return staff.reduce((acc, s) => acc + s.monthlySalary * s.count, 0);
}

function calculateTotalOverhead(config: GlobalConfig) {
  return (
    calculateMonthlyRegular(config.regularPayments) +
    calculateMonthlyDaily(config.dailyExpenses) +
    calculateMonthlyStaff(config.staff)
  );
}

export function getMaterialCost(mat: Material | undefined, qty: number) {
  if (!mat) return 0;
  let multiplier = 1;
  if (mat.unit === "dozen") multiplier = 1 / 12;
  if (mat.unit === "100pack") multiplier = 1 / 100;
  const baseCost = mat.pricePerUnit * multiplier * qty;
  const wastage = mat.wastagePercentage || 0;
  return baseCost * (1 + wastage / 100);
}

export function calculateProductMaterialCost(
  prod: Product,
  materials: Material[],
  overrideFabricId?: string,
) {
  let cost = prod.ingredients.reduce((acc, current) => {
    const mat = materials.find((m) => m.id === current.materialId);
    if (mat?.category === "fabric") return acc; // Ignore any old fabric ingredients just in case
    return acc + getMaterialCost(mat, current.quantity);
  }, 0);

  const fabricId = overrideFabricId !== undefined ? overrideFabricId : prod.defaultFabricId;
  if (fabricId && prod.fabricQuantity) {
    const fabricMat = materials.find((m) => m.id === fabricId);
    cost += getMaterialCost(fabricMat, prod.fabricQuantity);
  }
  return cost;
}

export function calculateProductAnalysis(
  prod: Product,
  config: GlobalConfig,
  overrideFabricId?: string,
) {
  const totalOverhead = calculateTotalOverhead(config);
  const monthlyStaff = calculateMonthlyStaff(config.staff);
  const monthlyRegular = calculateMonthlyRegular(config.regularPayments);
  const monthlyDaily = calculateMonthlyDaily(config.dailyExpenses);
  const totalOverheadExcludingLabor = monthlyRegular + monthlyDaily;

  const laborAllocation =
    config.productionCapacity > 0
      ? monthlyStaff / config.productionCapacity
      : 0;
  const overheadAllocation =
    config.productionCapacity > 0
      ? totalOverheadExcludingLabor / config.productionCapacity
      : 0;

  const materialCost = calculateProductMaterialCost(
    prod,
    config.materials,
    overrideFabricId,
  );
  const costFloor = materialCost + laborAllocation + overheadAllocation;

  const appliedMargin =
    prod.profitMargin !== undefined ? prod.profitMargin : config.profitMargin;
  let divisor = 1 - appliedMargin / 100;
  if (divisor <= 0) divisor = 0.01;
  const recommendedPrice = costFloor / divisor;

  const profitPerUnit = recommendedPrice - costFloor;

  const contributionMargin = recommendedPrice - materialCost;
  const breakEvenUnits =
    contributionMargin > 0 ? totalOverhead / contributionMargin : 0;

  // Wholesale (Al por mayor)
  const appliedWholesaleMargin =
    prod.wholesaleMargin !== undefined
      ? prod.wholesaleMargin
      : (config.wholesaleMargin ?? 20);
  let wDivisor = 1 - appliedWholesaleMargin / 100;
  if (wDivisor <= 0) wDivisor = 0.01;
  const recommendedWholesalePrice = costFloor / wDivisor;
  const wholesaleProfitPerUnit = recommendedWholesalePrice - costFloor;

  const wholesaleContributionMargin = recommendedWholesalePrice - materialCost;
  const wholesaleBreakEvenUnits =
    wholesaleContributionMargin > 0
      ? totalOverhead / wholesaleContributionMargin
      : 0;

  return {
    materialCost,
    laborAllocation,
    overheadAllocation,
    costFloor,
    recommendedPrice,
    profitPerUnit,
    breakEvenUnits,
    appliedMargin,
    recommendedWholesalePrice,
    wholesaleProfitPerUnit,
    wholesaleBreakEvenUnits,
    appliedWholesaleMargin,
  };
}

function DashboardView({ config }: { config: GlobalConfig }) {
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const product = config.products.find((p) => p.id === selectedProductId) || config.products[0];
  const activeProductId = product?.id || "";
  const [overrideFabricId, setOverrideFabricId] = useState<string | null>(null);

  useEffect(() => {
    setOverrideFabricId(null);
  }, [activeProductId]);

  const activeFabricId = overrideFabricId !== null ? overrideFabricId : (product?.defaultFabricId || "");

  const [customRetailPrice, setCustomRetailPrice] = useState<string>("");
  const [customWholesalePrice, setCustomWholesalePrice] = useState<string>("");

  useEffect(() => {
    // Reset custom prices when product or fabric changes
    setCustomRetailPrice("");
    setCustomWholesalePrice("");
  }, [activeProductId, activeFabricId]);

  const data = useMemo(() => {
    if (!product) return [];
    const analysis = calculateProductAnalysis(
      product,
      config,
      activeFabricId,
    );
    return [
      { name: "Materiales", value: analysis.materialCost, color: "#fbbf24" },
      {
        name: "Mano de Obra",
        value: analysis.laborAllocation,
        color: "#f97316",
      },
      {
        name: "Gastos Fijos",
        value: analysis.overheadAllocation,
        color: "#f43f5e",
      },
      {
        name: "Ganancia (Menor)",
        value: analysis.profitPerUnit,
        color: "#3b82f6",
      },
    ];
  }, [product, config, activeFabricId]);

  if (config.products.length === 0) {
    return (
      <div className="text-center text-stone-500 mt-10">
        Aún no hay productos creados. Ve a la pestaña 'Productos' para crear
        uno.
      </div>
    );
  }

  const analysis = product
    ? calculateProductAnalysis(product, config, activeFabricId)
    : null;

  return (
    <div className="space-y-6">

      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black italic">Resumen Master</h2>
          <p className="text-stone-400 text-sm mt-1">
            Simula tu precio de venta final cambiando la tela.
          </p>
        </div>
      </div>

      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1">
            <label className="text-xs uppercase font-bold text-stone-500 tracking-widest block mb-2">
              Seleccionar Producto
            </label>
            <select
              value={activeProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full bg-stone-950 border border-stone-800 rounded-lg p-3 text-white font-bold focus:outline-none focus:border-orange-500"
            >
              {config.products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="text-xs uppercase font-bold text-emerald-500 tracking-widest block mb-2">
              Simular con Tela:
            </label>
            <select
              value={activeFabricId}
              onChange={(e) => setOverrideFabricId(e.target.value)}
              className="w-full bg-stone-950 border border-emerald-500/30 rounded-lg p-3 text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
            >
              <option value="">(Sin tela principal)</option>
              {config.materials
                .filter((m) => m.category === "fabric")
                .filter((m) => {
                  if (!product?.allowedFabricIds || product.allowedFabricIds.length === 0) return true;
                  return product.allowedFabricIds.includes(m.id);
                })
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
            </select>
            {(!product?.fabricQuantity || product.fabricQuantity <= 0) && activeFabricId !== "" && (
              <p className="text-orange-500 text-[10px] mt-2 font-bold uppercase tracking-widest flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Configura el consumo (m/un) en Productos para calcular el costo.
              </p>
            )}
          </div>
        </div>

        <div className="h-px bg-stone-800 w-full mb-8" />

        {product && analysis && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-stone-900 border border-stone-800 rounded-3xl p-6">
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={140}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={true}
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => `Bs ${value.toFixed(2)}`}
                    contentStyle={{
                      backgroundColor: "#0c0a09",
                      borderColor: "#292524",
                      borderRadius: "8px",
                    }}
                    itemStyle={{ color: "#fff" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex flex-col justify-center space-y-6">
              <div className="text-center">
                <h3 className="font-bold text-orange-500 text-sm uppercase tracking-widest mb-1">Calculadora de Margen</h3>
                <p className="text-stone-500 text-xs">Simula precios de venta y márgenes</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {/* D2C Card */}
                <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 text-center shadow-sm flex flex-col items-center">
                  <div className="text-stone-300 font-bold text-sm mb-4">Venta al por Menor</div>
                  
                  <div className="w-full mb-4">
                    <div className="text-stone-500 text-xs mb-1">Precio de Venta</div>
                    <input 
                      type="number"
                      value={customRetailPrice !== "" ? customRetailPrice : analysis.recommendedPrice.toFixed(2)}
                      onChange={(e) => setCustomRetailPrice(e.target.value)}
                      className="w-full text-center text-2xl font-bold text-white focus:outline-none focus:border-b-2 focus:border-orange-500 bg-transparent transition-colors"
                    />
                  </div>

                  {(() => {
                    const price = customRetailPrice !== "" ? parseFloat(customRetailPrice) : analysis.recommendedPrice;
                    const grossProfit = price - analysis.costFloor;
                    const profitMargin = price > 0 ? (grossProfit / price) * 100 : 0;
                    const isLoss = grossProfit < 0;

                    return (
                      <>
                        <div className="w-full mb-4 relative">
                          {isLoss && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap z-10">
                              VENDIENDO CON PÉRDIDA
                            </div>
                          )}
                          <div className="text-stone-500 text-xs mb-1">Ganancia Bruta</div>
                          <div className={`text-2xl font-bold ${isLoss ? 'text-red-400' : 'text-white'}`}>
                            {grossProfit.toFixed(2)}
                          </div>
                        </div>
                        
                        <div className="w-full pt-4 border-t border-stone-800">
                          <div className="text-stone-500 text-xs mb-1">Margen de Ganancia</div>
                          <div className={`text-lg font-bold ${isLoss ? 'text-red-400' : 'text-emerald-400'}`}>
                            {profitMargin.toFixed(1)}%
                          </div>
                        </div>
                      </>
                    )
                  })()}
                </div>

                {/* B2B Card */}
                <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 text-center shadow-sm flex flex-col items-center">
                  <div className="text-stone-300 font-bold text-sm mb-4">Mayorista</div>
                  
                  <div className="w-full mb-4">
                    <div className="text-stone-500 text-xs mb-1">Precio de Venta</div>
                    <input 
                      type="number"
                      value={customWholesalePrice !== "" ? customWholesalePrice : analysis.recommendedWholesalePrice.toFixed(2)}
                      onChange={(e) => setCustomWholesalePrice(e.target.value)}
                      className="w-full text-center text-2xl font-bold text-white focus:outline-none focus:border-b-2 focus:border-orange-500 bg-transparent transition-colors"
                    />
                  </div>

                  {(() => {
                    const price = customWholesalePrice !== "" ? parseFloat(customWholesalePrice) : analysis.recommendedWholesalePrice;
                    const grossProfit = price - analysis.costFloor;
                    const profitMargin = price > 0 ? (grossProfit / price) * 100 : 0;
                    const isLoss = grossProfit < 0;

                    return (
                      <>
                        <div className="w-full mb-4 relative">
                          {isLoss && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg whitespace-nowrap z-10">
                              VENDIENDO CON PÉRDIDA
                            </div>
                          )}
                          <div className="text-stone-500 text-xs mb-1">Ganancia Bruta</div>
                          <div className={`text-2xl font-bold ${isLoss ? 'text-red-400' : 'text-white'}`}>
                            {grossProfit.toFixed(2)}
                          </div>
                        </div>
                        
                        <div className="w-full pt-4 border-t border-stone-800">
                          <div className="text-stone-500 text-xs mb-1">Margen de Ganancia</div>
                          <div className={`text-lg font-bold ${isLoss ? 'text-red-400' : 'text-emerald-400'}`}>
                            {profitMargin.toFixed(1)}%
                          </div>
                        </div>
                      </>
                    )
                  })()}
                </div>
              </div>

              <div className="space-y-4 max-w-sm mx-auto w-full mt-4">
                {data.map((item, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center bg-stone-950 p-3 rounded-xl border border-stone-800"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <span className="font-bold text-sm text-stone-300">
                        {item.name}
                      </span>
                    </div>
                    <span className="font-mono text-white font-bold">
                      Bs {item.value.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [config, setConfig] = useState<GlobalConfig>(DEFAULT_CONFIG);
  const [view, setView] = useState<ViewState>("dashboard");
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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
          // Merge defaults if config is missing some arrays to avoid crashes
          
          // Migrate materials: move everything in 'other' to 'accessory' EXCEPT specific ones
                    const migratedMaterials = (c.materials || DEFAULT_CONFIG.materials).map(m => {
            const cat = m.category || 'other';
            if (cat === 'other') {
              const nameLower = m.name.toLowerCase();
              const isExcluded = nameLower.includes('hilo') || nameLower.includes('broches') || nameLower.includes('hebillas plástico (s)');
              if (!isExcluded) {
                return { ...m, category: 'accessory' };
              } else {
                return { ...m, category: 'other' };
              }
            }
            return m;
          });

          setConfig({
            ...DEFAULT_CONFIG,
            ...c,
            materials: migratedMaterials,
            products: c.products || DEFAULT_CONFIG.products,
            regularPayments:
              c.regularPayments || DEFAULT_CONFIG.regularPayments,
            dailyExpenses: c.dailyExpenses || DEFAULT_CONFIG.dailyExpenses,
            staff: c.staff || DEFAULT_CONFIG.staff,
          });
        }
        setLoading(false);
      });
      return unsub;
    } else {
      setLoading(false);
      setConfig(DEFAULT_CONFIG);
    }
  }, [user]);

  const saveConfig = async (newConfig: GlobalConfig) => {
    setConfig(newConfig);
    if (!user) return; // Don't save to DB if logged out
    setIsSaving(true);
    await saveGlobalConfig(newConfig);
    setIsSaving(false);
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

  return (
    <div className="min-h-screen bg-stone-950 text-white selection:bg-orange-500/30 w-full overflow-x-hidden pb-32">
      <header className="border-b border-stone-800 bg-stone-950/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
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

          <div className="flex gap-2 p-1 bg-stone-900 border border-stone-800 rounded-xl overflow-x-auto max-w-[60vw] hide-scrollbar">
            {[
              {
                id: "dashboard" as const,
                label: "Resumen",
                icon: LayoutDashboard,
              },
              { id: "materials" as const, label: "Materiales", icon: Package },
              { id: "products" as const, label: "Productos", icon: Scissors },
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
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setView(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg font-mono text-xs uppercase tracking-wider whitespace-nowrap transition-all",
                  view === tab.id
                    ? "bg-orange-500 text-black font-bold"
                    : "text-stone-400 hover:text-white hover:bg-stone-800",
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            {isSaving && (
              <span className="text-orange-500 text-xs animate-pulse font-mono hidden sm:inline">
                Guardando...
              </span>
            )}
            <div className="flex items-center gap-3 border-l border-stone-800 pl-4">
              <img
                src={user.photoURL || ""}
                alt="avatar"
                className="w-8 h-8 rounded-full border border-stone-700"
              />
              <button
                onClick={logout}
                className="text-stone-500 hover:text-red-500 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

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
    </div>
  );
}

// ----------------------------------------------------------------------------
// MATERIALS VIEW
// ----------------------------------------------------------------------------
function MaterialsView({
  config,
  onChange,
}: {
  config: GlobalConfig;
  onChange: (c: GlobalConfig) => void;
}) {
  const units: Unit[] = ["m", "100pack", "dozen", "unit", "spool", "service"];

  const addMaterial = (category: "fabric" | "other" | "accessory" = "other") => {
    onChange({
      ...config,
      materials: [
        {
          id: generateDefaultId(),
          name: "Nuevo Material",
          category,
          unit: category === "fabric" ? "m" : "unit",
          pricePerUnit: 0,
        },
        ...config.materials,
      ],
    });
  };

  const removeMaterial = (id: string) => {
    // Also remove from any product ingredients referring to it
    const newProducts = config.products.map((p) => ({
      ...p,
      ingredients: p.ingredients.filter((i) => i.materialId !== id),
    }));

    onChange({
      ...config,
      products: newProducts,
      materials: config.materials.filter((m) => m.id !== id),
    });
  };

  const updateMaterial = (id: string, updates: Partial<Material>) => {
    onChange({
      ...config,
      materials: config.materials.map((m) =>
        m.id === id ? { ...m, ...updates } : m,
      ),
    });
  };

  return (
    <div className="space-y-10">
      {/* FABRICS SECTION */}
      <div className="space-y-6">
        <div className="flex justify-between items-end border-b border-stone-800 pb-4">
          <div>
            <h2 className="text-2xl font-black italic">Telas Principales</h2>
            <p className="text-stone-400 text-sm mt-1">
              Registra la forma de compra y precio de tus telas.
            </p>
          </div>
          <button
            onClick={() => addMaterial("fabric")}
            className="bg-orange-500/10 text-orange-500 border border-orange-500/30 px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-orange-500/20 font-mono text-xs uppercase tracking-widest font-bold"
          >
            <Plus className="w-3 h-3" /> Agregar Tela
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {config.materials
            .filter((m) => m.category === "fabric")
            .map((mat) => (
              <div
                key={mat.id}
                className="bg-stone-900 border border-stone-800 p-4 rounded-2xl flex flex-col gap-3 group relative"
              >
                <button
                  onClick={() => removeMaterial(mat.id)}
                  className="absolute top-4 right-4 text-stone-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <input
                  value={mat.name}
                  onChange={(e) =>
                    updateMaterial(mat.id, { name: e.target.value })
                  }
                  className="bg-transparent text-white font-bold text-lg border-b border-transparent hover:border-stone-700 focus:border-orange-500 focus:outline-none w-[90%]"
                />
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase font-bold tracking-widest text-stone-500">
                      Unidad
                    </label>
                    <select
                      value={mat.unit}
                      onChange={(e) =>
                        updateMaterial(mat.id, { unit: e.target.value as Unit })
                      }
                      className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2 text-xs font-mono text-orange-400 focus:outline-none"
                    >
                      <option value="m">Metro</option>
                      <option value="100pack">Ciento</option>
                      <option value="dozen">Docena</option>
                      <option value="unit">Unidad</option>
                      <option value="spool">Cono</option>
                      <option value="service">Servicio</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase font-bold tracking-widest text-stone-500">
                      Costo (Bs)
                    </label>
                    <input
                      type="number"
                      value={mat.pricePerUnit}
                      onChange={(e) =>
                        updateMaterial(mat.id, {
                          pricePerUnit: Number(e.target.value),
                        })
                      }
                      className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2 text-xs font-mono text-amber-400 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label
                      className="text-[11px] uppercase font-bold tracking-widest text-stone-500"
                      title="Porcentaje de merma"
                    >
                      Merma (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={mat.wastagePercentage || 0}
                      onChange={(e) =>
                        updateMaterial(mat.id, {
                          wastagePercentage: Number(e.target.value),
                        })
                      }
                      className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2 text-xs font-mono text-red-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* OTHER INGREDIENTS SECTION */}
      <div className="space-y-6">
        <div className="flex justify-between items-end border-b border-stone-800 pb-4">
          <div>
            <h2 className="text-2xl font-black italic uppercase">Insumos</h2>
            <p className="text-stone-400 text-sm mt-1">
              Registra hilos, broches, hebillas de plástico (s).
            </p>
          </div>
          <button
            onClick={() => addMaterial("other")}
            className="bg-orange-500/10 text-orange-500 border border-orange-500/30 px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-orange-500/20 font-mono text-xs uppercase tracking-widest font-bold"
          >
            <Plus className="w-3 h-3" /> Agregar Insumo
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {config.materials
            .filter((m) => m.category === "other")
            .map((mat) => (
              <div
                key={mat.id}
                className="bg-stone-900 border border-stone-800 p-4 rounded-2xl flex flex-col gap-3 group relative"
              >
                <button
                  onClick={() => removeMaterial(mat.id)}
                  className="absolute top-4 right-4 text-stone-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <input
                  value={mat.name}
                  onChange={(e) =>
                    updateMaterial(mat.id, { name: e.target.value })
                  }
                  className="bg-transparent text-white font-bold text-lg border-b border-transparent hover:border-stone-700 focus:border-orange-500 focus:outline-none w-[90%]"
                />
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase font-bold tracking-widest text-stone-500">
                      Unidad
                    </label>
                    <select
                      value={mat.unit}
                      onChange={(e) =>
                        updateMaterial(mat.id, { unit: e.target.value as Unit })
                      }
                      className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2 text-xs font-mono text-orange-400 focus:outline-none"
                    >
                      <option value="m">Metro</option>
                      <option value="100pack">Ciento</option>
                      <option value="dozen">Docena</option>
                      <option value="unit">Unidad</option>
                      <option value="spool">Cono</option>
                      <option value="service">Servicio</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase font-bold tracking-widest text-stone-500">
                      Costo (Bs)
                    </label>
                    <input
                      type="number"
                      value={mat.pricePerUnit}
                      onChange={(e) =>
                        updateMaterial(mat.id, {
                          pricePerUnit: Number(e.target.value),
                        })
                      }
                      className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2 text-xs font-mono text-amber-400 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label
                      className="text-[11px] uppercase font-bold tracking-widest text-stone-500"
                      title="Porcentaje de merma"
                    >
                      Merma (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={mat.wastagePercentage || 0}
                      onChange={(e) =>
                        updateMaterial(mat.id, {
                          wastagePercentage: Number(e.target.value),
                        })
                      }
                      className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2 text-xs font-mono text-red-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// PRODUCTS VIEW
// ----------------------------------------------------------------------------
function ProductsView({
  config,
  onChange,
}: {
  config: GlobalConfig;
  onChange: (c: GlobalConfig) => void;
}) {
  const [activeTab, setActiveTab] = useState<'products' | 'accessories'>('products');
  const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>({});

  const [expandedBreakdown, setExpandedBreakdown] = useState<
    Record<string, boolean>
  >({});
  const [expandedTable, setExpandedTable] = useState<Record<string, boolean>>(
    {},
  );

  const toggleBreakdown = (id: string) => {
    setExpandedBreakdown((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleTable = (id: string) => {
    setExpandedTable((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const addProduct = () => {
    onChange({
      ...config,
      products: [
        {
          id: generateDefaultId(),
          name: "Nuevo Producto",
          ingredients: [],
        },
        ...config.products,
      ],
    });
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    onChange({
      ...config,
      products: config.products.map((p) =>
        p.id === id ? { ...p, ...updates } : p,
      ),
    });
  };

  const removeProduct = (id: string) => {
    onChange({
      ...config,
      products: config.products.filter((p) => p.id !== id),
    });
  };

  const toggleProduct = (id: string) => {
    setExpandedProducts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const addMaterial = (category: "fabric" | "other" | "accessory") => {
    onChange({
      ...config,
      materials: [
        {
          id: generateDefaultId(),
          name: "Nuevo",
          category,
          unit: "m",
          pricePerUnit: 0,
        },
        ...config.materials,
      ],
    });
  };

  const updateMaterial = (id: string, updates: Partial<Material>) => {
    onChange({
      ...config,
      materials: config.materials.map((m) =>
        m.id === id ? { ...m, ...updates } : m,
      ),
    });
  };

  const removeMaterial = (id: string) => {
    onChange({
      ...config,
      materials: config.materials.filter((m) => m.id !== id),
    });
  };

  const addIngredient = (productId: string, category: "fabric" | "other" | "accessory" = "other") => {
    const prod = config.products.find((p) => p.id === productId);
    if (!prod) return;

    // Default to the first available material of that category
    const available = config.materials.filter((m) => {
      if (category === "fabric") return m.category === "fabric";
      if (category === "other") return m.category === "other";
      return m.category === "accessory";
    });

    if (available.length === 0) {
      alert("Primero registra materiales de esta categoría en la pestaña Materiales");
      return;
    }

    const newIng: ProductIngredient = {
      materialId: available[0].id,
      quantity: 1,
    };

    updateProduct(productId, {
      ingredients: [...prod.ingredients, newIng],
    });
  };

  const updateIngredient = (
    productId: string,
    index: number,
    updates: Partial<ProductIngredient>,
  ) => {
    const prod = config.products.find((p) => p.id === productId);
    if (!prod) return;
    const newIngredients = [...prod.ingredients];
    newIngredients[index] = { ...newIngredients[index], ...updates };
    updateProduct(productId, { ingredients: newIngredients });
  };

  const removeIngredient = (productId: string, index: number) => {
    const prod = config.products.find((p) => p.id === productId);
    if (!prod) return;
    const newIngredients = [...prod.ingredients];
    newIngredients.splice(index, 1);
    updateProduct(productId, { ingredients: newIngredients });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col space-y-4 border-b border-stone-800 pb-4">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-black italic text-white">
              Catálogo de Productos
            </h2>
            <p className="text-stone-400 mt-2 max-w-2xl text-sm">
              Diseña tus recetas de confección y administra accesorios.
            </p>
          </div>
          {activeTab === 'products' ? (
            <button
              onClick={addProduct}
              className="bg-orange-500 text-black px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-orange-400 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Nuevo Producto
            </button>
          ) : (
            <button
              onClick={() => addMaterial('accessory')}
              className="bg-orange-500 text-black px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-orange-400 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Agregar Accesorio
            </button>
          )}
        </div>
        
        <div className="flex gap-6 mt-4">
          <button 
            onClick={() => setActiveTab('products')}
            className={`px-2 py-2 font-bold uppercase text-sm tracking-widest border-b-2 transition-colors ${activeTab === 'products' ? 'border-orange-500 text-orange-500' : 'border-transparent text-stone-500 hover:text-stone-300'}`}
          >
            Productos
          </button>
          <button 
            onClick={() => setActiveTab('accessories')}
            className={`px-2 py-2 font-bold uppercase text-sm tracking-widest border-b-2 transition-colors ${activeTab === 'accessories' ? 'border-orange-500 text-orange-500' : 'border-transparent text-stone-500 hover:text-stone-300'}`}
          >
            Accesorios
          </button>
        </div>
      </div>

      {activeTab === 'products' && (
        <div className="space-y-6">
        {config.products.map((prod) => {
          return (
            <div
              key={prod.id}
              className="bg-stone-900 border border-stone-800 rounded-3xl relative group overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />

              <div className="relative z-10">
                {/* Collapsible Header */}
                <div 
                  className="flex justify-between items-center p-6 cursor-pointer hover:bg-stone-800/30 transition-colors"
                  onClick={() => toggleProduct(prod.id)}
                >
                  <div className="flex-1" onClick={(e) => e.stopPropagation()}>
                    <input
                      value={prod.name}
                      onChange={(e) => updateProduct(prod.id, { name: e.target.value })}
                      className="bg-transparent text-white font-black italic text-3xl border-b-2 border-transparent hover:border-stone-700 focus:border-orange-500 focus:outline-none w-full max-w-md"
                      placeholder="Nombre del Producto"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={(e) => { e.stopPropagation(); removeProduct(prod.id); }}
                      className="text-stone-600 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Eliminar producto"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <button className="text-stone-500">
                      {expandedProducts[prod.id] ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
                    </button>
                  </div>
                </div>
                
                <AnimatePresence>
                  {expandedProducts[prod.id] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-6 pt-0 space-y-8">
                  {/* FABRICS SECTION */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-stone-800 pb-2">
                      <div>
                        <h4 className="font-bold text-orange-500 text-sm">
                          Consumo de Tela Base
                        </h4>
                        <p className="text-[10px] text-stone-500 uppercase tracking-widest mt-1">
                          Cantidad necesaria por prenda
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4 items-center bg-stone-950 p-4 rounded-2xl border border-stone-800">
                      <div className="flex-1 min-w-[200px]">
                        <label className="text-[11px] uppercase font-bold text-stone-500 block mb-1">
                          Tela Principal
                        </label>
                        <select
                          value={prod.defaultFabricId || ""}
                          onChange={(e) =>
                            updateProduct(prod.id, {
                              defaultFabricId: e.target.value,
                            })
                          }
                          className="w-full bg-stone-900 border border-stone-700 rounded-lg p-2 text-sm text-white focus:outline-none"
                        >
                          <option value="">Seleccionar Tela...</option>
                          {config.materials
                            .filter((m) => m.category === "fabric")
                            .map((mat) => (
                              <option key={mat.id} value={mat.id}>
                                {mat.name} (Bs {mat.pricePerUnit}/{mat.unit})
                              </option>
                            ))}
                        </select>
                      </div>
                      <div className="flex-1 min-w-[200px]">
                        <label className="text-[11px] uppercase font-bold text-stone-500 block mb-1">
                          Metros por unidad
                        </label>
                        <input
                          type="number"
                          value={prod.fabricQuantity || 0}
                          onChange={(e) =>
                            updateProduct(prod.id, {
                              fabricQuantity: Number(e.target.value),
                            })
                          }
                          className="w-full bg-stone-900 border border-stone-700 rounded-lg p-2 text-sm font-mono text-orange-400 focus:outline-none"
                        />
                      </div>
                      <div className="flex-1 min-w-[200px]">
                        <label className="text-[11px] uppercase font-bold text-stone-500 block mb-1">
                          Telas Permitidas
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {config.materials
                            .filter((m) => m.category === "fabric")
                            .map((mat) => {
                              const isAllowed = prod.allowedFabricIds
                                ? prod.allowedFabricIds.includes(mat.id)
                                : true; // Si no hay array, permitimos todas por defecto
                              return (
                                <button
                                  key={mat.id}
                                  onClick={() => {
                                    let newIds = prod.allowedFabricIds || config.materials.filter((m) => m.category === "fabric").map((m) => m.id);
                                    if (isAllowed) {
                                      newIds = newIds.filter((id) => id !== mat.id);
                                    } else {
                                      newIds = [...newIds, mat.id];
                                    }
                                    updateProduct(prod.id, { allowedFabricIds: newIds });
                                  }}
                                  className={cn(
                                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all",
                                    isAllowed
                                      ? "bg-orange-500/20 border-orange-500 text-orange-400"
                                      : "bg-stone-900 border-stone-700 text-stone-500 hover:border-stone-500",
                                  )}
                                >
                                  {mat.name}
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    </div>
                    <div className="bg-orange-500/5 border border-orange-500/20 p-3 rounded-lg flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-orange-400/80 leading-relaxed">
                        El costo de la tela se calculará dinámicamente en la
                        Tabla Comparativa (abajo) y en el Simulador del
                        Dashboard.
                      </p>
                    </div>
                  </div>

                {/* OTHER INGREDIENTS SECTION */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-stone-800 pb-2">
                    <h4 className="font-bold text-orange-500 text-sm uppercase">Insumos</h4>
                    <button
                      onClick={() => addIngredient(prod.id, "other")}
                      className="text-orange-500 hover:text-orange-400 bg-orange-500/10 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                    >
                      + Añadir Insumo
                    </button>
                  </div>
                  {prod.ingredients.filter((ing) => {
                    const m = config.materials.find((mat) => mat.id === ing.materialId);
                    return m?.category === "other";
                  }).length === 0 && (
                    <p className="text-stone-500 text-sm text-center py-2 italic">Sin insumos registrados.</p>
                  )}
                  <div className="space-y-2">
                    {prod.ingredients.map((ing, i) => {
                      const m = config.materials.find((mat) => mat.id === ing.materialId);
                      if (m?.category !== "other") return null;
                      const availableMaterials = config.materials.filter((mat) => mat.category === "other");
                      const mat = config.materials.find((m) => m.id === ing.materialId);
                      const cost = getMaterialCost(mat, ing.quantity);
                      let qtyLabel = "Cantidad";
                      if (mat) {
                        if (mat.unit === "dozen" || mat.unit === "100pack" || mat.unit === "unit") qtyLabel = "Unidades";
                        else if (mat.unit === "m") qtyLabel = "Metros";
                        else if (mat.unit === "spool") qtyLabel = "Conos";
                        else if (mat.unit === "service") qtyLabel = "Cant.";
                      }
                      return (
                        <div key={i} className="flex flex-wrap sm:flex-nowrap items-center gap-3 bg-stone-950 p-2 pl-4 rounded-xl border border-stone-800">
                          <div className="flex-1 min-w-[180px]">
                            <select
                              value={ing.materialId}
                              onChange={(e) => updateIngredient(prod.id, i, { materialId: e.target.value })}
                              className="w-full bg-stone-900 border border-stone-700 rounded-lg p-2 text-sm text-white focus:outline-none"
                            >
                              {availableMaterials.map((m) => (
                                <option key={m.id} value={m.id}>{m.name} (Bs {m.pricePerUnit} / {m.unit})</option>
                              ))}
                            </select>
                          </div>
                          <div className="w-24 shrink-0">
                            <label className="text-[11px] uppercase font-bold text-stone-500 block mb-0.5">{qtyLabel}</label>
                            <input
                              type="number"
                              value={ing.quantity}
                              onChange={(e) => updateIngredient(prod.id, i, { quantity: Number(e.target.value) })}
                              className="w-full bg-stone-900 border border-stone-700 rounded-lg p-2 text-sm font-mono text-orange-400 focus:outline-none text-right"
                            />
                          </div>
                          <div className="w-24 shrink-0 text-right pr-2">
                            <div className="text-[11px] uppercase font-bold text-stone-500 mb-0.5">Suma al costo</div>
                            <div className="font-mono text-sm text-amber-400 font-bold">Bs {cost.toFixed(2)}</div>
                          </div>
                          <button onClick={() => removeIngredient(prod.id, i)} className="text-stone-600 hover:text-red-500 p-2">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>



                {/* TABLA COMPARATIVA DE TELAS */}
                <div className="mt-8 bg-stone-950 rounded-2xl border border-stone-800 overflow-hidden">
                  <button
                    onClick={() => toggleTable(prod.id)}
                    className="w-full flex justify-between items-center p-4 px-6 hover:bg-stone-800/50 transition-colors"
                  >
                    <h4 className="font-bold text-emerald-500 text-sm uppercase tracking-widest">
                      Precios Finales por Tela
                    </h4>
                    {expandedTable[prod.id] ? (
                      <ChevronUp className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-emerald-500" />
                    )}
                  </button>

                  <AnimatePresence>
                    {expandedTable[prod.id] && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-6 pt-2 border-t border-stone-800/50">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-sm">
                              <thead>
                                <tr className="border-b border-stone-800 text-stone-500 font-mono text-[10px] uppercase tracking-widest">
                                  <th className="pb-2 font-bold min-w-[120px]">
                                    Variante (Tela)
                                  </th>
                                  <th className="pb-2 font-bold text-right min-w-[80px]">
                                    Costo Total
                                  </th>
                                  <th className="pb-2 font-bold text-right text-orange-400 min-w-[100px]">
                                    Precio Menor
                                  </th>
                                  <th className="pb-2 font-bold text-right text-emerald-400 min-w-[100px]">
                                    Precio Mayor
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {config.materials
                                  .filter((m) => m.category === "fabric")
                                  .map((fabric) => {
                                    const fAnalysis = calculateProductAnalysis(
                                      prod,
                                      config,
                                      fabric.id,
                                    );
                                    return (
                                      <tr
                                        key={fabric.id}
                                        className="border-b border-stone-800/50 hover:bg-stone-800/20"
                                      >
                                        <td className="py-3 text-white font-bold">
                                          {fabric.name}
                                        </td>
                                        <td className="py-3 font-mono text-right text-stone-400">
                                          Bs {fAnalysis.costFloor.toFixed(2)}
                                        </td>
                                        <td className="py-3 font-mono text-right text-orange-400 font-bold">
                                          Bs{" "}
                                          {fAnalysis.recommendedPrice.toFixed(
                                            2,
                                          )}
                                        </td>
                                        <td className="py-3 font-mono text-right text-emerald-400 font-bold">
                                          Bs{" "}
                                          {fAnalysis.recommendedWholesalePrice.toFixed(
                                            2,
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>
      )}
      
      {activeTab === 'accessories' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in duration-300">
          {config.materials
            .filter((m) => m.category === "accessory")
            .map((mat) => (
              <div
                key={mat.id}
                className="bg-stone-900 border border-stone-800 p-4 rounded-2xl flex flex-col gap-3 group relative"
              >
                <button
                  onClick={() => removeMaterial(mat.id)}
                  className="absolute top-4 right-4 text-stone-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <input
                  value={mat.name}
                  onChange={(e) =>
                    updateMaterial(mat.id, { name: e.target.value })
                  }
                  className="bg-transparent text-white font-bold text-lg border-b border-transparent hover:border-stone-700 focus:border-orange-500 focus:outline-none w-[90%]"
                />
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase font-bold tracking-widest text-stone-500">
                      Unidad
                    </label>
                    <select
                      value={mat.unit}
                      onChange={(e) =>
                        updateMaterial(mat.id, { unit: e.target.value as Unit })
                      }
                      className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2 text-sm text-white focus:outline-none"
                    >
                      <option value="unit">Unidad</option>
                      <option value="100pack">Ciento</option>
                      <option value="dozen">Docena</option>
                      <option value="m">Metros</option>
                      <option value="spool">Cono</option>
                      <option value="service">Servicio</option>
                    </select>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="text-[11px] uppercase font-bold tracking-widest text-stone-500">
                      Costo Unit. (Bs)
                    </label>
                    <input
                      type="number"
                      value={mat.pricePerUnit}
                      onChange={(e) =>
                        updateMaterial(mat.id, {
                          pricePerUnit: Number(e.target.value),
                        })
                      }
                      className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2 text-sm font-mono text-orange-400 focus:outline-none text-right"
                    />
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// REGULAR PAYMENTS VIEW
// ----------------------------------------------------------------------------
function RegularPaymentsView({
  config,
  onChange,
}: {
  config: GlobalConfig;
  onChange: (c: GlobalConfig) => void;
}) {
  const addPayment = () => {
    onChange({
      ...config,
      regularPayments: [
        {
          id: generateDefaultId(),
          name: "Nuevo Pago",
          amount: 0,
          period: "monthly",
        },
        ...config.regularPayments,
      ],
    });
  };

  const removePayment = (id: string) => {
    onChange({
      ...config,
      regularPayments: config.regularPayments.filter((p) => p.id !== id),
    });
  };

  const updatePayment = (id: string, updates: Partial<Expense>) => {
    onChange({
      ...config,
      regularPayments: config.regularPayments.map((p) =>
        p.id === id ? { ...p, ...updates } : p,
      ),
    });
  };

  const totalMonthly = calculateMonthlyRegular(config.regularPayments);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-2xl font-black italic">Pagos Regulares</h2>
          <p className="text-stone-400 text-sm mt-1">
            Suscripciones, alquileres, luz, agua, etc.
          </p>
        </div>
        <div className="bg-stone-900 border border-stone-800 px-6 py-4 rounded-2xl flex items-center gap-6">
          <div className="text-xs uppercase font-bold text-stone-500 tracking-widest">
            Total Gasto Mensual
            <br />
            Regular
          </div>
          <div className="text-3xl font-mono text-red-400 font-bold">
            Bs {totalMonthly.toFixed(2)}
          </div>
        </div>
      </div>

      <button
        onClick={addPayment}
        className="w-full sm:w-auto bg-orange-500/10 text-orange-500 border border-orange-500/30 px-6 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-orange-500/20 font-mono text-xs uppercase tracking-widest font-bold"
      >
        <Plus className="w-4 h-4" /> Añadir Pago Regular
      </button>

      <div className="grid gap-3">
        {config.regularPayments.map((pay) => (
          <div
            key={pay.id}
            className="bg-stone-900 border border-stone-800 rounded-xl p-4 flex flex-col md:flex-row md:items-end gap-4"
          >
            <div className="flex-1">
              <label className="text-xs uppercase font-bold tracking-widest text-stone-500 block mb-1">
                Nombre / Concepto
              </label>
              <input
                value={pay.name}
                onChange={(e) =>
                  updatePayment(pay.id, { name: e.target.value })
                }
                className="bg-stone-950 text-white font-bold text-sm border-b border-transparent hover:border-stone-700 focus:border-orange-500 rounded p-2 focus:outline-none w-full"
              />
            </div>
            <div className="w-full md:w-32 shrink-0">
              <label className="text-xs uppercase font-bold tracking-widest text-stone-500 block mb-1">
                Monto (Bs)
              </label>
              <input
                type="number"
                value={pay.amount}
                onChange={(e) =>
                  updatePayment(pay.id, { amount: Number(e.target.value) })
                }
                className="bg-stone-950 border border-stone-800 text-orange-400 font-mono text-sm rounded p-2 focus:outline-none w-full text-right"
              />
            </div>
            <div className="w-full md:w-40 shrink-0">
              <label className="text-xs uppercase font-bold tracking-widest text-stone-500 block mb-1">
                Frecuencia
              </label>
              <select
                value={pay.period}
                onChange={(e) =>
                  updatePayment(pay.id, {
                    period: e.target.value as PaymentPeriod,
                  })
                }
                className="bg-stone-950 border border-stone-800 text-white text-sm rounded p-2 focus:outline-none w-full"
              >
                <option value="weekly">Semanal</option>
                <option value="fortnightly">Quincenal</option>
                <option value="monthly">Mensual</option>
                <option value="bimonthly">Bimestral</option>
                <option value="quarterly">Trimestral</option>
                <option value="semiannually">Semestral</option>
                <option value="yearly">Anual</option>
              </select>
            </div>
            <button
              onClick={() => removePayment(pay.id)}
              className="self-end p-2 text-stone-600 hover:text-red-500 shrink-0 hidden md:block"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => removePayment(pay.id)}
              className="w-full md:hidden py-2 bg-red-500/10 text-red-500 rounded-lg text-sm font-bold mt-2"
            >
              Eliminar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// DAILY EXPENSES VIEW
// ----------------------------------------------------------------------------
function DailyExpensesView({
  config,
  onChange,
}: {
  config: GlobalConfig;
  onChange: (c: GlobalConfig) => void;
}) {
  const addExpense = () => {
    onChange({
      ...config,
      dailyExpenses: [
        { id: generateDefaultId(), name: "Nuevo Gasto Diario", amount: 0 },
        ...config.dailyExpenses,
      ],
    });
  };

  const removeExpense = (id: string) => {
    onChange({
      ...config,
      dailyExpenses: config.dailyExpenses.filter((p) => p.id !== id),
    });
  };

  const updateExpense = (id: string, updates: Partial<DailyExpense>) => {
    onChange({
      ...config,
      dailyExpenses: config.dailyExpenses.map((p) =>
        p.id === id ? { ...p, ...updates } : p,
      ),
    });
  };

  const totalMonthly = calculateMonthlyDaily(config.dailyExpenses);
  const totalDaily = config.dailyExpenses.reduce(
    (acc, current) => acc + current.amount,
    0,
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-2xl font-black italic">Gastos Diarios</h2>
          <p className="text-stone-400 text-sm mt-1">
            Comidas, viáticos, recargas de saldo (calculado x 22 días
            trabajables).
          </p>
        </div>
        <div className="bg-stone-900 border border-stone-800 p-4 rounded-2xl flex items-center gap-6 divide-x divide-stone-800">
          <div>
            <div className="text-xs uppercase font-bold text-stone-500 tracking-widest text-center">
              Gasto Diario
            </div>
            <div className="text-xl font-mono text-orange-400 font-bold text-center">
              Bs {totalDaily.toFixed(2)}
            </div>
          </div>
          <div className="pl-6">
            <div className="text-xs uppercase font-bold text-stone-500 tracking-widest text-center">
              Impacto al mes
            </div>
            <div className="text-3xl font-mono text-red-400 font-bold text-center">
              Bs {totalMonthly.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={addExpense}
        className="w-full sm:w-auto bg-orange-500/10 text-orange-500 border border-orange-500/30 px-6 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-orange-500/20 font-mono text-xs uppercase tracking-widest font-bold"
      >
        <Plus className="w-4 h-4" /> Añadir Gasto Diario
      </button>

      <div className="grid gap-3">
        {config.dailyExpenses.map((exp) => (
          <div
            key={exp.id}
            className="bg-stone-900 border border-stone-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-end gap-4"
          >
            <div className="flex-1">
              <label className="text-xs uppercase font-bold tracking-widest text-stone-500 block mb-1">
                Concepto del Gasto
              </label>
              <input
                value={exp.name}
                onChange={(e) =>
                  updateExpense(exp.id, { name: e.target.value })
                }
                className="bg-stone-950 text-white font-bold text-sm border-b border-transparent hover:border-stone-700 focus:border-orange-500 rounded p-2 focus:outline-none w-full"
              />
            </div>
            <div className="w-full sm:w-32 shrink-0">
              <label className="text-xs uppercase font-bold tracking-widest text-stone-500 block mb-1">
                Gasto por DÍA
              </label>
              <input
                type="number"
                value={exp.amount}
                onChange={(e) =>
                  updateExpense(exp.id, { amount: Number(e.target.value) })
                }
                className="bg-stone-950 border border-stone-800 text-orange-400 font-mono text-sm rounded p-2 focus:outline-none w-full text-right"
              />
            </div>
            <button
              onClick={() => removeExpense(exp.id)}
              className="self-end p-2 text-stone-600 hover:text-red-500 shrink-0 hidden sm:block"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => removeExpense(exp.id)}
              className="w-full sm:hidden py-2 bg-red-500/10 text-red-500 rounded-lg text-sm font-bold mt-2"
            >
              Eliminar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// STAFF VIEW
// ----------------------------------------------------------------------------
function StaffView({
  config,
  onChange,
}: {
  config: GlobalConfig;
  onChange: (c: GlobalConfig) => void;
}) {
  const addStaff = () => {
    onChange({
      ...config,
      staff: [
        {
          id: generateDefaultId(),
          name: "Nuevo Trabajador",
          role: "",
          monthlySalary: 0,
          count: 1,
        },
        ...config.staff,
      ],
    });
  };

  const removeStaff = (id: string) => {
    onChange({ ...config, staff: config.staff.filter((p) => p.id !== id) });
  };

  const updateStaff = (id: string, updates: Partial<Staff>) => {
    onChange({
      ...config,
      staff: config.staff.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    });
  };

  const totalMonthly = calculateMonthlyStaff(config.staff);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-2xl font-black italic">Planilla de Sueldos</h2>
          <p className="text-stone-400 text-sm mt-1">
            Registra al personal y cuánto se les paga mensualmente.
          </p>
        </div>
        <div className="bg-stone-900 border border-stone-800 p-4 px-8 rounded-2xl flex flex-col items-center">
          <div className="text-xs uppercase font-bold text-stone-500 tracking-widest text-center">
            Gasto Salarial Mensual
          </div>
          <div className="text-3xl font-mono text-red-400 font-bold mt-1">
            Bs {totalMonthly.toFixed(2)}
          </div>
        </div>
      </div>

      <button
        onClick={addStaff}
        className="w-full sm:w-auto bg-orange-500/10 text-orange-500 border border-orange-500/30 px-6 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-orange-500/20 font-mono text-xs uppercase tracking-widest font-bold"
      >
        <Plus className="w-4 h-4" /> Añadir Personal
      </button>

      <div className="grid gap-4">
        {config.staff.map((emp) => (
          <div
            key={emp.id}
            className="bg-stone-900 border border-stone-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-end gap-4"
          >
            <div className="w-full md:w-16 shrink-0">
              <label className="text-xs uppercase font-bold tracking-widest text-stone-500 block mb-1">
                Cant.
              </label>
              <input
                type="number"
                min={1}
                value={emp.count}
                onChange={(e) =>
                  updateStaff(emp.id, { count: Number(e.target.value) })
                }
                className="bg-stone-950 border border-stone-800 text-orange-400 font-mono text-center text-lg font-black rounded p-1.5 focus:outline-none w-full"
              />
            </div>
            <div className="flex-1 w-full">
              <label className="text-xs uppercase font-bold tracking-widest text-stone-500 block mb-1">
                Nombre / Título
              </label>
              <input
                value={emp.name}
                onChange={(e) => updateStaff(emp.id, { name: e.target.value })}
                className="bg-stone-950 text-white font-bold text-base border-b border-transparent hover:border-stone-700 focus:border-orange-500 rounded p-2 focus:outline-none w-full"
              />
            </div>
            <div className="flex-1 w-full hidden lg:block">
              <label className="text-xs uppercase font-bold tracking-widest text-stone-500 block mb-1">
                Cargo
              </label>
              <input
                value={emp.role}
                onChange={(e) => updateStaff(emp.id, { role: e.target.value })}
                className="bg-stone-950 text-stone-300 text-sm border-b border-transparent hover:border-stone-700 focus:border-orange-500 rounded p-2 focus:outline-none w-full"
              />
            </div>
            <div className="w-full md:w-32 shrink-0">
              <label className="text-xs uppercase font-bold tracking-widest text-stone-500 block mb-1">
                Sueldo x1 (Bs)
              </label>
              <input
                type="number"
                value={emp.monthlySalary}
                onChange={(e) =>
                  updateStaff(emp.id, { monthlySalary: Number(e.target.value) })
                }
                className="bg-stone-950 border border-stone-800 text-amber-400 font-mono text-sm rounded p-2 focus:outline-none w-full text-right"
              />
            </div>
            <div className="w-full md:w-32 shrink-0 flex flex-col justify-end pb-2 text-right">
              <span className="text-[10px] uppercase font-bold text-stone-600 block mb-1">
                Total Fila
              </span>
              <span className="font-mono text-stone-300 font-bold">
                Bs {(emp.monthlySalary * emp.count).toFixed(2)}
              </span>
            </div>
            <button
              onClick={() => removeStaff(emp.id)}
              className="hidden md:block self-end p-2 text-stone-600 hover:text-red-500 shrink-0 mb-1"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => removeStaff(emp.id)}
              className="w-full md:hidden py-2 bg-red-500/10 text-red-500 rounded-lg text-sm font-bold mt-2"
            >
              Eliminar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// PROFIT AND PRODUCTION VIEW
// ----------------------------------------------------------------------------
function ProfitView({
  config,
  onChange,
}: {
  config: GlobalConfig;
  onChange: (c: GlobalConfig) => void;
}) {
  const [selectedFabrics, setSelectedFabrics] = useState<Record<string, string>>({});
  
  const totalOverhead = calculateTotalOverhead(config);
  const overheadPerUnit =
    config.productionCapacity > 0
      ? totalOverhead / config.productionCapacity
      : 0;

  const idealProfitMarginToCoverRisk = 30; // Just an arbitrary suggestion based on retail standards

  // Break-even logic demo wrapper

  return (
    <div className="space-y-10">
      <div className="max-w-3xl">
        <h2 className="text-3xl font-black italic mb-2 text-white">
          Análisis de Rentabilidad
        </h2>
        <p className="text-stone-400">
          Todo el costo fijo de la empresa recae sobre la cantidad de productos
          que produces al mes. Configura tu capacidad y margen deseado para
          hallar precios ganadores.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl">
        <div className="bg-stone-900 border border-stone-800 p-8 rounded-3xl space-y-6">
          <div>
            <div className="flex justify-between items-end mb-2">
              <label className="text-xs uppercase font-bold text-stone-500 tracking-widest block">
                Margen (Por Menor)
              </label>
              <span className="text-3xl font-black text-orange-500 font-mono">
                {config.profitMargin}%
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="80"
              step="5"
              value={config.profitMargin}
              onChange={(e) =>
                onChange({ ...config, profitMargin: Number(e.target.value) })
              }
              className="w-full accent-orange-500 h-2 bg-stone-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="h-px bg-stone-800 w-full" />

          <div>
            <div className="flex justify-between items-end mb-2">
              <label className="text-xs uppercase font-bold text-stone-500 tracking-widest block">
                Margen (Por Mayor)
              </label>
              <span className="text-3xl font-black text-emerald-500 font-mono">
                {config.wholesaleMargin ?? 20}%
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="80"
              step="5"
              value={config.wholesaleMargin ?? 20}
              onChange={(e) =>
                onChange({ ...config, wholesaleMargin: Number(e.target.value) })
              }
              className="w-full accent-emerald-500 h-2 bg-stone-800 rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-xs text-stone-500 mt-3 font-mono">
              Márgenes sugeridos: Menor ({idealProfitMarginToCoverRisk}%), Mayor
              (~20%).
            </p>
          </div>

          <div className="h-px bg-stone-800 w-full" />

          <div>
            <div className="flex justify-between items-end mb-2">
              <label className="text-xs uppercase font-bold text-stone-500 tracking-widest block">
                Producción Mensual
              </label>
              <span className="text-3xl font-black text-white font-mono">
                {config.productionCapacity}{" "}
                <span className="text-sm">unid</span>
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="2000"
              step="10"
              value={config.productionCapacity}
              onChange={(e) =>
                onChange({
                  ...config,
                  productionCapacity: Number(e.target.value),
                })
              }
              className="w-full accent-white h-2 bg-stone-800 rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-xs text-stone-500 mt-3 font-mono">
              ¿Cuántos productos estimas hacer *y vender* cada mes? Esto decide
              en cuántas partes se divide tu Carga Fija mensual.
            </p>
          </div>
        </div>

        <div className="bg-orange-500/10 border border-orange-500/20 p-8 rounded-3xl flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-32 bg-orange-500/5 blur-3xl rounded-full transtone-x-1/2 -transtone-y-1/2 pointer-events-none" />
          <div className="text-xs uppercase font-bold text-orange-500/70 tracking-[0.2em] mb-2">
            Costo Fijo (Overhead) Mensual
          </div>
          <div className="text-5xl font-mono text-white font-black mb-1">
            Bs {totalOverhead.toFixed(2)}
          </div>
          <p className="text-sm text-stone-400 mt-4 leading-relaxed">
            Este es tu gran monstruo. Vendas o no vendas, tienes que pagar{" "}
            <strong>Bs {totalOverhead.toFixed(2)}</strong> cada mes en
            alquileres, servicios, sueldos, y comidas.
          </p>
          <div className="mt-6 bg-stone-950/40 p-4 rounded-xl border border-orange-500/10">
            <div className="text-xs uppercase font-bold text-stone-500 tracking-widest mb-1">
              Costo Fijo Repartido X Unidad:
            </div>
            <div className="text-xl font-mono text-orange-400 font-bold">
              Bs {overheadPerUnit.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {config.products.length > 0 && (
        <div className="space-y-4 max-w-5xl mt-12 block">
          <h3 className="text-xl font-black italic mb-4 border-b border-stone-800 pb-2 inline-block">
            Proyección por Receta
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {config.products.map((prod) => {
              const activeFabricId = selectedFabrics[prod.id] !== undefined ? selectedFabrics[prod.id] : (prod.defaultFabricId || "");
              const analysis = calculateProductAnalysis(prod, config, activeFabricId);
              return (
                <div
                  key={prod.id}
                  className="bg-stone-900 border border-stone-800 p-5 rounded-2xl flex flex-col"
                >
                  <div className="flex items-start justify-between mb-4 gap-2">
                    <div className="flex-1 min-w-0">
                      <h4
                        className="font-bold text-white line-clamp-2 mb-2"
                        title={prod.name}
                      >
                        {prod.name}
                      </h4>
                      <select
                        value={activeFabricId}
                        onChange={(e) => setSelectedFabrics(prev => ({ ...prev, [prod.id]: e.target.value }))}
                        className="w-full bg-stone-950 border border-stone-700/50 rounded py-1 px-2 text-[10px] text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
                      >
                        <option value="">(Sin tela principal)</option>
                        {config.materials
                          .filter((m) => m.category === "fabric")
                          .filter((m) => {
                            if (!prod.allowedFabricIds || prod.allowedFabricIds.length === 0) return true;
                            return prod.allowedFabricIds.includes(m.id);
                          })
                          .map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      <div
                        className="bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded font-mono text-[10px] font-bold shrink-0"
                        title="Margen Por Menor"
                      >
                        Menor: {analysis.appliedMargin}%
                      </div>
                      <div
                        className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-mono text-[10px] font-bold shrink-0"
                        title="Margen Por Mayor"
                      >
                        Mayor: {analysis.appliedWholesaleMargin}%
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 flex-1">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-stone-500 font-mono text-xs uppercase tracking-widest">
                        Mat. Directo
                      </span>
                      <span className="font-mono text-red-300">
                        Bs {analysis.materialCost.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-stone-500 font-mono text-xs uppercase tracking-widest">
                        Op. Fijo Asignado
                      </span>
                      <span className="font-mono text-red-300">
                        Bs {overheadPerUnit.toFixed(2)}
                      </span>
                    </div>

                    <div className="h-px bg-stone-800/50 my-2" />

                    <div className="flex flex-col gap-3">
                      {/* Retail Section */}
                      <div className="bg-stone-950 p-3 rounded-lg border border-stone-800">
                        <div className="flex justify-between items-end mb-2">
                          <span className="text-stone-400 font-mono text-[10px] uppercase tracking-widest font-bold">
                            Precio (Menor)
                          </span>
                          <span className="font-mono text-orange-400 text-base font-black">
                            Bs {analysis.recommendedPrice.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-stone-500">Rentabilidad:</span>
                          <span className="font-mono text-orange-400">
                            +Bs {analysis.profitPerUnit.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-stone-500">Break-even:</span>
                          <span className="font-mono text-white">
                            {Math.ceil(analysis.breakEvenUnits)} u/mes
                          </span>
                        </div>
                      </div>

                      {/* Wholesale Section */}
                      <div className="bg-stone-950 p-3 rounded-lg border border-stone-800">
                        <div className="flex justify-between items-end mb-2">
                          <span className="text-stone-400 font-mono text-[10px] uppercase tracking-widest font-bold">
                            Precio (Mayor)
                          </span>
                          <span className="font-mono text-emerald-400 text-base font-black">
                            Bs {analysis.recommendedWholesalePrice.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-stone-500">Rentabilidad:</span>
                          <span className="font-mono text-emerald-400">
                            +Bs {analysis.wholesaleProfitPerUnit.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-stone-500">Break-even:</span>
                          <span className="font-mono text-white">
                            {Math.ceil(analysis.wholesaleBreakEvenUnits)} u/mes
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          </div>
      )}
    </div>
  );
}
// All changes requested have been applied
