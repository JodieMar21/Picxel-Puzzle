import { useCallback, useState } from "react";
import { apiUrl } from "@/lib/apiBase";
import { getCurrentLicenseHeaders } from "@/lib/queryClient";
import { getAppSettings } from "@/features/settings/storage";
import type { CoachAccountContext, CoachChatResponse, CoachUiMessage } from "./types";

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useCoachChat(options: {
  page?: string;
  projectId?: string | null;
  buildProgress?: { completedBoardIds: string[]; activeBoardId?: string };
}) {
  const [messages, setMessages] = useState<CoachUiMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi — I’m Fractix Coach. Ask about uploads, boards, owned colours, Build Mode, exports, or your license plan.",
      suggestions: [
        "How do I start a mosaic?",
        "What is my plan?",
        "How do owned colours work?",
        "Explain Build Mode",
      ],
    },
  ]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [account, setAccount] = useState<CoachAccountContext | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [engine, setEngine] = useState<"openai" | "local">("local");

  const loadAccount = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/api/coach/account-context"), {
        headers: { ...getCurrentLicenseHeaders() },
        credentials: "omit",
      });
      if (!res.ok) return;
      const data = (await res.json()) as CoachAccountContext;
      setAccount(data);
    } catch {
      // ignore — chat can still work without badge
    }
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;

      setError(null);
      setSending(true);
      const userMsg: CoachUiMessage = { id: uid(), role: "user", content: trimmed };
      setMessages((prev) => [...prev, userMsg]);

      try {
        const settings = getAppSettings();
        const res = await fetch(apiUrl("/api/coach/chat"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getCurrentLicenseHeaders(),
          },
          credentials: "omit",
          body: JSON.stringify({
            message: trimmed,
            conversationId,
            page: options.page,
            projectId: options.projectId || undefined,
            buildProgress: options.buildProgress,
            ownedColorHexes: settings.ownedColorHexes,
          }),
        });

        const data = (await res.json().catch(() => ({}))) as CoachChatResponse & { message?: string };
        if (!res.ok) {
          throw new Error(data.message || "Coach could not reply.");
        }

        setConversationId(data.conversationId);
        if (data.engine) setEngine(data.engine);
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: "assistant",
            content: data.reply,
            actions: data.actions,
            suggestions: data.suggestions,
          },
        ]);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Coach request failed.";
        setError(message);
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: "assistant",
            content: `Sorry — ${message}`,
            suggestions: ["Open Contact", "What is my plan?"],
            actions: [{ type: "navigate", path: "/contact?topic=technical" }],
          },
        ]);
      } finally {
        setSending(false);
      }
    },
    [conversationId, options.buildProgress, options.page, options.projectId, sending],
  );

  return {
    messages,
    sending,
    error,
    account,
    loadAccount,
    sendMessage,
    engine,
  };
}
