import "dotenv/config";
import cors from "cors";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { hashLicenseKey } from "./services/licenseService";

function collectCorsOrigins(): Set<string> {
  const allowed = new Set<string>();
  const appBase = process.env.APP_BASE_URL;
  if (appBase) {
    try {
      allowed.add(new URL(appBase).origin);
    } catch {
      /* ignore invalid APP_BASE_URL */
    }
  }
  const extra = process.env.CORS_ALLOWED_ORIGINS;
  if (extra) {
    for (const part of extra.split(",")) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      try {
        allowed.add(new URL(trimmed).origin);
      } catch {
        /* ignore invalid entry */
      }
    }
  }
  if (process.env.NODE_ENV !== "production") {
    for (const o of [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:5000",
      "http://127.0.0.1:5000",
    ]) {
      allowed.add(o);
    }
  }
  return allowed;
}

const corsAllowedOrigins = collectCorsOrigins();

const app = express();
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || corsAllowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "X-License-Entitlement", "X-Device-Id"],
  }),
);
app.use((req, res, next) => {
  // Stripe webhook must receive the untouched raw payload for signature checks.
  if (req.path === "/api/webhooks/stripe") return next();
  return express.json()(req, res, next);
});
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

async function seedDevLicense(): Promise<void> {
  const devKey = process.env.DEV_LICENSE_KEY;
  if (!devKey) return;

  try {
    const keyHash = hashLicenseKey(devKey);
    const existing = await storage.getLicenseByHash(keyHash);
    if (existing) {
      log(`[dev] Dev license already in DB — use key: ${devKey}`);
      return;
    }

    await storage.createLicense({
      licenseKey: devKey,
      licenseKeyHash: keyHash,
      stripeSessionId: `dev-seed-${Date.now()}`,
      customerEmail: "dev@local.test",
    });

    log(`[dev] Dev license seeded — activate the app with: ${devKey}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    log(`[dev] Dev license seed skipped: ${message}`);
  }
}

(async () => {
  try {
    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      throw err;
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    const port = parseInt(process.env.PORT || "5000", 10);
    // Railway forwards public traffic only to 0.0.0.0; NODE_ENV may be unset on the platform.
    const onRailway =
      process.env.RAILWAY_ENVIRONMENT !== undefined ||
      process.env.RAILWAY_PROJECT_ID !== undefined;
    const listenHost =
      process.env.HOST ??
      (process.env.NODE_ENV === "production" || onRailway ? "0.0.0.0" : "127.0.0.1");

    await new Promise<void>((resolve, reject) => {
      const onError = (err: Error) => reject(err);
      server.once("error", onError);
      server.listen(port, listenHost, () => {
        server.off("error", onError);
        log(`serving on http://${listenHost}:${port}`);
        resolve();
      });
    });

    // After listen so /api/health is reachable (e.g. Electron waitForServerReady)
    // even if DB seed is slow or hangs briefly.
    await seedDevLicense();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[server] Failed to start:", message);
    process.exit(1);
  }
})();
