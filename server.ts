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

// Initialize Firebase Apps
const localApp = admin.initializeApp();
const dbLocal = getFirestore(localApp);

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
  const doc = await dbLocal.collection("config").doc("system-wide-config").get();
  if (!doc.exists) {
    throw new Error("Local config not found");
  }
  return doc.data() as GlobalConfig;
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

  // Global Transport Instance
  let transport: SSEServerTransport | null = null;

  app.get("/mcp", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    transport = new SSEServerTransport("/mcp", res);
    await mcpServer.connect(transport);
  });

  app.post("/mcp", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    if (!transport) {
      res.status(400).send("MCP transport not initialized. Please call GET /mcp first.");
      return;
    }
    await transport.handlePostMessage(req, res);
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
