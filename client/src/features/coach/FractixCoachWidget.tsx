import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import CoachChat from "./CoachChat";
import { useCoachChat } from "./useCoachChat";

function pageFromPath(path: string): string {
  if (path.startsWith("/projects")) return "projects";
  if (path.startsWith("/support")) return "support";
  if (path.startsWith("/documentation")) return "documentation";
  if (path.startsWith("/contact")) return "contact";
  return "home";
}

function readBuildProgress(projectId?: string | null) {
  try {
    const key = `fractix-build-progress:${projectId ?? "session"}`;
    const raw = localStorage.getItem(key);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    const completedBoardIds = Object.entries(parsed)
      .filter(([, done]) => done)
      .map(([id]) => id);
    return { completedBoardIds };
  } catch {
    return undefined;
  }
}

export default function FractixCoachWidget() {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const page = pageFromPath(location);

  useEffect(() => {
    if (!open) return;
    try {
      setProjectId(sessionStorage.getItem("fractix-coach-project-id"));
    } catch {
      setProjectId(null);
    }
  }, [open, location]);

  const buildProgress = useMemo(() => readBuildProgress(projectId), [projectId, open]);

  const { messages, sending, error, account, loadAccount, sendMessage, engine } = useCoachChat({
    page,
    projectId,
    buildProgress,
  });

  useEffect(() => {
    if (open) void loadAccount();
  }, [open, loadAccount]);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">
      {open && (
        <div
          className={cn(
            "w-[min(100vw-2rem,24rem)] h-[min(70vh,32rem)] rounded-2xl border border-border",
            "bg-card/95 backdrop-blur-md shadow-xl overflow-hidden flex flex-col",
            "animate-in fade-in zoom-in-95 duration-200",
          )}
        >
          <CoachChat
            messages={messages}
            sending={sending}
            error={error}
            planLabel={account?.plan}
            canUseProCoach={account?.canUseProCoach}
            engine={engine}
            onSend={sendMessage}
          />
        </div>
      )}

      <Button
        type="button"
        size="lg"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "rounded-full h-12 w-12 p-0 shadow-lg shadow-primary/20",
          open && "bg-muted text-foreground hover:bg-muted/80",
        )}
        aria-label={open ? "Close Fractix Coach" : "Open Fractix Coach"}
      >
        {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </Button>
    </div>
  );
}

/** Call from results / home when a project is active so Coach can load context. */
export function setCoachProjectId(projectId: string | null) {
  try {
    if (projectId) sessionStorage.setItem("fractix-coach-project-id", projectId);
    else sessionStorage.removeItem("fractix-coach-project-id");
  } catch {
    // ignore
  }
}
