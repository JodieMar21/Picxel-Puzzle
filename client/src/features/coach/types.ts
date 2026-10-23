export type CoachPlan = "basic" | "pro";

export type CoachAction = {
  type: "navigate" | "checkout";
  path?: string;
  plan?: CoachPlan;
};

export type CoachChatResponse = {
  conversationId: string;
  reply: string;
  mode: "free" | "pro";
  engine: "openai" | "local";
  suggestions: string[];
  actions: CoachAction[];
  escalated: boolean;
};

export type CoachAccountContext = {
  email: string;
  plan: CoachPlan;
  licenseActive: boolean;
  maxDevices: number;
  activeDeviceCount: number;
  activeDevices: { name: string; lastValidatedAt: string }[];
  offlineGraceDays: number;
  canUseProCoach: boolean;
};

export type CoachUiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: CoachAction[];
  suggestions?: string[];
};
