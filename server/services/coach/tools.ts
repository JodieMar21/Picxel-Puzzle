import type { ColorUsage, PixelationResult } from "@shared/schema";
import type { ProjectSummary } from "./projectContext";

export const PRO_TOOL_DEFINITIONS = [
  {
    type: "function" as const,
    function: {
      name: "suggest_board_layout",
      description:
        "Suggest board rows/cols and tile size for a Fractix mosaic based on project size or a target board count.",
      parameters: {
        type: "object",
        properties: {
          preferredBoardCount: {
            type: "number",
            description: "Optional preferred number of boards (1–36).",
          },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "owned_colour_gaps",
      description:
        "Compare the user's owned colour hex list to the current project colour map and list missing colours.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
];

function pickLayout(boardCount: number): { rows: number; cols: number; layout: string } {
  const presets: Record<number, { rows: number; cols: number }> = {
    1: { rows: 1, cols: 1 },
    2: { rows: 1, cols: 2 },
    4: { rows: 2, cols: 2 },
    6: { rows: 2, cols: 3 },
    8: { rows: 2, cols: 4 },
    9: { rows: 3, cols: 3 },
    12: { rows: 3, cols: 4 },
    16: { rows: 4, cols: 4 },
  };
  const clamped = Math.max(1, Math.min(36, Math.round(boardCount)));
  const preset = presets[clamped];
  if (preset) {
    return { ...preset, layout: `${preset.cols}x${preset.rows}` };
  }
  const cols = Math.ceil(Math.sqrt(clamped));
  const rows = Math.ceil(clamped / cols);
  return { rows, cols, layout: `${cols}x${rows}` };
}

function difficulty(uniqueColours: number, totalTiles: number): string {
  if (uniqueColours <= 5 && totalTiles <= 1024) return "Beginner";
  if (uniqueColours <= 15 && totalTiles <= 4096) return "Intermediate";
  return "Advanced";
}

export function suggestBoardLayout(input: {
  summary: ProjectSummary | null;
  preferredBoardCount?: number;
}): Record<string, unknown> {
  const preferred =
    input.preferredBoardCount ??
    input.summary?.boardCount ??
    4;
  const layout = pickLayout(preferred);
  const tileSize = input.summary?.boardTileSize ?? 32;
  const totalTiles = layout.rows * layout.cols * tileSize * tileSize;
  const unique = input.summary?.uniqueColours ?? 12;

  let tip =
    "Start with a near-square layout. Portraits with subtle gradients often need more boards or dithering.";
  if (preferred <= 4) {
    tip = "Small layouts suit logos and simple silhouettes. Increase boards for faces or soft gradients.";
  } else if (preferred >= 9) {
    tip = "Larger board counts capture detail but raise brick cost and build time.";
  }

  return {
    suggestedBoardCount: layout.rows * layout.cols,
    rows: layout.rows,
    cols: layout.cols,
    layout: layout.layout,
    recommendedTileSize: tileSize,
    estimatedTiles: totalTiles,
    difficulty: difficulty(unique, totalTiles),
    tip,
  };
}

export function ownedColourGaps(input: {
  ownedColorHexes: string[];
  colorMap: ColorUsage[];
}): Record<string, unknown> {
  const owned = new Set(input.ownedColorHexes.map((h) => h.toUpperCase()));
  if (owned.size === 0) {
    return {
      ownedCount: 0,
      message:
        "No owned colours are selected in Settings. Open Settings and tick the colours you own, then ask again.",
      missing: [],
      covered: [],
    };
  }

  const missing = input.colorMap
    .filter((c) => !owned.has(c.hex.toUpperCase()))
    .sort((a, b) => b.count - a.count)
    .map((c) => ({ name: c.name, hex: c.hex, count: c.count }));

  const covered = input.colorMap
    .filter((c) => owned.has(c.hex.toUpperCase()))
    .map((c) => ({ name: c.name, hex: c.hex, count: c.count }));

  const missingBricks = missing.reduce((sum, c) => sum + c.count, 0);

  return {
    ownedCount: owned.size,
    projectColours: input.colorMap.length,
    coveredCount: covered.length,
    missingCount: missing.length,
    missingBrickTotal: missingBricks,
    missing: missing.slice(0, 20),
    covered: covered.slice(0, 20),
    tip:
      missing.length === 0
        ? "Your owned colours cover every colour in this project."
        : "Buy or substitute the missing colours, or enable Owned colours and re-generate to force the mosaic into your stock.",
  };
}

export function extractColorMap(summary: ProjectSummary | null, pixelation: PixelationResult | null): ColorUsage[] {
  if (pixelation?.colorMap?.length) return pixelation.colorMap;
  if (summary?.topColours?.length) {
    return summary.topColours.map((c) => ({ name: c.name, hex: c.hex, count: c.count }));
  }
  return [];
}

export function runProTool(
  name: string,
  argsJson: string,
  ctx: {
    summary: ProjectSummary | null;
    pixelation: PixelationResult | null;
    ownedColorHexes: string[];
  },
): Record<string, unknown> {
  let args: Record<string, unknown> = {};
  try {
    args = argsJson ? (JSON.parse(argsJson) as Record<string, unknown>) : {};
  } catch {
    args = {};
  }

  if (name === "suggest_board_layout") {
    const preferred =
      typeof args.preferredBoardCount === "number" ? args.preferredBoardCount : undefined;
    return suggestBoardLayout({ summary: ctx.summary, preferredBoardCount: preferred });
  }

  if (name === "owned_colour_gaps") {
    return ownedColourGaps({
      ownedColorHexes: ctx.ownedColorHexes,
      colorMap: extractColorMap(ctx.summary, ctx.pixelation),
    });
  }

  return { error: `Unknown tool: ${name}` };
}
