import { FormEvent, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Loader2, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { startPlanCheckout } from "./checkout";
import type { CoachAction, CoachUiMessage } from "./types";
import { useToast } from "@/hooks/use-toast";

interface CoachChatProps {
  messages: CoachUiMessage[];
  sending: boolean;
  error: string | null;
  planLabel?: string;
  canUseProCoach?: boolean;
  engine?: "openai" | "local";
  onSend: (text: string) => void;
}

export default function CoachChat({
  messages,
  sending,
  error,
  planLabel,
  canUseProCoach,
  engine,
  onSend,
}: CoachChatProps) {
  const [draft, setDraft] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const handleAction = async (action: CoachAction) => {
    if (action.type === "navigate" && action.path) {
      setLocation(action.path);
      return;
    }
    if (action.type === "checkout") {
      try {
        await startPlanCheckout(action.plan ?? "pro");
      } catch (err) {
        toast({
          title: "Checkout failed",
          description: err instanceof Error ? err.message : "Could not open Stripe.",
          variant: "destructive",
        });
      }
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.trim() || sending) return;
    onSend(draft);
    setDraft("");
  };

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border/70">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-tight truncate">Fractix Coach</p>
            <p className="text-xs text-muted-foreground truncate">
              {engine === "local"
                ? "Always Online"
                : canUseProCoach
                  ? "Pro tips enabled"
                  : "Free Coach · upgrade for Pro tips"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/70 text-foreground border border-border/60",
              )}
            >
              {message.content}
              {message.actions && message.actions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {message.actions.map((action, index) => (
                    <Button
                      key={`${message.id}-a-${index}`}
                      type="button"
                      size="sm"
                      variant={message.role === "user" ? "secondary" : "outline"}
                      className="h-7 rounded-lg text-xs"
                      onClick={() => handleAction(action)}
                    >
                      {action.type === "checkout"
                        ? `Buy ${action.plan === "basic" ? "Basic" : "Pro"}`
                        : action.path?.startsWith("/contact")
                          ? "Open Contact"
                          : action.path?.replace(/^\//, "") || "Open"}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Thinking…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {lastAssistant?.suggestions && lastAssistant.suggestions.length > 0 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
          {lastAssistant.suggestions.map((chip) => (
            <button
              key={chip}
              type="button"
              disabled={sending}
              onClick={() => {
                if (chip.toLowerCase() === "buy pro" || chip.toLowerCase() === "open contact") {
                  if (chip.toLowerCase() === "buy pro") void handleAction({ type: "checkout", plan: "pro" });
                  else void handleAction({ type: "navigate", path: "/contact?topic=technical" });
                  return;
                }
                onSend(chip);
              }}
              className="text-xs rounded-full border border-border bg-card/80 px-2.5 py-1 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors disabled:opacity-50"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="px-4 pb-1 text-xs text-destructive">{error}</p>
      )}

      <form onSubmit={onSubmit} className="p-3 border-t border-border/70 flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask Fractix Coach…"
          disabled={sending}
          className="rounded-xl"
        />
        <Button type="submit" size="icon" className="rounded-xl shrink-0" disabled={sending || !draft.trim()}>
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </form>
    </div>
  );
}
