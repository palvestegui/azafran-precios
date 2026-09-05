import { GlobalConfig } from "../types";
import { validateAndNormalizeGlobalConfig } from "./validation";

export function getBackupFilename(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `azafran_config_${year}-${month}-${day}.json`;
}

export function downloadConfigAsJson(config: GlobalConfig): string {
  const filename = getBackupFilename();
  const dataStr =
    "data:text/json;charset=utf-8," +
    encodeURIComponent(JSON.stringify(config, null, 2));
  const downloadAnchor = document.createElement("a");
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", filename);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  return filename;
}

export async function parseAndValidateConfigFile(
  file: File,
  fallback: GlobalConfig
): Promise<GlobalConfig> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (!parsed || typeof parsed !== "object") {
          reject(new Error("El archivo no contiene un JSON válido."));
          return;
        }
        const validated = validateAndNormalizeGlobalConfig(parsed, fallback);
        resolve(validated);
      } catch (err) {
        reject(err instanceof Error ? err : new Error("Error al analizar el archivo JSON."));
      }
    };
    reader.onerror = () => {
      reject(new Error("Error al leer el archivo del dispositivo."));
    };
    reader.readAsText(file);
  });
}
