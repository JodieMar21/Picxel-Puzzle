import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Layers, Palette, Sparkles, Wand2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { getAppSettings } from "@/features/settings/storage";
import type { PixelationResult } from "@shared/schema";
import { cn } from "@/lib/utils";

interface ProcessingViewProps {
  projectId: string;
  onComplete: (result: PixelationResult) => void;
}

const STEPS = [
  { label: "Analyzing image dimensions", icon: Sparkles },
  { label: "Mapping colours to brick palette", icon: Palette },
  { label: "Generating pixel grid", icon: Wand2 },
  { label: "Creating board layouts", icon: Layers },
  { label: "Optimizing colour usage", icon: Palette },
  { label: "Finalizing construction guide", icon: CheckCircle2 },
];

export default function ProcessingView({ projectId, onComplete }: ProcessingViewProps) {
  const [progress, setProgress] = useState(8);
  const [stepIndex, setStepIndex] = useState(0);
  const [failed, setFailed] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const processImageMutation = useMutation({
    mutationFn: async (id: string) => {
      const { tileSize, qualityMode, ownedColorHexes } = getAppSettings();
      const response = await apiRequest("POST", `/api/projects/${id}/process`, {
        tileSize,
        qualityMode,
        ownedColorHexes,
      });
      return response.json();
    },
    onSuccess: (result) => {
      setProgress(100);
      setStepIndex(STEPS.length);
      setDone(true);
      setTimeout(() => onComplete(result), 900);
    },
    onError: (error) => {
      setFailed(error instanceof Error ? error.message : "Processing failed");
    },
  });

  useEffect(() => {
    processImageMutation.mutate(projectId);

    const progressInterval = window.setInterval(() => {
      setProgress((prev) => {
        if (prev >= 92) return prev;
        return Math.min(prev + 7, 92);
      });
    }, 700);

    const stepInterval = window.setInterval(() => {
      setStepIndex((prev) => Math.min(prev + 1, STEPS.length - 1));
    }, 1100);

    return () => {
      window.clearInterval(progressInterval);
      window.clearInterval(stepInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per projectId
  }, [projectId]);

  const activeStep = Math.min(stepIndex, STEPS.length - 1);

  return (
    <Card className="rounded-2xl border-border bg-card/70 shadow-sm backdrop-blur-sm overflow-hidden">
      <CardContent className="p-0">
        <div className="relative px-6 sm:px-10 py-10 sm:py-12">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5"
          />

          <div className="relative mx-auto max-w-lg text-center space-y-8">
            <div className="relative mx-auto w-24 h-24">
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping opacity-40" />
              <div className="absolute inset-2 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30">
                  {failed ? (
                    <AlertCircle className="w-8 h-8" />
                  ) : done ? (
                    <CheckCircle2 className="w-8 h-8" />
                  ) : (
                    <Wand2 className="w-8 h-8 animate-pulse" />
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-semibold tracking-tight text-foreground">
                {failed
                  ? "Something went wrong"
                  : done
                    ? "Mosaic ready"
                    : "Creating your project"}
              </h3>
              <p className="text-muted-foreground">
                {failed
                  ? failed
                  : done
                    ? "Opening your construction guide…"
                    : "Converting your image into brick-ready boards"}
              </p>
            </div>

            {!failed && (
              <div className="space-y-3 text-left">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-semibold tabular-nums text-foreground">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2.5 rounded-full" />
              </div>
            )}

            <ol className="space-y-2 text-left">
              {STEPS.map((step, index) => {
                const Icon = step.icon;
                const complete = done || index < activeStep;
                const current = !done && !failed && index === activeStep;
                return (
                  <li
                    key={step.label}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors",
                      complete && "border-primary/25 bg-primary/10",
                      current && "border-primary/40 bg-primary/15",
                      !complete && !current && "border-border/60 bg-muted/30 opacity-60",
                    )}
                  >
                    <span
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                        complete || current
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {complete ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Icon className={cn("w-4 h-4", current && "animate-pulse")} />
                      )}
                    </span>
                    <span
                      className={cn(
                        "text-sm font-medium",
                        complete || current ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {step.label}
                      {current && !done ? "…" : ""}
                    </span>
                  </li>
                );
              })}
            </ol>

            {failed && (
              <Button
                className="rounded-xl"
                onClick={() => {
                  setFailed(null);
                  setProgress(8);
                  setStepIndex(0);
                  setDone(false);
                  processImageMutation.mutate(projectId);
                }}
              >
                Try again
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
