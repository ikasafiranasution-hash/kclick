import express from "express";
import * as path from "path";
import { createServer as createViteServer } from "vite";
import { createApp } from "./src/server/app";

const PORT = 3000;

async function startServer() {
  const app = createApp();

  // Vite middleware for dev or static for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: any, res: any) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`K-Click server running at http://localhost:${PORT}`);
  });
}

startServer();
