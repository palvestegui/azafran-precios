import { Express, Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import { Firestore as ClientFirestore } from "firebase/firestore";
import type { Firestore as AdminFirestore } from "firebase-admin/firestore";
import { publishPreciosToVentas } from "../utils/ventasPublisher.js";
import {
  getLocalConfig,
  buildMatrix,
  buildBundle,
  addProduct,
  updateFabricCost,
} from "./catalogServices.js";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, x-session-id, mcp-session-id, cache-control",
};

export function createMcpServerInstance(
  clientDb: ClientFirestore,
  dbVentas?: AdminFirestore
): McpServer {
  const mcp = new McpServer(
    { name: "azafran-precios", version: "1.0.0" },
    { capabilities: { tools: {}, prompts: {}, resources: {} } }
  );

  mcp.tool(
    "precios_get_bundle",
    "Unified bundle of materials, products, matrix, and catalog stats",
    {},
    async () => ({
      content: [{ type: "text", text: JSON.stringify(buildBundle(await getLocalConfig(clientDb)), null, 2) }],
    })
  );

  mcp.tool(
    "precios_get_matrix",
    "Returns active pricing matrix",
    {},
    async () => ({
      content: [{ type: "text", text: JSON.stringify(buildMatrix(await getLocalConfig(clientDb)), null, 2) }],
    })
  );

  mcp.tool(
    "precios_get_materials",
    "Returns fabrics and supplies",
    {},
    async () => ({
      content: [{ type: "text", text: JSON.stringify((await getLocalConfig(clientDb)).materials, null, 2) }],
    })
  );

  mcp.tool(
    "precios_add_product",
    "Adds a new garment",
    {
      name: z.string().describe("Name of the garment"),
      category: z.string().describe("Product category"),
      fabricMeters: z.number().describe("Fabric consumption in meters"),
      laborCost: z.number().describe("Labor cost in BOB"),
      description: z.string().optional().describe("Optional garment description"),
    },
    async ({ name, category, fabricMeters, description }) => ({
      content: [{ type: "text", text: await addProduct(clientDb, name, category, fabricMeters, description) }],
    })
  );

  mcp.tool(
    "precios_update_fabric_cost",
    "Updates fabric cost per meter",
    {
      fabricName: z.string().describe("Fabric material name"),
      costPerMeter: z.number().describe("Cost per meter in BOB"),
    },
    async ({ fabricName, costPerMeter }) => {
      const res = await updateFabricCost(clientDb, fabricName, costPerMeter);
      return { content: [{ type: "text", text: res.message }], isError: res.isError };
    }
  );

  mcp.tool(
    "precios_sync_to_ventas",
    "Syncs rounded prices to Ventas DB",
    {},
    async () => {
      try {
        const result = await publishPreciosToVentas(clientDb, dbVentas);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                baseCount: result.baseCount,
                catalogCount: result.catalogCount,
                lastSyncedAt: result.lastSyncedAt,
              }),
            },
          ],
        };
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text", text: JSON.stringify({ success: false, error: errorMsg }) }], isError: true };
      }
    }
  );

  return mcp;
}

const MCP_TOOLS_METADATA = [
  { name: "precios_get_bundle", description: "Get complete catalog bundle (materials, products, matrix, stats)", inputSchema: { type: "object", properties: {} } },
  { name: "precios_get_matrix", description: "Get live rounded pricing matrix", inputSchema: { type: "object", properties: {} } },
  { name: "precios_get_materials", description: "Get fabrics and supplies costs", inputSchema: { type: "object", properties: {} } },
  {
    name: "precios_add_product",
    description: "Add a new garment",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        category: { type: "string" },
        fabricMeters: { type: "number" },
        laborCost: { type: "number" },
        description: { type: "string" },
      },
      required: ["name", "category", "fabricMeters", "laborCost"],
    },
  },
  {
    name: "precios_update_fabric_cost",
    description: "Update fabric cost per meter",
    inputSchema: {
      type: "object",
      properties: {
        fabricName: { type: "string" },
        costPerMeter: { type: "number" },
      },
      required: ["fabricName", "costPerMeter"],
    },
  },
  { name: "precios_sync_to_ventas", description: "Sync rounded prices to Ventas pricing/global", inputSchema: { type: "object", properties: {} } },
];

async function handleStatelessCall(
  toolName: string,
  args: Record<string, unknown>,
  clientDb: ClientFirestore,
  dbVentas?: AdminFirestore
): Promise<unknown> {
  const config = await getLocalConfig(clientDb);
  if (toolName === "precios_get_bundle") return buildBundle(config);
  if (toolName === "precios_get_matrix") return buildMatrix(config);
  if (toolName === "precios_get_materials") return config.materials;
  if (toolName === "precios_add_product") {
    return addProduct(
      clientDb,
      typeof args.name === "string" ? args.name : "Nueva Prenda",
      typeof args.category === "string" ? args.category : "General",
      typeof args.fabricMeters === "number" ? args.fabricMeters : 1,
      typeof args.description === "string" ? args.description : undefined
    );
  }
  if (toolName === "precios_update_fabric_cost") {
    const res = await updateFabricCost(
      clientDb,
      typeof args.fabricName === "string" ? args.fabricName : "",
      typeof args.costPerMeter === "number" ? args.costPerMeter : 0
    );
    return res.message;
  }
  if (toolName === "precios_sync_to_ventas") {
    const syncRes = await publishPreciosToVentas(clientDb, dbVentas);
    return { success: true, baseCount: syncRes.baseCount, catalogCount: syncRes.catalogCount, lastSyncedAt: syncRes.lastSyncedAt };
  }
  throw new Error(`Tool '${toolName}' not found`);
}

export function registerMcpRoutes(app: Express, clientDb: ClientFirestore, dbVentas?: AdminFirestore): void {
  const transports: Record<string, SSEServerTransport> = {};

  const handleCors = (_req: Request, res: Response) => {
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
    res.status(204).end();
  };

  app.options("/mcp", handleCors);
  app.options("/mcp/messages", handleCors);

  app.get("/mcp", async (req: Request, res: Response) => {
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
    const isEventStream = req.headers.accept?.includes("text/event-stream");

    if (!isEventStream) {
      return res.json({ status: "ok", server: "azafran-precios", protocol: "mcp", transports: ["sse", "jsonrpc-http"] });
    }

    try {
      const transport = new SSEServerTransport("/mcp/messages", res);
      const sessionId = transport.sessionId;
      transports[sessionId] = transport;

      const heartbeat = setInterval(() => {
        if (!res.writableEnded) res.write(": keep-alive\n\n");
      }, 15000);

      transport.onclose = () => {
        clearInterval(heartbeat);
        delete transports[sessionId];
      };

      const server = createMcpServerInstance(clientDb, dbVentas);
      await server.connect(transport);
    } catch (err: unknown) {
      console.error("MCP SSE Stream error:", err);
      if (!res.headersSent) res.status(500).send("Error establishing SSE stream");
    }
  });

  const postHandler = async (req: Request, res: Response) => {
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
    const sessionId = (req.query.sessionId as string | undefined) || (req.headers["mcp-session-id"] as string | undefined);

    if (sessionId && transports[sessionId]) {
      try {
        await transports[sessionId].handlePostMessage(req, res, req.body);
        return;
      } catch (err: unknown) {
        console.error("MCP Transport Post error:", err);
        if (!res.headersSent) res.status(500).json({ error: String(err) });
        return;
      }
    }

    // Stateless JSON-RPC 2.0 Handler
    const { jsonrpc, id, method, params } = req.body || {};
    if (method === "initialize") {
      return res.json({
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {}, prompts: {}, resources: {} },
          serverInfo: { name: "azafran-precios", version: "1.0.0" },
        },
      });
    }

    if (method === "notifications/initialized") return res.status(200).json({});
    if (method === "ping") return res.json({ jsonrpc: "2.0", id, result: {} });
    if (method === "prompts/list") return res.json({ jsonrpc: "2.0", id, result: { prompts: [] } });
    if (method === "resources/list") return res.json({ jsonrpc: "2.0", id, result: { resources: [] } });
    if (method === "resources/templates/list") return res.json({ jsonrpc: "2.0", id, result: { resourceTemplates: [] } });
    if (method === "tools/list") return res.json({ jsonrpc: "2.0", id, result: { tools: MCP_TOOLS_METADATA } });

    if (method === "tools/call") {
      const toolName = params?.name;
      const args = (params?.arguments || {}) as Record<string, unknown>;
      try {
        const result = await handleStatelessCall(toolName, args, clientDb, dbVentas);
        return res.json({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] } });
      } catch (err: unknown) {
        return res.json({
          jsonrpc: "2.0",
          id,
          result: { content: [{ type: "text", text: err instanceof Error ? err.message : String(err) }], isError: true },
        });
      }
    }

    return res.json({
      jsonrpc: "2.0",
      id: id ?? null,
      error: { code: -32601, message: `Method '${method}' not found` },
    });
  };

  app.post("/mcp", postHandler);
  app.post("/mcp/messages", postHandler);
}
