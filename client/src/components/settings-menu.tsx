import { useEffect, useRef, useState } from "react";
import { Moon, Settings, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useAppSettings } from "@/features/settings/use-app-settings";
import {
  MAX_MAX_BOARDS,
  MIN_MAX_BOARDS,
  TILE_SIZE_OPTIONS,
  type TileSizeOption,
} from "@/features/settings/types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

type ThemeChoice = "light" | "dark";

const THEME_OPTIONS: {
  value: ThemeChoice;
  label: string;
  icon: typeof Sun;
}[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

export default function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();
  const { settings, patchSettings } = useAppSettings();

  useEffect(() => {
    setMounted(true);
    // Migrate old "system" preference (followed OS dark) to app light default.
    if (theme === "system") {
      setTheme("light");
    }
  }, [theme, setTheme]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (rootRef.current?.contains(target)) return;
      if (
        target.closest(
          '[data-radix-popper-content-wrapper], [role="listbox"], [data-radix-select-viewport]',
        )
      ) {
        return;
      }
      setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const activeTheme: ThemeChoice =
    mounted && theme === "dark" ? "dark" : "light";

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setOpen((value) => !value)}
        aria-label="Settings"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Settings className="w-5 h-5" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Settings"
          className="absolute right-0 mt-2 w-80 rounded-lg border border-border bg-popover text-popover-foreground shadow-lg z-50 p-4"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <h4 className="font-semibold mb-3">Settings</h4>

          <div className="space-y-4 text-sm">
            <div>
              <p className="font-medium mb-2">Theme</p>
              <div className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1">
                {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
                  const selected = activeTheme === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setTheme(value)}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-md px-2 py-2 text-xs transition-colors",
                        selected
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                      aria-pressed={selected}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Default is Light (app system theme).
              </p>
            </div>

            <div className="space-y-3 border-t border-border pt-3">
              <div className="space-y-1.5">
                <Label htmlFor="settings-tile-size">Tile size (per board)</Label>
                <Select
                  value={String(settings.tileSize)}
                  onValueChange={(value) =>
                    patchSettings({ tileSize: Number(value) as TileSizeOption })
                  }
                >
                  <SelectTrigger id="settings-tile-size">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TILE_SIZE_OPTIONS.map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size}×{size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="settings-max-boards">Max boards</Label>
                <Input
                  id="settings-max-boards"
                  type="number"
                  min={MIN_MAX_BOARDS}
                  max={MAX_MAX_BOARDS}
                  value={settings.maxBoards}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    if (!Number.isFinite(next)) return;
                    patchSettings({ maxBoards: next });
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Limits board count on the configure step ({MIN_MAX_BOARDS}–
                  {MAX_MAX_BOARDS}).
                </p>
              </div>

              <div className="space-y-2">
                <Label>Export formats</Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="settings-export-png"
                    checked={settings.exportPng}
                    onCheckedChange={(checked) => {
                      const exportPng = checked === true;
                      if (!exportPng && !settings.exportPdf) return;
                      patchSettings({ exportPng });
                    }}
                  />
                  <Label htmlFor="settings-export-png" className="font-normal">
                    PNG
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="settings-export-pdf"
                    checked={settings.exportPdf}
                    onCheckedChange={(checked) => {
                      const exportPdf = checked === true;
                      if (!exportPdf && !settings.exportPng) return;
                      patchSettings({ exportPdf });
                    }}
                  />
                  <Label htmlFor="settings-export-pdf" className="font-normal">
                    PDF
                  </Label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
