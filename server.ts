import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp as initClientApp } from "firebase/app";
import { getFirestore as getClientDb, doc, setDoc } from "firebase/firestore";
import { publishPreciosToVentas } from "./src/utils/ventasPublisher.js";
import { registerMcpRoutes } from "./src/server/mcpRouter.js";
import firebaseConfig from "./firebase-applet-config.json";

const clientApp = initClientApp(firebaseConfig);
const clientDb = getClientDb(clientApp, firebaseConfig.firestoreDatabaseId);

let dbVentas: FirebaseFirestore.Firestore | undefined;
try {
  const appVentas = admin.initializeApp({ projectId: "mystic-return-81b2m" }, "ventas");
  dbVentas = getFirestore(appVentas, "ai-studio-0dba6e4d-b474-410e-b078-6e631bf1a01a");
} catch (e) {
  console.warn("External Ventas DB init notice:", e instanceof Error ? e.message : e);
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Mount dual-transport Model Context Protocol (MCP) router
  registerMcpRoutes(app, clientDb, dbVentas);

  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

  app.options("/api/pricing/sync", (_req, res) =>
    res
      .setHeader("Access-Control-Allow-Origin", "*")
      .setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
      .setHeader("Access-Control-Allow-Headers", "Content-Type")
      .status(204)
      .end()
  );

  app.post("/api/pricing/sync", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    try {
      const payload = req.body;
      if (payload) await setDoc(doc(clientDb, "pricing", "global"), payload, { merge: true });
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
      const result = await publishPreciosToVentas(clientDb, dbVentas);
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
