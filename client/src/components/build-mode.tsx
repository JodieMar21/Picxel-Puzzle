import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Circle, Hammer, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import type { PixelationResult } from "@shared/schema";
import { cn } from "@/lib/utils";

interface BuildModeProps {
  result: PixelationResult;
  projectId?: string;
  boardTileSize: number;
}

function storageKey(projectId?: string) {
  return `fractix-build-progress:${projectId ?? "session"}`;
}

export default function BuildMode({ result, projectId, boardTileSize }: BuildModeProps) {
  const boardIds = useMemo(() => result.boards.map((b) => b.id), [result.boards]);
  const [done, setDone] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(storageKey(projectId));
      return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    } catch {
      return {};
    }
  });
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    localStorage.setItem(storageKey(projectId), JSON.stringify(done));
  }, [done, projectId]);

  const completedCount = boardIds.filter((id) => done[id]).length;
  const progress = boardIds.length ? Math.round((completedCount / boardIds.length) * 100) : 0;
  const activeBoard = result.boards[activeIndex];

  const toggle = (id: string) => {
    setDone((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const preview = useMemo(() => {
    if (!activeBoard) return [];
    const size = 12;
    const source = activeBoard.pixels.length || boardTileSize;
    const cells: string[] = [];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const sy = Math.floor((y / size) * source);
        const sx = Math.floor((x / size) * source);
        cells.push(activeBoard.pixels[sy]?.[sx] || "#FFFFFF");
      }
    }
    return cells;
  }, [activeBoard, boardTileSize]);

  return (
    <Card className="rounded-2xl border-border bg-card/70 shadow-sm">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Hammer className="w-5 h-5 text-primary" />
              Build mode
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Check off each board as you assemble. Progress is saved on this device.
            </p>
          </div>
          <Badge variant="secondary">
            {completedCount}/{boardIds.length} done
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium text-muted-foreground">
            <span>Assembly progress</span>
            <span className="tabular-nums text-foreground">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {activeBoard && (
          <div className="rounded-xl border border-border bg-muted/30 p-4 flex flex-col sm:flex-row gap-4 items-center">
            <div
              className="w-28 h-28 rounded-lg overflow-hidden border border-border shrink-0 grid"
              style={{ gridTemplateColumns: "repeat(12, 1fr)" }}
            >
              {preview.map((color, i) => (
                <div key={i} style={{ backgroundColor: color }} />
              ))}
            </div>
            <div className="flex-1 text-center sm:text-left space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Now building</p>
                <p className="text-2xl font-semibold text-foreground">Board {activeBoard.id}</p>
                <p className="text-sm text-muted-foreground">
                  {boardTileSize}×{boardTileSize} · row {activeBoard.position.row + 1}, col{" "}
                  {activeBoard.position.col + 1}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  disabled={activeIndex === 0}
                  onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  className="rounded-xl"
                  variant={done[activeBoard.id] ? "outline" : "default"}
                  onClick={() => toggle(activeBoard.id)}
                >
                  {done[activeBoard.id] ? "Mark incomplete" : "Mark complete"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  disabled={activeIndex >= boardIds.length - 1}
                  onClick={() => setActiveIndex((i) => Math.min(boardIds.length - 1, i + 1))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {result.boards.map((board, index) => {
            const isDone = !!done[board.id];
            const isActive = index === activeIndex;
            return (
              <button
                key={board.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
                  isActive && "border-primary bg-primary/10",
                  !isActive && isDone && "border-border bg-muted/40",
                  !isActive && !isDone && "border-border/70 bg-card hover:bg-muted/40",
                )}
              >
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
                <span className="font-medium text-foreground">{board.id}</span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
