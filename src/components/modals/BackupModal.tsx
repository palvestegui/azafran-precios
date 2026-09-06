import React, { useRef, useState, useEffect } from "react";
import {
  Download,
  Upload,
  X,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Database,
  Clock,
  Wifi,
  WifiOff,
} from "lucide-react";
import { GlobalConfig, Material, Product } from "../../types";
import {
  downloadConfigAsJson,
  parseAndValidateConfigFile,
} from "../../utils/backupUtils";

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: GlobalConfig;
  onRestore: (restoredConfig: GlobalConfig) => void;
  isCloudConnected?: boolean;
}

const BACKUP_TIMESTAMP_KEY = "azafran_last_backup_timestamp";
const LOCAL_STORAGE_KEY = "azafran_backup_config";

function formatTimestamp(isoString: string | null): string {
  if (!isoString) return "Sin respaldo previo registrado";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "Sin respaldo previo registrado";
    return new Intl.DateTimeFormat("es-BO", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d);
  } catch {
    return "Fecha no disponible";
  }
}

export function BackupModal({
  isOpen,
  onClose,
  config,
  onRestore,
  isCloudConnected = true,
}: BackupModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null);
  const [isLocalStorageSynced, setIsLocalStorageSynced] = useState<boolean>(true);

  // Initialize and refresh state when modal opens
  useEffect(() => {
    if (!isOpen) return;

    try {
      const storedTimestamp = localStorage.getItem(BACKUP_TIMESTAMP_KEY);
      setLastBackupTime(storedTimestamp);

      const localBackup = localStorage.getItem(LOCAL_STORAGE_KEY);
      setIsLocalStorageSynced(Boolean(localBackup));
    } catch {
      setLastBackupTime(null);
      setIsLocalStorageSynced(false);
    }
    setStatusMessage(null);
    setIsError(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExport = () => {
    try {
      const filename = downloadConfigAsJson(config);
      const now = new Date().toISOString();
      try {
        localStorage.setItem(BACKUP_TIMESTAMP_KEY, now);
        setLastBackupTime(now);
      } catch {
        // Ignore localStorage quota errors
      }
      setStatusMessage(`Respaldo descargado exitosamente como ${filename}`);
      setIsError(false);
    } catch {
      setStatusMessage("Error al exportar los datos.");
      setIsError(true);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const validated = await parseAndValidateConfigFile(file, config);
      onRestore(validated);
      const now = new Date().toISOString();
      try {
        localStorage.setItem(BACKUP_TIMESTAMP_KEY, now);
        setLastBackupTime(now);
      } catch {
        // Ignore localStorage quota errors
      }
      const restoredTelas = validated.materials.filter(
        (m: Material) => m.category === "fabric"
      ).length;
      const restoredInsumos = validated.materials.filter(
        (m: Material) => m.category === "other"
      ).length;
      const restoredAccesorios = validated.materials.filter(
        (m: Material) => m.category === "accessory" || m.category === "service"
      ).length;
      const restoredProductos = validated.products.length;

      setStatusMessage(
        `¡Respaldo restaurado con éxito! (${restoredTelas} telas, ${restoredInsumos} insumos, ${restoredAccesorios} accesorios, ${restoredProductos} productos)`
      );
      setIsError(false);
    } catch (err) {
      setStatusMessage(
        err instanceof Error
          ? err.message
          : "El archivo seleccionado no tiene el formato de catálogo válido."
      );
      setIsError(true);
    } finally {
      e.target.value = "";
    }
  };

  const telasCount = config.materials.filter(
    (m: Material) => m.category === "fabric"
  ).length;
  const insumosCount = config.materials.filter(
    (m: Material) => m.category === "other"
  ).length;
  const accesoriosCount = config.materials.filter(
    (m: Material) => m.category === "accessory" || m.category === "service"
  ).length;
  const productosCount = config.products.length;
  const totalItems = config.materials.length + config.products.length;

  const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
  const showConnected = isCloudConnected && isOnline;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-lg p-6 relative shadow-2xl my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-500 hover:text-white transition-colors"
          title="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Title Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Centro de Respaldo y Seguridad
            </h3>
            <p className="text-xs text-stone-400 font-mono">
              Auditoría operativa y gestión de copias JSON
            </p>
          </div>
        </div>

        {/* Operational Health Status Panel */}
        <div className="space-y-3 mb-5 p-4 rounded-xl bg-stone-950/80 border border-stone-800">
          <div className="flex items-center justify-between pb-2.5 border-b border-stone-800/80">
            <span className="text-[11px] uppercase tracking-wider font-mono font-bold text-stone-400">
              Estado de Infraestructura
            </span>
            {/* 1. Connection Health Pill */}
            {showConnected ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Wifi className="w-3 h-3 text-emerald-400 animate-pulse" />
                <span>Cloud Firestore Conectado</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <WifiOff className="w-3 h-3 text-amber-400" />
                <span>Modo Local / Offline Fallback</span>
              </span>
            )}
          </div>

          {/* 2. Persistence Audit */}
          <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-400 bg-emerald-500/5 border border-emerald-500/15 p-2.5 rounded-lg">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <div className="leading-tight">
              <span className="font-semibold block">
                Persistencia Local Activa
              </span>
              <span className="text-[10px] text-stone-400">
                {isLocalStorageSynced
                  ? "azafran_backup_config sincronizado con LocalStorage y catálogo base"
                  : "Listo para sincronización en LocalStorage"}
              </span>
            </div>
          </div>

          {/* 3. Catalog Metrics Breakdown & Last Backup Timestamp */}
          <div className="space-y-2 pt-1 font-mono">
            <div className="bg-stone-900/90 border border-stone-800/80 p-3 rounded-lg">
              <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-stone-800/80">
                <div className="flex items-center gap-1.5 text-stone-400 text-[10px] uppercase font-bold">
                  <Database className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                  <span>Métricas de Catálogo ({totalItems} ítems totales)</span>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-stone-950/70 border border-stone-800/60 p-2 rounded-lg">
                  <span className="text-[10px] text-stone-400 uppercase font-bold block mb-0.5">
                    Telas
                  </span>
                  <span className="text-white font-bold text-sm">
                    {telasCount}
                  </span>
                </div>
                <div className="bg-stone-950/70 border border-stone-800/60 p-2 rounded-lg">
                  <span className="text-[10px] text-stone-400 uppercase font-bold block mb-0.5">
                    Insumos
                  </span>
                  <span className="text-white font-bold text-sm">
                    {insumosCount}
                  </span>
                </div>
                <div className="bg-stone-950/70 border border-stone-800/60 p-2 rounded-lg">
                  <span className="text-[10px] text-stone-400 uppercase font-bold block mb-0.5">
                    Accesorios / Servicios
                  </span>
                  <span className="text-white font-bold text-sm">
                    {accesoriosCount}
                  </span>
                </div>
                <div className="bg-stone-950/70 border border-stone-800/60 p-2 rounded-lg">
                  <span className="text-[10px] text-stone-400 uppercase font-bold block mb-0.5">
                    Productos
                  </span>
                  <span className="text-orange-400 font-bold text-sm">
                    {productosCount}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-stone-900/90 border border-stone-800/80 px-3 py-2 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-stone-400 text-[10px] uppercase font-bold">
                <Clock className="w-3 h-3 text-orange-400 shrink-0" />
                <span>Último Respaldo Registrado</span>
              </div>
              <div className="text-orange-400 font-semibold text-xs truncate">
                {formatTimestamp(lastBackupTime)}
              </div>
            </div>
          </div>
        </div>

        {/* Feedback message banner */}
        {statusMessage && (
          <div
            className={`p-3 rounded-xl mb-4 text-xs font-mono flex items-center gap-2 ${
              isError
                ? "bg-red-500/10 border border-red-500/20 text-red-400"
                : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
            }`}
          >
            {isError ? (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            ) : (
              <ShieldCheck className="w-4 h-4 shrink-0" />
            )}
            <span>{statusMessage}</span>
          </div>
        )}

        {/* 4. Action Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleExport}
            className="w-full bg-stone-800 hover:bg-stone-700 text-white font-bold text-xs uppercase tracking-wider py-3 px-4 rounded-xl flex flex-col items-center justify-center gap-1 border border-stone-700 transition-all shadow-sm active:scale-95 text-center"
          >
            <div className="flex items-center justify-center gap-2">
              <Download className="w-4 h-4 text-orange-500 shrink-0" />
              <span>DESCARGAR RESPALDO COMPLETO JSON ({totalItems} ÍTEMS)</span>
            </div>
            <span className="text-[10px] font-normal text-stone-400 font-mono tracking-normal normal-case">
              ({config.materials.length} Materiales, Insumos y Accesorios + {productosCount} Productos)
            </span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImport}
            accept=".json"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-orange-500 hover:bg-orange-400 text-black font-bold text-xs uppercase tracking-widest py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-500/10 active:scale-95"
          >
            <Upload className="w-4 h-4" />
            <span>Restaurar desde archivo JSON</span>
          </button>
        </div>

        <div className="mt-5 pt-3 border-t border-stone-800 flex justify-end">
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white text-xs font-mono px-3 py-1.5 rounded-lg hover:bg-stone-800 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
