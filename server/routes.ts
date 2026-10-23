import type { Express, Request } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  activateLicense2faSchema,
  activateLicenseSchema,
  checkoutPlanSchema,
  coachChatRequestSchema,
  deactivateLicenseSchema,
  license2faCodeSchema,
  insertProjectSchema,
  validateLicenseSchema,
} from "@shared/schema";
import multer, { FileFilterCallback } from "multer";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import { licenseService } from "./services/licenseService";
import {
  createCheckoutSession,
  handleStripeWebhook,
  getLicenseKeyForSession,
  resolvePriceIdForPlan,
} from "./services/stripeService";
import { getCoachAccountContext, runCoachChat } from "./services/coach/coachService";
import { licenseTwoFactorService } from "./services/licenseTwoFactorService";
import { log } from "./log";

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

function resolveUploadDir(): string {
  return process.env.FRACTIX_UPLOAD_DIR || process.env.UPLOAD_PATH || "uploads";
}

function createUploadMiddleware() {
  return multer({
    dest: resolveUploadDir(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Invalid file type. Only JPEG and PNG are allowed."));
      }
    },
  });
}

// Custom brick color palette (39 colors) - exact RGB values from Excel chart
const BRICK_COLORS = [
  { name: "Cactus", hex: "#000000" },
  { name: "Basketball Court", hex: "#3C3C3C" },
  { name: "Kite", hex: "#5F5F5F" },
  { name: "Controller", hex: "#A0A0A0" },
  { name: "Soccer Ball", hex: "#F5F5F5" },
  { name: "Hamburger", hex: "#5A1E0A" },
  { name: "Basketball", hex: "#780000" },
  { name: "Watermelon", hex: "#AA0000" },
  { name: "Football", hex: "#E65064" },
  { name: "Pokercard", hex: "#FFC8E6" },
  { name: "Finishing Flag", hex: "#C855A0" },
  { name: "Rocket", hex: "#9B0069" },
  { name: "Hotdog", hex: "#4B5528" },
  { name: "Cocktail Glass", hex: "#005032" },
  { name: "Clapperboard", hex: "#00785A" },
  { name: "Game Controller", hex: "#00A528" },
  { name: "French Fries", hex: "#A0C814" },
  { name: "Popsicle", hex: "#AAFFAA" },
  { name: "Bread", hex: "#825032" },
  { name: "Ghost", hex: "#AF9655" },
  { name: "Fried Egg", hex: "#787355" },
  { name: "Cupcake", hex: "#648264" },
  { name: "Biscuit", hex: "#C7925B" },
  { name: "Sunglasses", hex: "#FFA546" },
  { name: "Carrot", hex: "#F0876E" },
  { name: "Pizza", hex: "#FAAA82" },
  { name: "Guitar", hex: "#FFFC30" },
  { name: "Crayon", hex: "#F0DC96" },
  { name: "Lemon", hex: "#FFFF96" },
  { name: "Backboard", hex: "#FFDCC8" },
  { name: "Hourglass", hex: "#5A4196" },
  { name: "Tv", hex: "#2D1473" },
  { name: "Table Tennis", hex: "#505F78" },
  { name: "Usb", hex: "#00468C" },
  { name: "Mouse", hex: "#006EB4" },
  { name: "Balloon", hex: "#5FA5F5" },
  { name: "Diskette", hex: "#46D2E6" },
  { name: "Heart", hex: "#B9FFEB" },
  { name: "Cross Swords", hex: "#D88571" },
];

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 0, 0];
}

// Convert RGB to LAB color space for better color matching
function rgbToLab(rgb: [number, number, number]): [number, number, number] {
  let [r, g, b] = rgb.map((c) => {
    c = c / 255;
    c = c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92;
    return c * 100;
  });

  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 95.047;
  const y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 100.0;
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 108.883;

  const fx = x > 0.008856 ? Math.pow(x, 1 / 3) : 7.787 * x + 16 / 116;
  const fy = y > 0.008856 ? Math.pow(y, 1 / 3) : 7.787 * y + 16 / 116;
  const fz = z > 0.008856 ? Math.pow(z, 1 / 3) : 7.787 * z + 16 / 116;

  const L = 116 * fy - 16;
  const A = 500 * (fx - fy);
  const B = 200 * (fy - fz);

  return [L, A, B];
}

// Calculate perceptual color difference using Delta-E CIE 2000
function colorDistance(
  color1: [number, number, number],
  color2: [number, number, number]
): number {
  const lab1 = rgbToLab(color1);
  const lab2 = rgbToLab(color2);

  const deltaL = lab1[0] - lab2[0];
  const deltaA = lab1[1] - lab2[1];
  const deltaB = lab1[2] - lab2[2];

  return Math.sqrt(deltaL * deltaL + deltaA * deltaA + deltaB * deltaB);
}

function findClosestBrickColor(
  rgb: [number, number, number],
  palette: { name: string; hex: string }[] = BRICK_COLORS,
): { name: string; hex: string } {
  const colors = palette.length > 0 ? palette : BRICK_COLORS;
  let closestColor = colors[0];
  let minDistance = Infinity;

  for (const color of colors) {
    const brickRgb = hexToRgb(color.hex);
    const distance = colorDistance(rgb, brickRgb);

    if (distance < minDistance) {
      minDistance = distance;
      closestColor = color;
    }
  }

  return closestColor;
}

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

/** Floyd–Steinberg dithering into the brick palette. */
function ditherToBrickPalette(
  data: Buffer,
  width: number,
  height: number,
  channels: number,
  palette: { name: string; hex: string }[],
): string[][] {
  const buffer: number[][][] = [];
  for (let y = 0; y < height; y++) {
    const row: number[][] = [];
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      row.push([data[idx] || 0, data[idx + 1] || 0, data[idx + 2] || 0]);
    }
    buffer.push(row);
  }

  const result: string[][] = [];
  for (let y = 0; y < height; y++) {
    const outRow: string[] = [];
    for (let x = 0; x < width; x++) {
      const old = buffer[y][x];
      const rgb: [number, number, number] = [
        clampByte(old[0]),
        clampByte(old[1]),
        clampByte(old[2]),
      ];
      const brick = findClosestBrickColor(rgb, palette);
      const nr = hexToRgb(brick.hex);
      outRow.push(brick.hex);

      const errR = rgb[0] - nr[0];
      const errG = rgb[1] - nr[1];
      const errB = rgb[2] - nr[2];

      const diffuse = (nx: number, ny: number, factor: number) => {
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) return;
        buffer[ny][nx][0] += errR * factor;
        buffer[ny][nx][1] += errG * factor;
        buffer[ny][nx][2] += errB * factor;
      };

      diffuse(x + 1, y, 7 / 16);
      diffuse(x - 1, y + 1, 3 / 16);
      diffuse(x, y + 1, 5 / 16);
      diffuse(x + 1, y + 1, 1 / 16);
    }
    result.push(outRow);
  }
  return result;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const uploadDir = resolveUploadDir();
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  const upload = createUploadMiddleware();

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.post("/api/license/activate", async (req, res) => {
    try {
      const payload = activateLicenseSchema.parse(req.body);
      const result = await licenseTwoFactorService.activateWithOptional2fa(payload);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message ?? "License activation failed." });
    }
  });

  app.post("/api/license/activate/2fa", async (req, res) => {
    try {
      const payload = activateLicense2faSchema.parse(req.body);
      const result = await licenseTwoFactorService.completeActivationWith2fa(payload);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message ?? "Two-factor verification failed." });
    }
  });

  async function licenseFromEntitlementHeaders(req: Request) {
    const entitlement = req.header("x-license-entitlement");
    const deviceId = req.header("x-device-id");
    if (!entitlement || !deviceId) {
      throw new Error("License entitlement required.");
    }
    const tokenPayload = licenseService.verifyEntitlement(entitlement);
    if (tokenPayload.deviceId !== deviceId) {
      throw new Error("License entitlement does not match this device.");
    }
    const license = await storage.getLicenseByHash(tokenPayload.licenseKeyHash);
    if (!license) {
      throw new Error("License not found.");
    }
    return license;
  }

  app.get("/api/license/2fa/status", async (req, res) => {
    try {
      const license = await licenseFromEntitlementHeaders(req);
      res.json(await licenseTwoFactorService.getStatus(license));
    } catch (error: any) {
      res.status(400).json({ message: error.message ?? "Could not load two-factor status." });
    }
  });

  app.post("/api/license/2fa/setup", async (req, res) => {
    try {
      const license = await licenseFromEntitlementHeaders(req);
      const result = await licenseTwoFactorService.startSetup(license);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message ?? "Could not start two-factor setup." });
    }
  });

  app.post("/api/license/2fa/confirm", async (req, res) => {
    try {
      const license = await licenseFromEntitlementHeaders(req);
      const { code } = license2faCodeSchema.parse(req.body ?? {});
      res.json(await licenseTwoFactorService.confirmSetup(license, code));
    } catch (error: any) {
      res.status(400).json({ message: error.message ?? "Could not enable two-factor authentication." });
    }
  });

  app.post("/api/license/2fa/cancel-setup", async (req, res) => {
    try {
      const license = await licenseFromEntitlementHeaders(req);
      res.json(await licenseTwoFactorService.cancelSetup(license));
    } catch (error: any) {
      res.status(400).json({ message: error.message ?? "Could not cancel two-factor setup." });
    }
  });

  app.post("/api/license/2fa/disable", async (req, res) => {
    try {
      const license = await licenseFromEntitlementHeaders(req);
      const { code } = license2faCodeSchema.parse(req.body ?? {});
      res.json(await licenseTwoFactorService.disable(license, code));
    } catch (error: any) {
      res.status(400).json({ message: error.message ?? "Could not disable two-factor authentication." });
    }
  });

  app.post("/api/license/validate", async (req, res) => {
    try {
      const payload = validateLicenseSchema.parse(req.body);
      const result = await licenseService.validate(payload);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message ?? "License validation failed." });
    }
  });

  app.post("/api/license/deactivate", async (req, res) => {
    try {
      const payload = deactivateLicenseSchema.parse(req.body);
      await licenseService.deactivate(payload);
      res.json({ ok: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message ?? "License deactivation failed." });
    }
  });

  app.post("/api/license/deactivate-all", async (req, res) => {
    try {
      const payload = deactivateLicenseSchema.parse(req.body);
      await licenseService.deactivateAll(payload);
      res.json({ ok: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message ?? "License deactivation failed." });
    }
  });

  // Stripe checkout session creation — plan maps to STRIPE_PRICE_ID / STRIPE_PRICE_PRO_ID
  app.post("/api/checkout", async (req, res) => {
    try {
      const parsed = checkoutPlanSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid checkout plan. Use basic or pro." });
      }
      const plan = parsed.data.plan;
      let priceId: string;
      try {
        priceId = resolvePriceIdForPlan(plan);
      } catch (error: any) {
        return res.status(400).json({ message: error.message ?? "Stripe price not configured for this plan." });
      }

      const rawBase =
        process.env.APP_BASE_URL ?? `http://localhost:${process.env.PORT ?? 5000}`;
      const appBaseUrl = rawBase.replace(/\/+$/, "");
      const result = await createCheckoutSession({
        priceId,
        successUrl: `${appBaseUrl}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${appBaseUrl}/`,
      });

      res.json({ ...result, plan });
    } catch (error: any) {
      console.error("Checkout error:", error);
      res.status(500).json({ message: error.message ?? "Failed to create checkout session." });
    }
  });

  // Stripe webhook — must use raw body, registered before express.json() processes it
  app.post(
    "/api/webhooks/stripe",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      const signature = req.headers["stripe-signature"];
      console.log(
        `[stripe:webhook] Request received signaturePresent=${typeof signature === "string"} bodyIsBuffer=${Buffer.isBuffer(req.body)}`,
      );
      if (!signature || typeof signature !== "string") {
        return res.status(400).json({ message: "Missing stripe-signature header." });
      }

      try {
        await handleStripeWebhook(req.body as Buffer, signature);
        res.json({ received: true });
      } catch (error: any) {
        console.error("[stripe:webhook] Webhook error:", error);
        res.status(400).json({ message: error.message ?? "Webhook handling failed." });
      }
    }
  );

  function maskStripeSessionId(id: string): string {
    return id.length <= 12 ? id : `${id.slice(0, 12)}…`;
  }

  // Public contact / support form → emails CONTACT_EMAIL (default jodie-mar@hotmail.com)
  app.post("/api/contact", async (req, res) => {
    try {
      const name = String(req.body?.name ?? "").trim();
      const email = String(req.body?.email ?? "").trim();
      const topic = String(req.body?.topic ?? "").trim();
      const message = String(req.body?.message ?? "").trim();

      if (!name || !email || !topic || !message) {
        return res.status(400).json({ message: "Name, email, topic, and message are required." });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ message: "Please provide a valid email address." });
      }
      if (message.length > 5000) {
        return res.status(400).json({ message: "Message is too long (max 5000 characters)." });
      }

      const { sendContactEmail } = await import("./services/emailService");
      const result = await sendContactEmail({ name, email, topic, message });
      res.json({
        ok: true,
        delivered: result.delivered,
        message: result.delivered
          ? "Message sent. We’ll get back to you soon."
          : "Message received. Email delivery is not configured on the server yet — we’ll still follow up.",
      });
    } catch (error: any) {
      console.error("[contact] Failed to send support email:", error);
      res.status(500).json({ message: error.message ?? "Failed to send message." });
    }
  });

  // License key lookup by Stripe session (for purchase success page)
  app.get("/api/license/lookup", async (req, res) => {
    const origin = req.headers.origin ?? "none";
    const sessionId = req.query.session_id;
    if (!sessionId || typeof sessionId !== "string") {
      log(`[license:lookup] origin=${origin} session=(missing) status=400`);
      return res.status(400).json({ message: "Missing session_id query parameter." });
    }

    const sessionLabel = maskStripeSessionId(sessionId);
    log(`[license:lookup] origin=${origin} session=${sessionLabel}`);

    try {
      const licenseKey = await getLicenseKeyForSession(sessionId);
      if (!licenseKey) {
        log(`[license:lookup] origin=${origin} session=${sessionLabel} status=404 not_ready`);
        return res.status(404).json({ message: "License not found for this session. It may still be processing — please check your email." });
      }
      log(`[license:lookup] origin=${origin} session=${sessionLabel} status=200 ok`);
      res.json({ licenseKey });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[license:lookup] origin=${origin} session=${sessionLabel}`, error);
      res.status(500).json({ message: message || "Failed to look up license." });
    }
  });

  app.use("/api", (req, res, next) => {
    if (req.path === "/health") return next();
    if (req.path.startsWith("/license/")) return next();
    if (req.path === "/checkout") return next();
    if (req.path === "/contact") return next();
    if (req.path.startsWith("/webhooks/")) return next();
    // Static brick palette — safe to serve without entitlement.
    if (req.path === "/lego-colors") return next();

    const entitlement = req.header("x-license-entitlement");
    const deviceId = req.header("x-device-id");
    if (!entitlement || !deviceId) {
      return res.status(401).json({ message: "License entitlement required." });
    }

    try {
      const payload = licenseService.verifyEntitlement(entitlement);
      if (payload.deviceId !== deviceId) {
        return res.status(401).json({ message: "License entitlement does not match this device." });
      }
      if (new Date(payload.nextCheckAt) <= new Date()) {
        return res.status(428).json({ message: "License revalidation required." });
      }
      next();
    } catch (error: any) {
      return res.status(401).json({ message: error.message ?? "Invalid license entitlement." });
    }
  });

  // Upload image endpoint
  app.post("/api/upload", upload.single("image"), async (req: MulterRequest, res) => {
    console.log("Middleware reached, req.file:", req.file);
    try {
      console.log("Received file:", req.file); // Debug log to check file reception
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { name, boardCount, boardLayout, boardRows, boardCols, tileSize } = req.body;

      if (!name || !boardCount || !boardLayout) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const parsedTileSize = Number(tileSize);
      const pendingTileSize =
        Number.isFinite(parsedTileSize) && [16, 24, 32, 48].includes(parsedTileSize)
          ? parsedTileSize
          : 32;

      // Create project
      const project = await storage.createProject({
        name,
        originalImageUrl: req.file.path,
        boardCount: parseInt(boardCount, 10), // Ensure integer parsing
        boardLayout,
        boardRows: boardRows ? parseInt(boardRows, 10) : undefined,
        boardCols: boardCols ? parseInt(boardCols, 10) : undefined,
      });

      // Persist tile size for processing (no dedicated DB column yet).
      const withTileSize = await storage.updateProject(project.id, {
        colorData: { pendingTileSize },
      });

      res.json(withTileSize ?? project);
    } catch (error: any) {
      console.error("Upload error:", error); // Log the full error for debugging
      res.status(500).json({ message: "Upload failed", error: error.message }); // Return error details
    }
  });

  // Process image endpoint
  app.post("/api/projects/:id/process", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const bodyTileSize = Number(req.body?.tileSize);
      const pendingTileSize = Number(
        (project.colorData as { pendingTileSize?: number } | null)?.pendingTileSize,
      );
      const requestedTileSize = [bodyTileSize, pendingTileSize].find(
        (value) => Number.isFinite(value) && [16, 24, 32, 48].includes(value),
      );
      const boardSize = requestedTileSize ?? 32; // Each board is tileSize x tileSize tiles
      const useDithering = req.body?.qualityMode === "dithered" || req.body?.dithering === true;
      const ownedHexes: string[] = Array.isArray(req.body?.ownedColorHexes)
        ? req.body.ownedColorHexes
            .filter((h: unknown): h is string => typeof h === "string")
            .map((h: string) => h.trim().toUpperCase())
        : [];
      const activePalette =
        ownedHexes.length > 0
          ? BRICK_COLORS.filter((c) => ownedHexes.includes(c.hex.toUpperCase()))
          : BRICK_COLORS;
      const palette = activePalette.length > 0 ? activePalette : BRICK_COLORS;
      console.log(
        `[process] project=${project.id} boardSize=${boardSize} bodyTile=${bodyTileSize} pendingTile=${pendingTileSize} dither=${useDithering} palette=${palette.length}`,
      );
      let gridCols, gridRows;

      // Use stored boardRows and boardCols if available, otherwise fall back to layout parsing
      if (project.boardRows && project.boardCols) {
        gridRows = project.boardRows;
        gridCols = project.boardCols;
      } else {
        // Fallback to old logic for backward compatibility
        switch (project.boardLayout) {
          case "2x2":
            gridCols = gridRows = 2;
            break;
          case "3x2":
            gridCols = 3;
            gridRows = 2;
            break;
          case "3x3":
            gridCols = gridRows = 3;
            break;
          case "4x2":
            gridCols = 4;
            gridRows = 2;
            break;
          default:
            gridCols = gridRows = Math.ceil(Math.sqrt(project.boardCount));
        }
      }

      const totalWidth = gridCols * boardSize;
      const totalHeight = gridRows * boardSize;

      const imageBuffer = await sharp(project.originalImageUrl)
        .resize(totalWidth, totalHeight, {
          fit: "fill",
          kernel: sharp.kernel.lanczos3,
        })
        .gamma(2.2)
        .normalize()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const { data, info } = imageBuffer;
      const colorUsage = new Map<string, number>();

      console.log(`Processing image: ${info.width}x${info.height}, channels: ${info.channels}`);

      let pixelatedData: string[][];
      if (useDithering) {
        pixelatedData = ditherToBrickPalette(
          data,
          info.width,
          info.height,
          info.channels,
          palette,
        );
      } else {
        pixelatedData = [];
        for (let y = 0; y < info.height; y++) {
          const row: string[] = [];
          for (let x = 0; x < info.width; x++) {
            const idx = (y * info.width + x) * info.channels;
            const rgb: [number, number, number] = [
              data[idx] || 0,
              data[idx + 1] || 0,
              data[idx + 2] || 0,
            ];
            const brickColor = findClosestBrickColor(rgb, palette);
            row.push(brickColor.hex);
          }
          pixelatedData.push(row);
        }
      }

      for (let y = 0; y < pixelatedData.length; y++) {
        for (let x = 0; x < pixelatedData[y].length; x++) {
          const hex = pixelatedData[y][x];
          const brick =
            palette.find((c) => c.hex.toUpperCase() === hex.toUpperCase()) ||
            findClosestBrickColor(hexToRgb(hex), palette);
          const key = `${brick.name}|${brick.hex}`;
          colorUsage.set(key, (colorUsage.get(key) || 0) + 1);
        }
      }

      console.log(`Color mapping complete. Found ${colorUsage.size} unique colors`);
      Array.from(colorUsage.entries())
        .slice(0, 10)
        .forEach(([key, count]) => {
          console.log(`  ${key}: ${count} pixels`);
        });

      const boards = [];
      for (let boardRow = 0; boardRow < gridRows; boardRow++) {
        for (let boardCol = 0; boardCol < gridCols; boardCol++) {
          const boardPixels: string[][] = [];

          for (let y = 0; y < boardSize; y++) {
            const row: string[] = [];
            for (let x = 0; x < boardSize; x++) {
              const globalY = boardRow * boardSize + y;
              const globalX = boardCol * boardSize + x;

              if (globalY < pixelatedData.length && globalX < pixelatedData[0].length) {
                row.push(pixelatedData[globalY][globalX]);
              } else {
                row.push("#FFFFFF"); // Default to white for out-of-bounds
              }
            }
            boardPixels.push(row);
          }

          const boardId = String.fromCharCode(65 + boardCol) + (boardRow + 1); // A1, B1, etc.
          boards.push({
            id: boardId,
            position: { row: boardRow, col: boardCol },
            pixels: boardPixels,
          });
        }
      }

      const colorMap = Array.from(colorUsage.entries()).map(([key, count]) => {
        const [name, hex] = key.split("|");
        return { name, hex, count };
      });

      const pixelatedImageBuffer = Buffer.alloc(info.width * info.height * 3);
      let bufferIdx = 0;

      for (let y = 0; y < info.height; y++) {
        for (let x = 0; x < info.width; x++) {
          const hex = pixelatedData[y][x];
          const rgb = hexToRgb(hex);
          pixelatedImageBuffer[bufferIdx++] = rgb[0];
          pixelatedImageBuffer[bufferIdx++] = rgb[1];
          pixelatedImageBuffer[bufferIdx++] = rgb[2];
        }
      }

      const pngBuffer = await sharp(pixelatedImageBuffer, {
        raw: { width: info.width, height: info.height, channels: 3 },
      }).png().toBuffer();

      const pixelatedImageData = `data:image/png;base64,${pngBuffer.toString("base64")}`;

      const pixelationResult = {
        pixelatedImageData,
        colorMap,
        boards,
        totalTiles: totalWidth * totalHeight,
        boardTileSize: boardSize,
      };

      const updatedProject = await storage.updateProject(req.params.id, {
        pixelatedImageUrl: pixelatedImageData,
        colorData: {
          colorMap,
          boards,
          totalTiles: totalWidth * totalHeight,
          boardTileSize: boardSize,
        },
        pixelationResult,
        status: "completed",
      });

      res.json(pixelationResult);
    } catch (error: any) {
      console.error("Processing error:", error);
      await storage.updateProject(req.params.id, { status: "failed" });
      res.status(500).json({ message: "Processing failed", error: error.message });
    }
  });

  // Get all saved projects
  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await storage.getAllProjects();
      res.json(projects);
    } catch (error: any) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects", error: error.message });
    }
  });

  // Get project
  app.get("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get project", error: error.message });
    }
  });

  // Save a project manually (for manual saves in the app)
  app.post("/api/projects/:id/save", async (req, res) => {
    try {
      const { name, pixelationResult } = req.body;

      if (!pixelationResult) {
        return res.status(400).json({ message: "Pixelation result is required" });
      }

      const updatedProject = await storage.updateProject(req.params.id, {
        name: name || `Saved Project ${new Date().toLocaleDateString()}`,
        pixelationResult,
        status: "completed",
      });

      if (!updatedProject) {
        return res.status(404).json({ message: "Project not found" });
      }

      res.json(updatedProject);
    } catch (error: any) {
      console.error("Error saving project:", error);
      res.status(500).json({ message: "Failed to save project", error: error.message });
    }
  });

  // Delete a project
  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.originalImageUrl && !project.originalImageUrl.startsWith("data:")) {
        try {
          fs.unlinkSync(project.originalImageUrl);
        } catch (e) {
          console.log("Could not delete original image file:", e);
        }
      }

      await storage.updateProject(req.params.id, { status: "deleted" });

      res.json({ message: "Project deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Failed to delete project", error: error.message });
    }
  });

  // Get brick colors
  app.get("/api/lego-colors", (req, res) => {
    res.json(BRICK_COLORS);
  });

  // Fractix Coach — requires license entitlement (middleware above)
  app.get("/api/coach/account-context", async (req, res) => {
    try {
      const entitlement = req.header("x-license-entitlement")!;
      const payload = licenseService.verifyEntitlement(entitlement);
      const license = await storage.getLicenseByHash(payload.licenseKeyHash);
      if (!license) {
        return res.status(404).json({ message: "License not found." });
      }
      const snapshot = await getCoachAccountContext(license);
      res.json(snapshot);
    } catch (error: any) {
      console.error("Coach account-context error:", error);
      res.status(500).json({ message: error.message ?? "Failed to load account context." });
    }
  });

  app.post("/api/coach/chat", async (req, res) => {
    try {
      const parsed = coachChatRequestSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid coach chat request.", issues: parsed.error.issues });
      }

      const entitlement = req.header("x-license-entitlement")!;
      const deviceId = req.header("x-device-id")!;
      const payload = licenseService.verifyEntitlement(entitlement);
      const license = await storage.getLicenseByHash(payload.licenseKeyHash);
      if (!license) {
        return res.status(404).json({ message: "License not found." });
      }
      if (!license.isActive) {
        return res.status(403).json({ message: "This license is inactive." });
      }

      const result = await runCoachChat({
        license,
        deviceId,
        request: parsed.data,
      });
      res.json(result);
    } catch (error: any) {
      console.error("Coach chat error:", error);
      const message = error.message ?? "Coach chat failed.";
      const status = /Daily Coach limit/i.test(message) ? 503 : 500;
      res.status(status).json({ message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
};