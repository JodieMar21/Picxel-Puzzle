import { useEffect, useState } from "react";
import { Box, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface FractixLoaderProps {
  title?: string;
  subtitle?: string;
  statusLabel?: string;
  progress?: number;
  /** When true, progress gently animates upward for a live feel. */
  animateProgress?: boolean;
  fullScreen?: boolean;
  className?: string;
}

/** Branded Fractix waiting state — high contrast in light and dark themes. */
export default function FractixLoader({
  title = "Fractix is working…",
  subtitle = "Please wait a moment",
  statusLabel = "Working on your mosaic…",
  progress,
  animateProgress = true,
  fullScreen = true,
  className,
}: FractixLoaderProps) {
  const [liveProgress, setLiveProgress] = useState(progress ?? 18);

  useEffect(() => {
    if (typeof progress === "number") {
      setLiveProgress(progress);
    }
  }, [progress]);

  useEffect(() => {
    if (!animateProgress || typeof progress === "number") return;
    const id = window.setInterval(() => {
      setLiveProgress((prev) => {
        if (prev >= 90) return prev;
        return Math.min(prev + Math.random() * 6 + 2, 90);
      });
    }, 450);
    return () => window.clearInterval(id);
  }, [animateProgress, progress]);

  const value = Math.round(Math.min(100, Math.max(0, liveProgress)));

  return (
    <div
      className={cn(
        "z-[100] flex items-center justify-center p-5 sm:p-8",
        fullScreen
          ? "fixed inset-0 bg-black/55 dark:bg-black/70 backdrop-blur-md"
          : "absolute inset-0 rounded-2xl bg-background/80 backdrop-blur-sm",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={title}
    >
      <div
        className={cn(
          "relative w-full max-w-[22rem] overflow-hidden rounded-2xl border-2 border-border",
          "bg-background text-foreground shadow-2xl shadow-black/25 dark:shadow-black/60",
          "ring-1 ring-black/5 dark:ring-white/10",
        )}
      >
        {/* Top brand accent bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-primary via-sky-400 to-primary" />

        <div className="relative px-7 py-8 text-center space-y-6">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl"
          />

          <div className="relative mx-auto h-[5.5rem] w-[5.5rem]">
            <div className="absolute inset-0 rounded-full bg-primary/25 animate-ping opacity-30" />
            <div className="absolute inset-0 rounded-full border-[3px] border-muted" />
            <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-primary border-r-primary/50 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/40">
                <Box className="h-7 w-7" />
              </div>
            </div>
          </div>

          <div className="relative space-y-2">
            <p className="text-[11px] font-bold tracking-[0.28em] uppercase text-primary">
              Fractix
            </p>
            <h3 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
              {title}
            </h3>
            <p className="text-sm font-medium text-foreground/75 leading-relaxed px-1">
              {subtitle}
            </p>
          </div>

          <div className="relative space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold tabular-nums">
              <span className="text-foreground/70">Progress</span>
              <span className="text-primary">{value}%</span>
            </div>
            <Progress
              value={value}
              className="h-2.5 rounded-full bg-muted border border-border/80"
            />
            <p className="flex items-center justify-center gap-2 text-sm font-medium text-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
              {statusLabel}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
