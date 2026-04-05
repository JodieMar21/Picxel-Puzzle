import type { Express } from "express";
import type { Server } from "http";

/** Bundled via esbuild alias picxel-vite-dev → this file; production never calls setupVite. */
export async function setupVite(_app: Express, _server: Server): Promise<void> {}
