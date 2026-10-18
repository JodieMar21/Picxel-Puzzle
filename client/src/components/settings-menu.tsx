import { useEffect, useRef, useState } from "react";
import { Moon, Settings, Sun, RefreshCw } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useAppSettings } from "@/features/settings/use-app-settings";
import {
  MAX_MAX_BOARDS,
  MIN_MAX_BOARDS,
  TILE_SIZE_OPTIONS,
  type QualityMode,
  type TileSizeOption,
} from "@/features/settings/types";
import { BRICK_COLORS } from "@/lib/lego-colors";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

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
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();
  const { settings, patchSettings } = useAppSettings();
  const { toast } = useToast();
  const isDesktop = typeof window !== "undefined" && !!window.desktopApi?.checkForUpdates;

  useEffect(() => {
    setMounted(true);
    // Migrate old "system" preference (followed OS dark) to app light default.
    if (theme === "system") {
      setTheme("light");
    }
  }, [theme, setTheme]);

  useEffect(() => {
    if (!window.desktopApi?.onUpdaterEvent) return;
    return window.desktopApi.onUpdaterEvent((event) => {
      if (event.type === "available") {
        toast({
          title: "Update available",
          description: `Fractix ${event.version} is downloading…`,
        });
      } else if (event.type === "downloaded") {
        toast({
          title: "Update ready",
          description: `Fractix ${event.version} will install on restart.`,
        });
      }
    });
  }, [toast]);

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
                  onValueChange={(value) => {
                    const tileSize = Number(value) as TileSizeOption;
                    patchSettings({ tileSize });
                    toast({
                      title: `Tile size set to ${tileSize}×${tileSize}`,
                      description:
                        "Applies to the next mosaic you generate. Go back to Configure and start pixelation again.",
                    });
                  }}
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
                <p className="text-xs text-muted-foreground">
                  Changes apply on the next Generate — not to the current Results view.
                </p>
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

              <div className="space-y-1.5 border-t border-border pt-3">
                <Label htmlFor="settings-quality">Generate quality</Label>
                <Select
                  value={settings.qualityMode}
                  onValueChange={(value) => {
                    patchSettings({ qualityMode: value as QualityMode });
                    toast({
                      title:
                        value === "dithered"
                          ? "Dithering enabled"
                          : "Standard quality",
                      description: "Applies on the next Generate.",
                    });
                  }}
                >
                  <SelectTrigger id="settings-quality">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard (nearest colour)</SelectItem>
                    <SelectItem value="dithered">Dithered (smoother gradients)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 border-t border-border pt-3">
                <div className="flex items-center justify-between gap-2">
                  <Label>Colours I own</Label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline"
                      onClick={() =>
                        patchSettings({
                          ownedColorHexes: BRICK_COLORS.map((c) => c.hex.toUpperCase()),
                        })
                      }
                    >
                      Select all
                    </button>
                    <span className="text-muted-foreground text-xs">·</span>
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:underline"
                      onClick={() => patchSettings({ ownedColorHexes: [] })}
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Optional. Leave empty or select all to use the full palette. Otherwise only
                  checked colours are used on the next Generate.
                </p>
                <div className="max-h-36 overflow-y-auto space-y-1.5 rounded-xl border border-border p-2">
                  {BRICK_COLORS.map((color) => {
                    const hex = color.hex.toUpperCase();
                    const checked = settings.ownedColorHexes.includes(hex);
                    return (
                      <label
                        key={hex}
                        className="flex items-center gap-2 text-xs cursor-pointer rounded-lg px-1.5 py-1 hover:bg-muted/50"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) => {
                            const on = value === true;
                            const next = on
                              ? Array.from(new Set([...settings.ownedColorHexes, hex]))
                              : settings.ownedColorHexes.filter((h) => h !== hex);
                            patchSettings({ ownedColorHexes: next });
                          }}
                        />
                        <span
                          className="w-3.5 h-3.5 rounded border border-border shrink-0"
                          style={{ backgroundColor: color.hex }}
                        />
                        <span className="text-foreground truncate">{color.name}</span>
                      </label>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {settings.ownedColorHexes.length === 0
                    ? "Using full palette (none selected)"
                    : settings.ownedColorHexes.length === BRICK_COLORS.length
                      ? `All ${BRICK_COLORS.length} colours selected`
                      : `${settings.ownedColorHexes.length} of ${BRICK_COLORS.length} colours selected`}
                </p>
              </div>

              {isDesktop && (
                <div className="space-y-2 border-t border-border pt-3">
                  <Label>Desktop updates</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full rounded-xl"
                    disabled={checkingUpdate}
                    onClick={async () => {
                      setCheckingUpdate(true);
                      try {
                        const result = await window.desktopApi?.checkForUpdates?.();
                        if (!result?.ok) {
                          toast({
                            title: "Could not check for updates",
                            description: result?.message ?? "Try again later.",
                            variant: "destructive",
                          });
                        } else {
                          toast({
                            title: "Checking for updates",
                            description: result.version
                              ? `Latest seen: ${result.version}`
                              : "You're up to date, or a download will start shortly.",
                          });
                        }
                      } finally {
                        setCheckingUpdate(false);
                      }
                    }}
                  >
                    <RefreshCw className={cn("w-4 h-4 mr-2", checkingUpdate && "animate-spin")} />
                    Check for updates
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
