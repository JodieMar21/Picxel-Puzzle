import type { ColorUsage, PixelationResult, Project } from "@shared/schema";

export type ProjectSummary = {
  id: string;
  name: string;
  boardCount: number;
  boardLayout: string;
  boardRows: number | null;
  boardCols: number | null;
  boardTileSize: number;
  totalTiles: number;
  uniqueColours: number;
  topColours: { name: string; hex: string; count: number }[];
  status: string;
};

function asPixelationResult(raw: unknown): PixelationResult | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<PixelationResult>;
  if (!Array.isArray(r.colorMap) || !Array.isArray(r.boards)) return null;
  return r as PixelationResult;
}

export function summarizeProject(project: Project): ProjectSummary | null {
  const result = asPixelationResult(project.pixelationResult);
  const colorMap: ColorUsage[] = result?.colorMap ?? (Array.isArray(project.colorData) ? (project.colorData as ColorUsage[]) : []);
  const topColours = [...colorMap]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 8)
    .map((c) => ({ name: c.name, hex: c.hex, count: c.count }));

  const boardTileSize =
    result?.boardTileSize ??
    result?.boards?.[0]?.pixels?.length ??
    32;

  return {
    id: project.id,
    name: project.name,
    boardCount: project.boardCount,
    boardLayout: project.boardLayout,
    boardRows: project.boardRows,
    boardCols: project.boardCols,
    boardTileSize,
    totalTiles: result?.totalTiles ?? project.boardCount * boardTileSize * boardTileSize,
    uniqueColours: colorMap.length,
    topColours,
    status: project.status,
  };
}

export function formatProjectForPrompt(
  summary: ProjectSummary,
  buildProgress?: { completedBoardIds: string[]; activeBoardId?: string },
): string {
  const lines = [
    `Project: ${summary.name} (${summary.id})`,
    `Status: ${summary.status}`,
    `Boards: ${summary.boardCount} layout ${summary.boardLayout} (${summary.boardRows ?? "?"}×${summary.boardCols ?? "?"})`,
    `Tile size: ${summary.boardTileSize}×${summary.boardTileSize}`,
    `Total tiles: ${summary.totalTiles}`,
    `Unique colours: ${summary.uniqueColours}`,
    `Top colours: ${summary.topColours.map((c) => `${c.name} ${c.count}`).join(", ") || "n/a"}`,
  ];
  if (buildProgress) {
    lines.push(
      `Build progress: ${buildProgress.completedBoardIds.length} boards marked done` +
        (buildProgress.activeBoardId ? `; active ${buildProgress.activeBoardId}` : ""),
    );
    if (buildProgress.completedBoardIds.length) {
      lines.push(`Completed board ids: ${buildProgress.completedBoardIds.join(", ")}`);
    }
  }
  return lines.join("\n");
}
