import type {
  CoachAction,
  CoachChatRequest,
  CoachChatResponse,
  License,
  LicensePlan,
  PixelationResult,
} from "@shared/schema";
import { storage } from "../../storage";
import { buildAccountSnapshot, formatAccountForPrompt } from "./accountContext";
import { runLocalKnowledgeCoach } from "./localKnowledgeCoach";
import { retrieveKnowledge, formatKnowledgeForPrompt } from "./knowledgeBase";
import { formatProjectForPrompt, summarizeProject, type ProjectSummary } from "./projectContext";
import { buildSystemPrompt, parseCoachReply } from "./prompts";
import { chatCompletion, isOpenAIConfigured, type ChatMessage } from "./openaiClient";
import { runProTool } from "./tools";

const FREE_DAILY_QUOTA = 20;
const PRO_DAILY_QUOTA = 100;

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function normalizePlan(plan: string | null | undefined): LicensePlan {
  return plan === "pro" ? "pro" : "basic";
}

function coachMode(plan: LicensePlan): "free" | "pro" {
  return plan === "pro" ? "pro" : "free";
}

function wantsProFeature(message: string): boolean {
  const m = message.toLowerCase();
  return (
    /layout|recommend.*(board|tile)|suggest.*(board|tile)|owned.?colou?r|inventory|gap|what am i (missing|short)/i.test(
      m,
    )
  );
}

function proUpsellResponse(conversationId: string): CoachChatResponse {
  return {
    conversationId,
    reply:
      "Layout recommendations and owned-colour gap analysis are part of Pro Coach. Buy a Pro license at checkout to unlock them — you’ll get a new Pro key by email. I can still help with how-tos, Build Mode, exports, and your Basic account details.",
    mode: "free",
    engine: isOpenAIConfigured() ? "openai" : "local",
    suggestions: ["Buy Pro", "What is my plan?", "How do owned colours work?", "Explain Build Mode"],
    actions: [{ type: "checkout", plan: "pro" } satisfies CoachAction],
    escalated: false,
  };
}

function asPixelation(raw: unknown): PixelationResult | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<PixelationResult>;
  if (!Array.isArray(r.boards) || !Array.isArray(r.colorMap)) return null;
  return r as PixelationResult;
}

export async function getCoachAccountContext(license: License) {
  return buildAccountSnapshot(license);
}

export async function runCoachChat(input: {
  license: License;
  deviceId: string;
  request: CoachChatRequest;
}): Promise<CoachChatResponse> {
  const plan = normalizePlan(input.license.plan);
  const mode = coachMode(plan);
  const engine: CoachChatResponse["engine"] = isOpenAIConfigured() ? "openai" : "local";
  const day = todayUtc();
  const quota = plan === "pro" ? PRO_DAILY_QUOTA : FREE_DAILY_QUOTA;
  const used = await storage.getCoachUsageCount(input.license.licenseKeyHash, day);
  if (used >= quota) {
    throw new Error(
      `Daily Coach limit reached (${quota} messages). Try again tomorrow${plan === "basic" ? ", or upgrade to Pro for a higher limit" : ""}.`,
    );
  }

  let conversationId = input.request.conversationId;
  if (conversationId) {
    const existing = await storage.getCoachConversation(conversationId);
    if (!existing || existing.licenseKeyHash !== input.license.licenseKeyHash) {
      conversationId = undefined;
    }
  }
  if (!conversationId) {
    const created = await storage.createCoachConversation({
      licenseKeyHash: input.license.licenseKeyHash,
      deviceId: input.deviceId,
    });
    conversationId = created.id;
  }

  if (plan === "basic" && wantsProFeature(input.request.message)) {
    await storage.addCoachMessage({
      conversationId,
      role: "user",
      content: input.request.message,
    });
    const upsell = proUpsellResponse(conversationId);
    upsell.engine = engine;
    await storage.addCoachMessage({
      conversationId,
      role: "assistant",
      content: upsell.reply,
      metadata: { mode, engine, actions: upsell.actions, escalated: false },
    });
    await storage.incrementCoachUsage(input.license.licenseKeyHash, day);
    await storage.touchCoachConversation(conversationId);
    return upsell;
  }

  const account = await buildAccountSnapshot(input.license);
  let summary: ProjectSummary | null = null;
  let pixelation: PixelationResult | null = null;
  if (input.request.projectId) {
    const project = await storage.getProject(input.request.projectId);
    if (project) {
      summary = summarizeProject(project);
      pixelation = asPixelation(project.pixelationResult);
    }
  }

  await storage.addCoachMessage({
    conversationId,
    role: "user",
    content: input.request.message,
  });

  let reply: string;
  let suggestions: string[];
  let actions: CoachAction[];
  let escalated: boolean;

  if (engine === "local") {
    const local = runLocalKnowledgeCoach({
      message: input.request.message,
      plan,
      account,
      summary,
      pixelation,
      ownedColorHexes: input.request.ownedColorHexes ?? [],
      buildProgress: input.request.buildProgress,
    });
    reply = local.reply;
    suggestions = local.suggestions;
    actions = local.actions;
    escalated = local.escalated;
  } else {
    const knowledge = formatKnowledgeForPrompt(retrieveKnowledge(input.request.message));
    const system = buildSystemPrompt({
      plan,
      knowledge,
      account: formatAccountForPrompt(account),
      project: summary
        ? formatProjectForPrompt(summary, input.request.buildProgress)
        : undefined,
      page: input.request.page,
    });

    const history = await storage.getCoachMessages(conversationId, 12);
    const messages: ChatMessage[] = [
      { role: "system", content: system },
      ...history
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    ];

    let completion = await chatCompletion({
      plan,
      messages,
      useTools: plan === "pro",
    });

    if (plan === "pro" && completion.toolCalls.length > 0) {
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: completion.content,
        tool_calls: completion.toolCalls,
      };
      messages.push(assistantMsg);

      for (const call of completion.toolCalls) {
        const result = runProTool(call.function.name, call.function.arguments, {
          summary,
          pixelation,
          ownedColorHexes: input.request.ownedColorHexes ?? [],
        });
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }

      completion = await chatCompletion({
        plan,
        messages,
        useTools: false,
      });
    }

    const raw = completion.content?.trim() || "Sorry — I could not generate a reply. Try again or open Contact.";
    const parsed = parseCoachReply(raw);
    reply = parsed.reply;
    suggestions = parsed.suggestions;
    actions = parsed.actions;
    escalated = parsed.escalated;
  }

  await storage.addCoachMessage({
    conversationId,
    role: "assistant",
    content: reply,
    metadata: {
      mode,
      engine,
      actions,
      escalated,
    },
  });
  await storage.incrementCoachUsage(input.license.licenseKeyHash, day);
  await storage.touchCoachConversation(conversationId);

  return {
    conversationId,
    reply,
    mode,
    engine,
    suggestions,
    actions,
    escalated,
  };
}
