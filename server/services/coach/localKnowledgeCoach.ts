import type { CoachAction, LicensePlan } from "@shared/schema";
import type { CoachAccountSnapshot } from "./accountContext";
import { KNOWLEDGE_CHUNKS, retrieveKnowledge, type KnowledgeChunk } from "./knowledgeBase";
import type { ProjectSummary } from "./projectContext";
import { ownedColourGaps, suggestBoardLayout } from "./tools";
import type { PixelationResult } from "@shared/schema";
import { extractColorMap } from "./tools";

export type LocalCoachResult = {
  reply: string;
  suggestions: string[];
  actions: CoachAction[];
  escalated: boolean;
};

type Intent =
  | "account_plan"
  | "account_devices"
  | "account_email"
  | "license_key"
  | "project_stats"
  | "build_next"
  | "pro_layout"
  | "pro_gaps"
  | "escalate"
  | "product_help";

const INTENT_KEYWORDS: Record<Intent, string[]> = {
  account_plan: ["plan", "basic", "pro", "membership", "tier", "coach", "upgrade", "paid"],
  account_devices: ["device", "devices", "seat", "seats", "logout", "activate", "activation"],
  account_email: ["email", "mail", "address", "account"],
  license_key: ["license key", "licence key", "my key", "activation key", "fractix-"],
  project_stats: ["colour", "color", "brick", "tiles", "project", "board", "how many"],
  build_next: ["build mode", "next board", "which board", "progress", "assemble"],
  pro_layout: ["layout", "recommend", "suggest", "tile size", "boards", "rows", "cols"],
  pro_gaps: ["owned", "missing", "gap", "inventory", "short", "stock", "need buy"],
  escalate: ["refund", "human", "contact", "billing", "speak to", "support agent", "not working help"],
  product_help: ["how", "what", "start", "upload", "export", "settings", "dither", "fail", "error"],
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

/** Multi-class intent scoring (weighted keyword overlap — no external models). */
function classifyIntent(message: string): { intent: Intent; score: number } {
  const lower = message.toLowerCase();
  let best: Intent = "product_help";
  let bestScore = 0;

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS) as [Intent, string[]][]) {
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) score += kw.includes(" ") ? 4 : 2;
    }
    const tokens = tokenize(message);
    for (const t of tokens) {
      if (keywords.some((k) => k.includes(t))) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = intent;
    }
  }

  return { intent: best, score: bestScore };
}

function idf(term: string): number {
  let df = 0;
  for (const chunk of KNOWLEDGE_CHUNKS) {
    const hay = `${chunk.title} ${chunk.body} ${chunk.tags.join(" ")}`.toLowerCase();
    if (hay.includes(term)) df += 1;
  }
  const n = KNOWLEDGE_CHUNKS.length;
  return Math.log((n + 1) / (df + 1)) + 1;
}

/** Sentence-level relevance scoring against the user query (TF–IDF style, in-corpus only). */
function rankSentences(chunks: KnowledgeChunk[], message: string, limit = 4): string[] {
  const tokens = Array.from(new Set(tokenize(message)));
  if (tokens.length === 0) return chunks.map((c) => c.body).slice(0, 1);

  const sentences: { text: string; score: number }[] = [];
  for (const chunk of chunks) {
    const parts = chunk.body.split(/(?<=[.!?])\s+/);
    for (const part of parts) {
      const lower = part.toLowerCase();
      let score = 0;
      for (const t of tokens) {
        if (lower.includes(t)) score += idf(t);
      }
      if (score > 0) sentences.push({ text: part.trim(), score });
    }
  }

  return sentences
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.text);
}

function formatLayoutResult(result: Record<string, unknown>): string {
  return [
    "Layout suggestion (from your project data and Fractix rules only):",
    `• Suggested layout: ${result.layout} (${result.rows}×${result.cols} boards, ${result.suggestedBoardCount} total)`,
    `• Tile size: ${result.recommendedTileSize}×${result.recommendedTileSize}`,
    `• Estimated tiles: ${result.estimatedTiles}`,
    `• Difficulty: ${result.difficulty}`,
    `• Tip: ${result.tip}`,
  ].join("\n");
}

function formatGapsResult(result: Record<string, unknown>): string {
  const missing = (result.missing as { name: string; count: number }[]) ?? [];
  if (result.message) return String(result.message);
  if (missing.length === 0) {
    return String(result.tip ?? "Your owned colours cover this project.");
  }
  const lines = missing.slice(0, 10).map((m) => `• ${m.name}: ${m.count} bricks`);
  return [
    `Owned-colour gaps (${result.missingCount} colours missing, ~${result.missingBrickTotal} bricks):`,
    ...lines,
    String(result.tip ?? ""),
  ].join("\n");
}

function offTopicGuard(message: string, intentScore: number): boolean {
  const fractixCue =
    /fractix|mosaic|brick|board|pixel|upload|license|coach|export|build|colour|color|project|settings|dither|owned|stripe|pro|basic/i.test(
      message,
    );
  return intentScore < 2 && !fractixCue;
}

export function runLocalKnowledgeCoach(input: {
  message: string;
  plan: LicensePlan;
  account: CoachAccountSnapshot;
  summary: ProjectSummary | null;
  pixelation: PixelationResult | null;
  ownedColorHexes: string[];
  buildProgress?: { completedBoardIds: string[]; activeBoardId?: string };
}): LocalCoachResult {
  const { intent, score } = classifyIntent(input.message);

  if (offTopicGuard(input.message, score)) {
    return {
      reply:
        "I can only answer Fractix Studio questions using our in-app knowledge and your account/project data — not general web topics. Try asking about uploads, boards, Build Mode, exports, or your plan.",
      suggestions: ["How do I start a mosaic?", "What is my plan?", "Explain Build Mode"],
      actions: [{ type: "navigate", path: "/documentation" }],
      escalated: false,
    };
  }

  if (intent === "license_key") {
    return {
      reply:
        "I cannot show or recover license keys. Check the email from your Stripe purchase, or use Contact for billing help. Never share your key in chat.",
      suggestions: ["What is my plan?", "How many devices can I use?", "Open Contact"],
      actions: [{ type: "navigate", path: "/contact?topic=license" }],
      escalated: false,
    };
  }

  if (intent === "escalate") {
    return {
      reply:
        "That needs a person on the Fractix team. Open Contact with your platform (web, desktop, or iPad) and what you already tried.",
      suggestions: ["Open Contact", "How do I activate a license?"],
      actions: [{ type: "navigate", path: "/contact?topic=technical" }],
      escalated: true,
    };
  }

  if (intent === "account_plan" || /\bplan\b/i.test(input.message)) {
    const coachLabel = input.account.canUseProCoach ? "Pro Coach (layout + owned-colour tips)" : "Free Coach";
    return {
      reply: [
        `Your license plan is ${input.account.plan} (${coachLabel}).`,
        `License active: ${input.account.licenseActive ? "yes" : "no"}.`,
        input.account.plan === "basic"
          ? "Upgrade by buying Pro at checkout — you will receive a new Pro license key by email."
          : "You have Pro Coach features on this license.",
      ].join(" "),
      suggestions:
        input.account.plan === "basic"
          ? ["Buy Pro", "How do owned colours work?", "How many devices can I use?"]
          : ["Suggest a board layout", "Owned colour gaps", "Explain Build Mode"],
      actions:
        input.account.plan === "basic"
          ? [{ type: "checkout", plan: "pro" }]
          : [{ type: "navigate", path: "/documentation" }],
      escalated: false,
    };
  }

  if (intent === "account_devices" || /device|seat/i.test(input.message)) {
    const names =
      input.account.activeDevices.length === 0
        ? "No active device names on file."
        : input.account.activeDevices.map((d) => d.name).join(", ");
    return {
      reply: `You are using ${input.account.activeDeviceCount} of ${input.account.maxDevices} device seats. Active: ${names}. Use Profile → Logout on this device, or Logout all devices, to free a seat.`,
      suggestions: ["What is my plan?", "How do I activate?", "Open Contact"],
      actions: [{ type: "navigate", path: "/support" }],
      escalated: false,
    };
  }

  if (intent === "account_email") {
    return {
      reply: `The email on your license is ${input.account.email}. Purchase and license emails are sent there.`,
      suggestions: ["What is my plan?", "How many devices can I use?"],
      actions: [],
      escalated: false,
    };
  }

  if (input.plan === "pro" && (intent === "pro_layout" || intent === "pro_gaps")) {
    if (intent === "pro_layout") {
      const preferredMatch = input.message.match(/\b(\d{1,2})\s*boards?\b/i);
      const preferred = preferredMatch ? Number(preferredMatch[1]) : undefined;
      const result = suggestBoardLayout({ summary: input.summary, preferredBoardCount: preferred });
      return {
        reply: formatLayoutResult(result),
        suggestions: ["Owned colour gaps", "Explain Build Mode", "How do I export?"],
        actions: [],
        escalated: false,
      };
    }
    const gaps = ownedColourGaps({
      ownedColorHexes: input.ownedColorHexes,
      colorMap: extractColorMap(input.summary, input.pixelation),
    });
    return {
      reply: formatGapsResult(gaps),
      suggestions: ["Suggest a board layout", "What is my plan?", "How do owned colours work?"],
      actions: [],
      escalated: false,
    };
  }

  if (intent === "project_stats" && input.summary) {
    const top = input.summary.topColours.map((c) => `${c.name} (${c.count})`).join(", ");
    return {
      reply: [
        `Project “${input.summary.name}”: ${input.summary.boardCount} boards (${input.summary.boardLayout}), ${input.summary.uniqueColours} unique colours, ${input.summary.totalTiles} tiles.`,
        top ? `Top colours: ${top}.` : "",
      ]
        .filter(Boolean)
        .join(" "),
      suggestions: ["Explain Build Mode", "How do I export?", "How do owned colours work?"],
      actions: [{ type: "navigate", path: "/projects" }],
      escalated: false,
    };
  }

  if (intent === "build_next" && input.summary) {
    const boardIds = input.summary.boardCount
      ? Array.from({ length: input.summary.boardCount }, (_, i) => {
          // approximate ids — real ids come from pixelation; use progress keys
          return input.buildProgress?.completedBoardIds[i] ?? `board-${i + 1}`;
        })
      : [];
    const done = new Set(input.buildProgress?.completedBoardIds ?? []);
    const next = boardIds.find((id) => !done.has(id));
    return {
      reply: next
        ? `Build Mode: ${done.size} board(s) marked done. Focus next on board ${next} using the visual guide and colour key.`
        : input.buildProgress?.completedBoardIds.length
          ? "All tracked boards are marked done in Build Mode. Export or save your project from Results."
          : "Open Results → Build Mode, pick a board, and mark it done as you finish. Progress saves on this device.",
      suggestions: ["How do I export?", "Project colour counts", "Explain Build Mode"],
      actions: [],
      escalated: false,
    };
  }

  if (intent === "project_stats" && !input.summary) {
    return {
      reply:
        "No project is loaded. Generate a mosaic or open one from My Projects, then ask about colours or boards again.",
      suggestions: ["How do I start a mosaic?", "Open My Projects"],
      actions: [{ type: "navigate", path: "/projects" }],
      escalated: false,
    };
  }

  const chunks = retrieveKnowledge(input.message, 4);
  const sentences = rankSentences(chunks, input.message, 5);
  const title = chunks[0]?.title ?? "Fractix help";

  if (sentences.length === 0) {
    return {
      reply:
        "I could not find that in Fractix docs. Browse Documentation or Contact support — I only use in-app knowledge, not the open web.",
      suggestions: ["How do I start a mosaic?", "Open Contact", "What is my plan?"],
      actions: [
        { type: "navigate", path: "/documentation" },
        { type: "navigate", path: "/contact?topic=technical" },
      ],
      escalated: true,
    };
  }

  return {
    reply: [`${title} (local knowledge — in-app docs only)`, ...sentences].join("\n\n"),
    suggestions: ["What is my plan?", "How do owned colours work?", "Explain Build Mode"],
    actions: [{ type: "navigate", path: "/documentation" }],
    escalated: false,
  };
}
