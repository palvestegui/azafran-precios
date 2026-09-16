import React from 'react';
import { 
  LayoutDashboard, Table, Scissors, Package, 
  Receipt, Coffee, Users, TrendingUp, ShieldCheck, 
  LogOut, Menu, Tag, Layers
} from 'lucide-react';
import { User } from 'firebase/auth';
import { cn } from '../../lib/utils';

export type ViewState = 'fabrics' | 'supplies' | 'products' | 'accessories' | 'pricingMatrix' | 'regularPayments' | 'dailyExpenses' | 'staff' | 'profit' | 'dashboard' | 'users';

export interface SidebarNavProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  activeTab?: ViewState;
  setActiveTab?: (v: ViewState) => void;
  view?: ViewState;
  setView?: (v: ViewState) => void;
  user?: User | null;
  onLogout?: () => void;
}

const NAV_GROUPS = [
  {
    label: 'MOTOR DE PRECIOS',
    items: [
      { id: 'dashboard', label: 'Resumen', icon: LayoutDashboard },
      { id: 'pricingMatrix', label: 'Matriz de Precios', icon: Table },
    ]
  },
  {
    label: 'TALLER & CATÁLOGO',
    items: [
      { id: 'products', label: 'Productos', icon: Scissors },
      { id: 'accessories', label: 'Accesorios', icon: Tag },
      { id: 'supplies', label: 'Insumos', icon: Package },
      { id: 'fabrics', label: 'Telas', icon: Layers },
    ]
  },
  {
    label: 'COSTOS & OVERHEAD',
    items: [
      { id: 'regularPayments', label: 'Pagos Regulares', icon: Receipt },
      { id: 'dailyExpenses', label: 'Gastos Diarios', icon: Coffee },
      { id: 'staff', label: 'Planilla', icon: Users },
      { id: 'profit', label: 'Rentabilidad', icon: TrendingUp },
    ]
  },
  {
    label: 'GOBERNANZA',
    items: [
      { id: 'users', label: 'Usuarios', icon: ShieldCheck },
    ]
  }
];

export function SidebarNav({
  isCollapsed,
  onToggleCollapse,
  activeTab,
  setActiveTab,
  view,
  setView,
  user,
  onLogout
}: SidebarNavProps) {
  const currentView = activeTab ?? view ?? 'dashboard';
  const handleSelectView = (targetView: ViewState) => {
    if (setActiveTab) {
      setActiveTab(targetView);
    } else if (setView) {
      setView(targetView);
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'P';
    return name.substring(0, 1).toUpperCase();
  };

  return (
    <div className="flex flex-col justify-between h-full w-full select-none overflow-x-hidden">
      {/* Header */}
      <div 
        className={cn(
          "h-16 flex items-center shrink-0 border-b border-stone-800/50 transition-colors overflow-hidden",
          isCollapsed ? "justify-center cursor-pointer hover:bg-stone-900/50" : "justify-between px-3"
        )}
        onClick={isCollapsed ? onToggleCollapse : undefined}
        title={isCollapsed ? "Expandir barra lateral" : undefined}
      >
        <div className={cn("flex items-center gap-3 overflow-hidden", isCollapsed && "justify-center")}>
          <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center p-1 overflow-hidden shadow-sm shrink-0">
            <img src="/logo.png" alt="Azafrán Logo" className="w-full h-full object-contain" />
          </div>
          {!isCollapsed && (
            <span className="text-stone-200 font-bold text-sm tracking-tight whitespace-nowrap truncate">
              Azafrán Data System
            </span>
          )}
        </div>
        {!isCollapsed && (
          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleCollapse(); }} 
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-900 transition-colors shrink-0 cursor-pointer"
            title="Contraer barra lateral"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-2 space-y-4 custom-scrollbar select-none">
        {NAV_GROUPS.map((group, idx) => (
          <div key={idx} className="space-y-1">
            {!isCollapsed ? (
              <div className="px-3 text-[10px] font-mono uppercase tracking-widest text-stone-500 font-bold truncate">
                {group.label}
              </div>
            ) : (
              <div className="w-8 mx-auto my-1 border-b border-stone-800" />
            )}
            <ul className="space-y-0.5">
              {group.items.map(item => {
                const isActive = currentView === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectView(item.id as ViewState)}
                      className={cn(
                        "flex items-center py-2 transition-colors relative group cursor-pointer rounded-lg",
                        isCollapsed ? "justify-center px-0 w-10 mx-auto" : "justify-start px-3 w-full",
                        isActive 
                          ? 'bg-orange-500/15 text-orange-400 font-bold border-r-2 border-orange-500' 
                          : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900/60 border-r-2 border-transparent'
                      )}
                    >
                      <item.icon className={cn("w-4 h-4 shrink-0", isActive ? 'text-orange-500' : 'text-stone-400 group-hover:text-stone-300')} />
                      
                      {!isCollapsed && (
                        <span className="ml-3 text-sm truncate">{item.label}</span>
                      )}

                      {/* Tooltip for collapsed state */}
                      {isCollapsed && (
                        <div className="absolute left-full ml-2 px-2 py-1 bg-stone-800 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 pointer-events-none shadow-lg">
                          {item.label}
                        </div>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* User Dock */}
      {user && (
        <div className={cn(
          "border-t border-stone-800/80 p-3 bg-stone-950/40 flex items-center shrink-0 overflow-hidden",
          isCollapsed ? "justify-center" : "justify-between"
        )}>
          <div className={cn("flex items-center gap-3 overflow-hidden", isCollapsed && "justify-center")}>
            <div
              className={cn(
                "w-8 h-8 rounded-full bg-stone-800 flex items-center justify-center shrink-0 border border-stone-700 relative group",
                isCollapsed && onLogout && "cursor-pointer"
              )}
              onClick={isCollapsed && onLogout ? onLogout : undefined}
              title={isCollapsed ? `${user.displayName || user.email} • Cerrar sesión` : undefined}
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="avatar"
                  className={cn(
                    "w-full h-full rounded-full object-cover transition-opacity",
                    isCollapsed && onLogout && "group-hover:opacity-30"
                  )}
                />
              ) : (
                <span
                  className={cn(
                    "text-stone-300 font-bold text-xs transition-opacity",
                    isCollapsed && onLogout && "group-hover:opacity-0"
                  )}
                >
                  {getInitials(user.displayName || user.email)}
                </span>
              )}
              {isCollapsed && onLogout && (
                <LogOut className="w-3.5 h-3.5 text-orange-400 absolute opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              )}
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-stone-950 animate-pulse"></div>
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-stone-200 text-xs font-semibold truncate">{user.displayName || user.email?.split('@')[0]}</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[9px] font-mono text-stone-500 bg-stone-900 px-1.5 py-0.5 rounded uppercase">ADMIN</span>
                  <span className="text-[9px] text-emerald-500">En Línea</span>
                </div>
              </div>
            )}
          </div>
          {!isCollapsed && onLogout && (
            <button 
              type="button"
              onClick={onLogout}
              className="p-2 text-stone-500 hover:text-orange-400 hover:bg-stone-900 rounded-lg transition-colors group relative shrink-0 cursor-pointer"
              title="Cerrar Sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
