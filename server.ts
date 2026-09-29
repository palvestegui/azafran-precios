import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp as initClientApp } from "firebase/app";
import { getFirestore as getClientDb, doc, getDoc, setDoc } from "firebase/firestore";
import { calculateProductAnalysis } from "./src/utils/pricingCalculator.js";
import { roundBob } from "./src/utils/calculations.js";
import { publishPreciosToVentas } from "./src/utils/ventasPublisher.js";
import { GlobalConfig, Product } from "./src/types.js";
import { DEFAULT_GLOBAL_CONFIG } from "./src/data/defaultCatalog.js";
import firebaseConfig from "./firebase-applet-config.json";

// Domain & MCP Interfaces
interface PricingMatrixItem { garment: string; fabric: string; consumptionMeters: number; retailPrice: number; wholesalePrice: number; }

// Initialize Firebase Apps with explicit projectId to avoid default GCP project mismatches
const localApp = admin.initializeApp({ projectId: firebaseConfig.projectId });
const dbLocal = getFirestore(localApp, firebaseConfig.firestoreDatabaseId || "(default)");

const clientApp = initClientApp(firebaseConfig);
const clientDb = getClientDb(clientApp, firebaseConfig.firestoreDatabaseId);

let dbVentas: FirebaseFirestore.Firestore;
try {
  const appVentas = admin.initializeApp(
    { projectId: "mystic-return-81b2m" },
    "ventas"
  );
  dbVentas = getFirestore(appVentas, "ai-studio-0dba6e4d-b474-410e-b078-6e631bf1a01a");
} catch (e) {
  console.error("Failed to initialize Ventas app:", e);
}

const mcpServer = new McpServer({ name: "ChefwearPricingMCP", version: "1.0.0" });

// Helper to get local config via client SDK (resilient against gRPC IAM boundaries)
async function getLocalConfig(): Promise<GlobalConfig> {
  try {
    const snap = await getDoc(doc(clientDb, "config", "system-wide-config"));
    if (!snap.exists()) return DEFAULT_GLOBAL_CONFIG;
    return (snap.data() as GlobalConfig) || DEFAULT_GLOBAL_CONFIG;
  } catch (error) {
    console.warn("Using default config, live fetch notice:", error instanceof Error ? error.message : error);
    return DEFAULT_GLOBAL_CONFIG;
  }
}

// Helper to build pricing matrix
function buildMatrix(config: GlobalConfig): PricingMatrixItem[] {
  const matrix: PricingMatrixItem[] = [];
  const allFabrics = config.materials.filter((m) => m.category === "fabric");
  for (const prod of config.products) {
    const allowed = allFabrics.filter((f) => !prod.allowedFabricIds?.length || prod.allowedFabricIds.includes(f.id));
    for (const fabric of allowed) {
      const a = calculateProductAnalysis(prod, config, fabric.id);
      const o = prod.variantOverrides?.[fabric.id];
      const r = o?.retailPrice ?? o?.customRetailPrice ?? a.recommendedPrice;
      const w = o?.wholesalePrice ?? o?.customWholesalePrice ?? a.recommendedWholesalePrice;
      matrix.push({ garment: prod.name, fabric: fabric.name, consumptionMeters: prod.fabricQuantity ?? 0, retailPrice: roundBob(r), wholesalePrice: roundBob(w) });
    }
  }
  return matrix;
}

async function addProduct(name: string, category: string, fabricMeters: number, description?: string): Promise<string> {
  const config = await getLocalConfig();
  config.products.push({ id: `prod-${Date.now()}`, name, category, description, fabricQuantity: fabricMeters, ingredients: [], productionWeight: 1 });
  try { await setDoc(doc(clientDb, "config", "system-wide-config"), config); } catch { /* ignore */ }
  return `Product ${name} added successfully.`;
}

async function updateFabricCost(fabricName: string, costPerMeter: number): Promise<{ message: string; isError?: boolean }> {
  const config = await getLocalConfig();
  const fabric = config.materials.find((m) => m.name.toLowerCase() === fabricName.toLowerCase() && m.category === "fabric");
  if (!fabric) return { message: `Fabric ${fabricName} not found.`, isError: true };
  fabric.pricePerUnit = costPerMeter;
  try { await setDoc(doc(clientDb, "config", "system-wide-config"), config); } catch { /* ignore */ }
  return { message: `Fabric ${fabricName} updated to Bs ${costPerMeter}/m.` };
}

// MCP Tools
mcpServer.tool("precios_get_matrix", "Returns active pricing matrix", {}, async () => ({
  content: [{ type: "text", text: JSON.stringify(buildMatrix(await getLocalConfig()), null, 2) }]
}));
mcpServer.tool("precios_get_materials", "Returns fabrics and supplies", {}, async () => ({
  content: [{ type: "text", text: JSON.stringify((await getLocalConfig()).materials, null, 2) }]
}));
mcpServer.tool("precios_add_product", "Adds a new garment", {
  name: z.string(), category: z.string(), fabricMeters: z.number(), laborCost: z.number(), description: z.string().optional(),
}, async ({ name, category, fabricMeters, description }) => ({ content: [{ type: "text", text: await addProduct(name, category, fabricMeters, description) }] }));
mcpServer.tool("precios_update_fabric_cost", "Updates fabric cost per meter", { fabricName: z.string(), costPerMeter: z.number() }, async ({ fabricName, costPerMeter }) => {
  const res = await updateFabricCost(fabricName, costPerMeter);
  return { content: [{ type: "text", text: res.message }], isError: res.isError };
});
mcpServer.tool("precios_sync_to_ventas", "Syncs rounded prices to Ventas DB", {}, async () => {
  try {
    const result = await publishPreciosToVentas(dbLocal, dbVentas);
    return { content: [{ type: "text", text: JSON.stringify({ success: true, baseCount: result.baseCount, catalogCount: result.catalogCount, lastSyncedAt: result.lastSyncedAt }) }] };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Sync error:", errorMsg);
    return { content: [{ type: "text", text: JSON.stringify({ success: false, error: errorMsg }) }], isError: true };
  }
});

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  app.use(express.json());

  app.get("/mcp", (_req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*").json({ status: "ok", server: "azafran-precios", protocol: "mcp" });
  });

  app.post("/mcp", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    const { jsonrpc, id, method, params } = req.body || {};
    if (method === "initialize") {
      return res.json({ jsonrpc: "2.0", id, result: { protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "azafran-precios", version: "1.0.0" } } });
    }
    if (method === "notifications/initialized") return res.status(200).json({});
    if (method === "tools/list") {
      return res.json({
        jsonrpc: "2.0", id,
        result: {
          tools: [
            { name: "precios_get_matrix", description: "Get live rounded pricing matrix", inputSchema: { type: "object", properties: {} } },
            { name: "precios_get_materials", description: "Get fabrics and supplies costs", inputSchema: { type: "object", properties: {} } },
            { name: "precios_add_product", description: "Add a new garment", inputSchema: { type: "object", properties: { name: { type: "string" }, category: { type: "string" }, fabricMeters: { type: "number" }, laborCost: { type: "number" }, description: { type: "string" } }, required: ["name", "category", "fabricMeters", "laborCost"] } },
            { name: "precios_update_fabric_cost", description: "Update fabric cost per meter", inputSchema: { type: "object", properties: { fabricName: { type: "string" }, costPerMeter: { type: "number" } }, required: ["fabricName", "costPerMeter"] } },
            { name: "precios_sync_to_ventas", description: "Sync rounded prices to Ventas pricing/global", inputSchema: { type: "object", properties: {} } },
          ],
        },
      });
    }

    if (method === "tools/call") {
      const toolName = params?.name;
      const args = (params?.arguments || {}) as Record<string, unknown>;
      try {
        let toolResult: unknown;
        if (toolName === "precios_get_matrix") toolResult = buildMatrix(await getLocalConfig());
        else if (toolName === "precios_get_materials") toolResult = (await getLocalConfig()).materials;
        else if (toolName === "precios_add_product") {
          toolResult = await addProduct(
            typeof args.name === "string" ? args.name : "Nueva Prenda",
            typeof args.category === "string" ? args.category : "General",
            typeof args.fabricMeters === "number" ? args.fabricMeters : 1,
            typeof args.description === "string" ? args.description : undefined,
          );
        } else if (toolName === "precios_update_fabric_cost") {
          const r = await updateFabricCost(typeof args.fabricName === "string" ? args.fabricName : "", typeof args.costPerMeter === "number" ? args.costPerMeter : 0);
          toolResult = r.message;
        } else if (toolName === "precios_sync_to_ventas") {
          try {
            const syncRes = await publishPreciosToVentas(dbLocal, dbVentas);
            toolResult = { success: true, baseCount: syncRes.baseCount, catalogCount: syncRes.catalogCount, lastSyncedAt: syncRes.lastSyncedAt };
          } catch (syncErr: unknown) {
            const errorMsg = syncErr instanceof Error ? syncErr.message : String(syncErr);
            console.error("Sync error:", errorMsg);
            toolResult = { success: false, error: errorMsg };
          }
        } else toolResult = `Tool ${toolName} not found.`;
        return res.json({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: JSON.stringify(toolResult, null, 2) }] } });
      } catch (err: unknown) {
        return res.json({ jsonrpc: "2.0", id, error: { code: -32000, message: err instanceof Error ? err.message : String(err) } });
      }
    }
    return res.status(404).json({ error: "Method not found" });
  });

  app.options("/mcp", (_req, res) => res.setHeader("Access-Control-Allow-Origin", "*").setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS").setHeader("Access-Control-Allow-Headers", "Content-Type").status(204).end());
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

  app.options("/api/pricing/sync", (_req, res) => res.setHeader("Access-Control-Allow-Origin", "*").setHeader("Access-Control-Allow-Methods", "POST, OPTIONS").setHeader("Access-Control-Allow-Headers", "Content-Type").status(204).end());

  app.post("/api/pricing/sync", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    try {
      const payload = req.body;
      if (dbVentas && payload) {
        await dbVentas.collection("pricing").doc("global").set(payload, { merge: true });
      }
      res.json({ success: true, lastSyncedAt: payload?.lastSyncedAt || Date.now() });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: message });
    }
  });

  app.post("/api/sync-proxy", async (req, res) => {
    try {
      const { targetUrl, payload } = req.body || {};
      if (!targetUrl) throw new Error("targetUrl is required");
      const cleanUrl = String(targetUrl).trim().replace(/\/$/, "");
      const remoteRes = await fetch(`${cleanUrl}/api/pricing/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await remoteRes.json().catch(() => ({}));
      if (!remoteRes.ok || !data.success) {
        throw new Error(data.error || `Remote server returned HTTP ${remoteRes.status}`);
      }
      res.json(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: message });
    }
  });

  app.post("/api/sync-to-ventas", async (_req, res) => {
    try {
      const result = await publishPreciosToVentas(dbLocal, dbVentas);
      res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => console.log(`Azafrán Precios server running on port ${PORT}`));
}

startServer();
