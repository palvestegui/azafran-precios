import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { calculateProductAnalysis } from "./src/utils/pricingCalculator.js";
import { roundBob } from "./src/utils/calculations.js";
import { GlobalConfig } from "./src/types.js";
import { DEFAULT_GLOBAL_CONFIG } from "./src/data/defaultCatalog.js";
import firebaseConfig from "./firebase-applet-config.json";

// Initialize Firebase Apps
const localApp = admin.initializeApp();
const dbLocal = getFirestore(localApp, firebaseConfig.firestoreDatabaseId || "(default)");

let dbVentas: FirebaseFirestore.Firestore;
try {
  const appVentas = admin.initializeApp({ projectId: "mystic-return-81b2m" }, "ventas");
  dbVentas = getFirestore(appVentas, "chefwear-db");
} catch (e) {
  console.error("Failed to initialize Ventas app:", e);
}

const mcpServer = new McpServer({
  name: "ChefwearPricingMCP",
  version: "1.0.0"
});

// Helper to get local config
async function getLocalConfig(): Promise<GlobalConfig> {
  try {
    const doc = await dbLocal.collection("config").doc("system-wide-config").get();
    if (!doc.exists) {
      return DEFAULT_GLOBAL_CONFIG;
    }
    return (doc.data() as GlobalConfig) || DEFAULT_GLOBAL_CONFIG;
  } catch (error) {
    console.error("Failed to retrieve local config from Firestore, falling back to default:", error);
    return DEFAULT_GLOBAL_CONFIG;
  }
}

// 1. precios_get_matrix
mcpServer.tool("precios_get_matrix", "Returns the active pricing matrix", {}, async () => {
  const config = await getLocalConfig();
  const matrix: any[] = [];
  
  for (const prod of config.products) {
    const fabrics = config.materials.filter((m) => m.category === "fabric");
    for (const fabric of fabrics) {
      const analysis = calculateProductAnalysis(prod, config, fabric.id);
      
      // Look for variants
      const override = prod.variantOverrides?.[fabric.id];
      const finalRetail = override?.customRetailPrice ? override.customRetailPrice : analysis.recommendedPrice;
      const finalWholesale = override?.customWholesalePrice ? override.customWholesalePrice : analysis.recommendedWholesalePrice;

      matrix.push({
        garment: prod.name,
        fabric: fabric.name,
        consumptionMeters: prod.fabricQuantity,
        retailPrice: roundBob(finalRetail),
        wholesalePrice: roundBob(finalWholesale),
      });
    }
  }
  return { content: [{ type: "text", text: JSON.stringify(matrix, null, 2) }] };
});

// 2. precios_get_materials
mcpServer.tool("precios_get_materials", "Returns all fabrics and secondary supplies", {}, async () => {
  const config = await getLocalConfig();
  return { content: [{ type: "text", text: JSON.stringify(config.materials, null, 2) }] };
});

// 3. precios_add_product
mcpServer.tool("precios_add_product", "Adds a new garment to the products database", {
  name: z.string(),
  category: z.string(),
  fabricMeters: z.number(),
  laborCost: z.number(),
  description: z.string().optional()
}, async ({ name, category, fabricMeters, laborCost, description }) => {
  const config = await getLocalConfig();
  const newProduct = {
    id: `prod-${Date.now()}`,
    name,
    category,
    fabricQuantity: fabricMeters,
    ingredients: [],
    // Simple mock mappings
    productionWeight: 1, 
    ... (description ? { description } : {})
  };
  config.products.push(newProduct as any);
  await dbLocal.collection("config").doc("system-wide-config").set(config);
  return { content: [{ type: "text", text: `Product ${name} added successfully.` }] };
});

// 4. precios_update_fabric_cost
mcpServer.tool("precios_update_fabric_cost", "Updates the cost per meter for a fabric", {
  fabricName: z.string(),
  costPerMeter: z.number()
}, async ({ fabricName, costPerMeter }) => {
  const config = await getLocalConfig();
  const fabric = config.materials.find(m => m.name.toLowerCase() === fabricName.toLowerCase() && m.category === "fabric");
  if (!fabric) {
    return { content: [{ type: "text", text: `Fabric ${fabricName} not found.` }], isError: true };
  }
  fabric.pricePerUnit = costPerMeter;
  await dbLocal.collection("config").doc("system-wide-config").set(config);
  return { content: [{ type: "text", text: `Fabric ${fabricName} updated to Bs ${costPerMeter}/m.` }] };
});

// 5. precios_sync_to_ventas
mcpServer.tool("precios_sync_to_ventas", "Pulls complete matrix and writes directly to Ventas DB", {}, async () => {
  const config = await getLocalConfig();
  const resultPayload: any = {
    garments: {},
    lastSyncedAt: Date.now()
  };
  
  let count = 0;
  for (const prod of config.products) {
    resultPayload.garments[prod.name] = {};
    const fabrics = config.materials.filter((m) => m.category === "fabric");
    for (const fabric of fabrics) {
      const analysis = calculateProductAnalysis(prod, config, fabric.id);
      const override = prod.variantOverrides?.[fabric.id];
      const finalRetail = override?.customRetailPrice ? override.customRetailPrice : analysis.recommendedPrice;
      const finalWholesale = override?.customWholesalePrice ? override.customWholesalePrice : analysis.recommendedWholesalePrice;
      
      resultPayload.garments[prod.name][fabric.name] = {
        priceRaleo: roundBob(finalRetail),
        priceB2B: roundBob(finalWholesale)
      };
      count++;
    }
  }

  if (!dbVentas) {
    return { content: [{ type: "text", text: "Ventas DB not initialized" }], isError: true };
  }

  await dbVentas.collection("pricing").doc("global").set(resultPayload);

  return { content: [{ type: "text", text: JSON.stringify({
    success: true,
    syncedGarmentsCount: count,
    message: "Ventas pricing/global successfully updated"
  }) }] };
});

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json());

  app.get("/mcp", (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.json({ status: "ok", server: "azafran-precios", protocol: "mcp" });
  });

  app.post("/mcp", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    const { jsonrpc, id, method, params } = req.body || {};

    if (method === "initialize") {
      return res.json({
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "azafran-precios", version: "1.0.0" }
        }
      });
    }

    if (method === "notifications/initialized") {
      return res.status(200).json({});
    }

    if (method === "tools/list") {
      return res.json({
        jsonrpc: "2.0",
        id,
        result: {
          tools: [
            { name: "precios_get_matrix", description: "Get live rounded pricing matrix", inputSchema: { type: "object", properties: {} } },
            { name: "precios_get_materials", description: "Get fabrics and supplies costs", inputSchema: { type: "object", properties: {} } },
            { name: "precios_add_product", description: "Add a new garment", inputSchema: { type: "object", properties: { name: { type: "string" }, category: { type: "string" }, fabricMeters: { type: "number" }, laborCost: { type: "number" }, description: { type: "string" } }, required: ["name", "category", "fabricMeters", "laborCost"] } },
            { name: "precios_update_fabric_cost", description: "Update fabric cost per meter", inputSchema: { type: "object", properties: { fabricName: { type: "string" }, costPerMeter: { type: "number" } }, required: ["fabricName", "costPerMeter"] } },
            { name: "precios_sync_to_ventas", description: "Sync rounded prices to Ventas pricing/global", inputSchema: { type: "object", properties: {} } }
          ]
        }
      });
    }

    if (method === "tools/call") {
      const toolName = params?.name;
      const args = params?.arguments || {};
      let toolResult: any;

      try {
        if (toolName === "precios_get_matrix") {
          const config = await getLocalConfig();
          const matrix: any[] = [];
          for (const prod of config.products) {
            const fabrics = config.materials.filter((m) => m.category === "fabric");
            for (const fabric of fabrics) {
              const analysis = calculateProductAnalysis(prod, config, fabric.id);
              const override = prod.variantOverrides?.[fabric.id];
              const finalRetail = override?.customRetailPrice ? override.customRetailPrice : analysis.recommendedPrice;
              const finalWholesale = override?.customWholesalePrice ? override.customWholesalePrice : analysis.recommendedWholesalePrice;
              matrix.push({
                garment: prod.name,
                fabric: fabric.name,
                consumptionMeters: prod.fabricQuantity,
                retailPrice: roundBob(finalRetail),
                wholesalePrice: roundBob(finalWholesale),
              });
            }
          }
          toolResult = matrix;
        } else if (toolName === "precios_get_materials") {
          const config = await getLocalConfig();
          toolResult = config.materials;
        } else if (toolName === "precios_add_product") {
          const config = await getLocalConfig();
          const newProduct = {
            id: `prod-${Date.now()}`,
            name: args.name,
            category: args.category,
            fabricQuantity: args.fabricMeters,
            ingredients: [],
            productionWeight: 1, 
            ... (args.description ? { description: args.description } : {})
          };
          config.products.push(newProduct as any);
          await dbLocal.collection("config").doc("system-wide-config").set(config);
          toolResult = `Product ${args.name} added successfully.`;
        } else if (toolName === "precios_update_fabric_cost") {
          const config = await getLocalConfig();
          const fabric = config.materials.find(m => m.name.toLowerCase() === args.fabricName.toLowerCase() && m.category === "fabric");
          if (!fabric) {
            toolResult = `Fabric ${args.fabricName} not found.`;
          } else {
            fabric.pricePerUnit = args.costPerMeter;
            await dbLocal.collection("config").doc("system-wide-config").set(config);
            toolResult = `Fabric ${args.fabricName} updated to Bs ${args.costPerMeter}/m.`;
          }
        } else if (toolName === "precios_sync_to_ventas") {
          const config = await getLocalConfig();
          const resultPayload: any = {
            garments: {},
            lastSyncedAt: Date.now()
          };
          let count = 0;
          for (const prod of config.products) {
            resultPayload.garments[prod.name] = {};
            const fabrics = config.materials.filter((m) => m.category === "fabric");
            for (const fabric of fabrics) {
              const analysis = calculateProductAnalysis(prod, config, fabric.id);
              const override = prod.variantOverrides?.[fabric.id];
              const finalRetail = override?.customRetailPrice ? override.customRetailPrice : analysis.recommendedPrice;
              const finalWholesale = override?.customWholesalePrice ? override.customWholesalePrice : analysis.recommendedWholesalePrice;
              resultPayload.garments[prod.name][fabric.name] = {
                priceRaleo: roundBob(finalRetail),
                priceB2B: roundBob(finalWholesale)
              };
              count++;
            }
          }
          if (!dbVentas) {
            toolResult = "Ventas DB not initialized";
          } else {
            await dbVentas.collection("pricing").doc("global").set(resultPayload);
            toolResult = {
              success: true,
              syncedGarmentsCount: count,
              message: "Ventas pricing/global successfully updated"
            };
          }
        } else {
          toolResult = `Tool ${toolName} not found.`;
        }

        return res.json({
          jsonrpc: "2.0",
          id,
          result: {
            content: [{ type: "text", text: JSON.stringify(toolResult, null, 2) }]
          }
        });
      } catch (err: any) {
        return res.json({
          jsonrpc: "2.0",
          id,
          error: { code: -32000, message: err.message }
        });
      }
    }

    return res.status(404).json({ error: "Method not found" });
  });
  
  app.options("/mcp", (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.status(204).end();
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Azafrán Precios server running on port ${PORT}`);
  });
}

startServer();
