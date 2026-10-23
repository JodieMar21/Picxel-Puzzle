import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, jsonb, timestamp, boolean, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const LICENSE_PLANS = ["basic", "pro"] as const;
export type LicensePlan = (typeof LICENSE_PLANS)[number];

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  originalImageUrl: text("original_image_url").notNull(),
  pixelatedImageUrl: text("pixelated_image_url"),
  boardCount: integer("board_count").notNull(),
  boardLayout: text("board_layout").notNull(),
  boardRows: integer("board_rows"),
  boardCols: integer("board_cols"),
  colorData: jsonb("color_data"),
  constructionGuideUrl: text("construction_guide_url"),
  pixelationResult: jsonb("pixelation_result"), // Store complete pixelation data
  status: text("status").notNull().default('processing'), // 'processing', 'completed', 'failed'
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const insertProjectSchema = createInsertSchema(projects).pick({
  name: true,
  originalImageUrl: true,
  boardCount: true,
  boardLayout: true,
  boardRows: true,
  boardCols: true,
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

export const licenses = pgTable("licenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  licenseKey: text("license_key").notNull().unique(),
  licenseKeyHash: text("license_key_hash").notNull().unique(),
  stripeSessionId: text("stripe_session_id").notNull().unique(),
  customerEmail: text("customer_email").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  maxDevices: integer("max_devices").notNull().default(2),
  /** Stripe signup tier: basic → Free Coach, pro → Pro Coach */
  plan: text("plan").notNull().default("basic"),
  /** Stripe Price ID from the checkout session that issued this license */
  stripePriceId: text("stripe_price_id"),
  /** AES-GCM encrypted TOTP secret (Base32); set during setup before confirm */
  totpSecretEnc: text("totp_secret_enc"),
  totpEnabled: boolean("totp_enabled").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export type License = typeof licenses.$inferSelect;

export const coachConversations = pgTable("coach_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  licenseKeyHash: text("license_key_hash").notNull(),
  deviceId: text("device_id").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export type CoachConversation = typeof coachConversations.$inferSelect;

export const coachMessages = pgTable("coach_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull(),
  role: text("role").notNull(), // user | assistant | system
  content: text("content").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export type CoachMessage = typeof coachMessages.$inferSelect;

export const coachUsage = pgTable(
  "coach_usage",
  {
    licenseKeyHash: text("license_key_hash").notNull(),
    day: text("day").notNull(), // YYYY-MM-DD
    count: integer("count").notNull().default(0),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.licenseKeyHash, table.day] }),
  }),
);

export type CoachUsage = typeof coachUsage.$inferSelect;

export const licenseActivations = pgTable("license_activations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  licenseKeyHash: text("license_key_hash").notNull(),
  deviceId: text("device_id").notNull(),
  deviceName: text("device_name"),
  isActive: boolean("is_active").notNull().default(true),
  lastValidatedAt: timestamp("last_validated_at").notNull().default(sql`now()`),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const licenseEvents = pgTable("license_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  licenseKeyHash: text("license_key_hash").notNull(),
  deviceId: text("device_id"),
  eventType: text("event_type").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const activateLicenseSchema = z.object({
  licenseKey: z.string().min(8),
  deviceId: z.string().min(8),
  deviceName: z.string().min(1).max(120).optional(),
});

export const validateLicenseSchema = z.object({
  entitlement: z.string().min(20),
  deviceId: z.string().min(8),
  forceRemote: z.boolean().optional(),
});

export const deactivateLicenseSchema = z.object({
  entitlement: z.string().min(20),
  deviceId: z.string().min(8),
});

export const activateLicense2faSchema = z.object({
  challengeToken: z.string().min(20),
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code from your authenticator app."),
});

export const license2faCodeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code from your authenticator app."),
});

export const checkoutPlanSchema = z.object({
  plan: z.enum(LICENSE_PLANS).optional().default("basic"),
});

export const coachBuildProgressSchema = z.object({
  completedBoardIds: z.array(z.string()).default([]),
  activeBoardId: z.string().optional(),
});

export const coachChatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  conversationId: z.string().min(1).optional(),
  page: z.string().max(64).optional(),
  projectId: z.string().min(1).optional(),
  buildProgress: coachBuildProgressSchema.optional(),
  ownedColorHexes: z.array(z.string()).max(64).optional(),
});

export const coachActionSchema = z.object({
  type: z.enum(["navigate", "checkout"]),
  path: z.string().optional(),
  plan: z.enum(LICENSE_PLANS).optional(),
});

export type CoachChatRequest = z.infer<typeof coachChatRequestSchema>;
export type CoachAction = z.infer<typeof coachActionSchema>;

export type CoachChatResponse = {
  conversationId: string;
  reply: string;
  mode: "free" | "pro";
  /** openai = ChatGPT API; local = in-app knowledge + DB only */
  engine: "openai" | "local";
  suggestions: string[];
  actions: CoachAction[];
  escalated: boolean;
};

// Frontend-only types for pixelation data
export interface PixelationResult {
  pixelatedImageData: string;
  colorMap: ColorUsage[];
  boards: BoardData[];
  totalTiles: number;
  /** Tiles per board edge (e.g. 32 => 32×32). Defaults to 32 for older projects. */
  boardTileSize?: number;
}

export interface ColorUsage {
  name: string;
  hex: string;
  count: number;
}

export interface BoardData {
  id: string;
  position: { row: number; col: number };
  pixels: string[][]; // boardTileSize x boardTileSize array of hex colors
}
