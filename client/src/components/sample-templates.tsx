import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface SampleTemplate {
  id: string;
  name: string;
  description: string;
  /** Generates a square PNG data URL for the demo image. */
  render: () => string;
}

function canvasToFile(dataUrl: string, name: string): File {
  const bin = atob(dataUrl.split(",")[1] ?? "");
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], name, { type: "image/png" });
}

function makeGradientTemplate(): string {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 256, 256);
  g.addColorStop(0, "#1d4ed8");
  g.addColorStop(0.5, "#38bdf8");
  g.addColorStop(1, "#f8fafc");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.arc(128, 128, 48, 0, Math.PI * 2);
  ctx.fill();
  return c.toDataURL("image/png");
}

function makeHeartTemplate(): string {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fef2f2";
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = "#e11d48";
  ctx.beginPath();
  const x = 128;
  const y = 140;
  ctx.moveTo(x, y + 40);
  ctx.bezierCurveTo(x - 90, y - 20, x - 70, y - 90, x, y - 40);
  ctx.bezierCurveTo(x + 70, y - 90, x + 90, y - 20, x, y + 40);
  ctx.fill();
  return c.toDataURL("image/png");
}

function makeCheckerTemplate(): string {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  const n = 8;
  const s = 256 / n;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? "#0f172a" : "#f8fafc";
      ctx.fillRect(x * s, y * s, s, s);
    }
  }
  ctx.fillStyle = "#2563eb";
  ctx.fillRect(64, 64, 128, 128);
  return c.toDataURL("image/png");
}

export const SAMPLE_TEMPLATES: SampleTemplate[] = [
  {
    id: "gradient-orb",
    name: "Sky Orb",
    description: "Soft gradient — great first mosaic",
    render: makeGradientTemplate,
  },
  {
    id: "heart",
    name: "Classic Heart",
    description: "High contrast red on cream",
    render: makeHeartTemplate,
  },
  {
    id: "checker",
    name: "Bold Blocks",
    description: "Simple shapes for clean boards",
    render: makeCheckerTemplate,
  },
];

interface SampleTemplatesProps {
  onSelect: (file: File, preview: string) => void;
}

export default function SampleTemplates({ onSelect }: SampleTemplatesProps) {
  const [selectedId, setSelectedId] = useState<string>(SAMPLE_TEMPLATES[0].id);

  const previews = useMemo(() => {
    const map: Record<string, string> = {};
    for (const t of SAMPLE_TEMPLATES) {
      map[t.id] = t.render();
    }
    return map;
  }, []);

  const selected =
    SAMPLE_TEMPLATES.find((t) => t.id === selectedId) ?? SAMPLE_TEMPLATES[0];

  const applyTemplate = (template: SampleTemplate) => {
    const dataUrl = previews[template.id] ?? template.render();
    onSelect(canvasToFile(dataUrl, `${template.id}.png`), dataUrl);
  };

  return (
    <Card className="rounded-2xl border-border bg-card/70 shadow-sm">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground">Try a sample</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Choose a template, then use it — or double-click a card to start.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {SAMPLE_TEMPLATES.map((t) => {
            const isSelected = t.id === selected.id;
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={isSelected}
                className={cn(
                  "rounded-xl border overflow-hidden text-left transition-colors bg-background",
                  isSelected
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-border hover:border-primary/50",
                )}
                onClick={() => setSelectedId(t.id)}
                onDoubleClick={() => applyTemplate(t)}
              >
                <img
                  src={previews[t.id]}
                  alt={t.name}
                  className="w-full h-24 object-cover"
                />
                <div className="p-2.5">
                  <p className="text-sm font-medium text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.description}</p>
                </div>
              </button>
            );
          })}
        </div>
        <Button
          variant="default"
          size="sm"
          className="rounded-xl w-full"
          onClick={() => applyTemplate(selected)}
        >
          Use {selected.name} template
        </Button>
      </CardContent>
    </Card>
  );
}
