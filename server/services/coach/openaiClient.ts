import type { LicensePlan } from "@shared/schema";
import { PRO_TOOL_DEFINITIONS } from "./tools";

export type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
  name?: string;
};

export type OpenAIToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

type OpenAIResponse = {
  choices?: {
    message?: {
      role: string;
      content: string | null;
      tool_calls?: OpenAIToolCall[];
    };
  }[];
  error?: { message?: string };
};

function modelForPlan(plan: LicensePlan): string {
  if (plan === "pro") {
    return process.env.OPENAI_MODEL_PRO || "gpt-4o";
  }
  return process.env.OPENAI_MODEL_FREE || "gpt-4o-mini";
}

export function isOpenAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function assertOpenAIConfigured(): void {
  if (!isOpenAIConfigured()) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }
}

export async function chatCompletion(input: {
  plan: LicensePlan;
  messages: ChatMessage[];
  useTools: boolean;
}): Promise<{ content: string | null; toolCalls: OpenAIToolCall[] }> {
  assertOpenAIConfigured();

  const body: Record<string, unknown> = {
    model: modelForPlan(input.plan),
    messages: input.messages,
    temperature: 0.4,
    max_tokens: 900,
  };

  if (input.useTools && input.plan === "pro") {
    body.tools = PRO_TOOL_DEFINITIONS;
    body.tool_choice = "auto";
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = (await response.json()) as OpenAIResponse;
  if (!response.ok) {
    throw new Error(data.error?.message || `OpenAI request failed (${response.status})`);
  }

  const message = data.choices?.[0]?.message;
  return {
    content: message?.content ?? null,
    toolCalls: message?.tool_calls ?? [],
  };
}
