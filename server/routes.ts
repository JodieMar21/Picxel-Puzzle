import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProjectSchema } from "@shared/schema";
import multer, { FileFilterCallback } from "multer";
import sharp from "sharp";
import path from "path";
import fs from "fs";

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

// Configure multer for file uploads
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  onFileUploadStart: (file) => console.log("Multer started processing file:", file.originalname),
  fileFilter: (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG and PNG are allowed."));
    }
  },
});

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
  { name: "Crosswords", hex: "#D88571" },
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

function findClosestBrickColor(rgb: [number, number, number]): { name: string; hex: string } {
  let closestColor = BRICK_COLORS[0];
  let minDistance = Infinity;

  for (const color of BRICK_COLORS) {
    const brickRgb = hexToRgb(color.hex);
    const distance = colorDistance(rgb, brickRgb);

    if (distance < minDistance) {
      minDistance = distance;
      closestColor = color;
    }
  }

  return closestColor;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Ensure uploads directory exists
  if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads");
  }

  // Upload image endpoint
  app.post("/api/upload", upload.single("image"), async (req: MulterRequest, res) => {
    console.log("Middleware reached, req.file:", req.file);
    try {
      console.log("Received file:", req.file); // Debug log to check file reception
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { name, boardCount, boardLayout } = req.body;

      if (!name || !boardCount || !boardLayout) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Create project
      const project = await storage.createProject({
        name,
        originalImageUrl: req.file.path,
        boardCount: parseInt(boardCount, 10), // Ensure integer parsing
        boardLayout,
      });

      res.json(project);
    } catch (error) {
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

      const boardSize = 32; // Each board is 32x32 tiles
      let gridCols, gridRows;

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
      const pixelatedData: string[][] = [];
      const colorUsage = new Map<string, number>();

      console.log(`Processing image: ${info.width}x${info.height}, channels: ${info.channels}`);

      for (let y = 0; y < info.height; y++) {
        const row: string[] = [];
        for (let x = 0; x < info.width; x++) {
          const idx = (y * info.width + x) * info.channels;
          const rgb: [number, number, number] = [
            data[idx] || 0,
            data[idx + 1] || 0,
            data[idx + 2] || 0,
          ];

          if (x < 5 && y < 5) {
            console.log(`Pixel [${x},${y}]: RGB(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`);
          }

          const brickColor = findClosestBrickColor(rgb);
          row.push(brickColor.hex);

          const key = `${brickColor.name}|${brickColor.hex}`;
          colorUsage.set(key, (colorUsage.get(key) || 0) + 1);
        }
        pixelatedData.push(row);
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
      };

      const updatedProject = await storage.updateProject(req.params.id, {
        pixelatedImageUrl: pixelatedImageData,
        colorData: { colorMap, boards, totalTiles: totalWidth * totalHeight },
        pixelationResult,
        status: "completed",
      });

      res.json(pixelationResult);
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Failed to delete project", error: error.message });
    }
  });

  // Get brick colors
  app.get("/api/lego-colors", (req, res) => {
    res.json(BRICK_COLORS);
  });

  const httpServer = createServer(app);
  return httpServer;
}
}
