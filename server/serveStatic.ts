import express, { type Express } from "express";
import fs from "fs";
import path from "path";

/** Resolves `dist/public` next to the bundled `dist/index.cjs` (argv[1]), for both `node` and Electron. */
function productionPublicDir(): string {
  const entry = process.argv[1];
  const scriptDir = entry ? path.dirname(path.resolve(entry)) : process.cwd();
  return path.join(scriptDir, "public");
}

export function serveStatic(app: Express) {
  const distPath = productionPublicDir();

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
