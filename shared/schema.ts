import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, jsonb, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export type License = typeof licenses.$inferSelect;

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

// Frontend-only types for pixelation data
export interface PixelationResult {
  pixelatedImageData: string;
  colorMap: ColorUsage[];
  boards: BoardData[];
  totalTiles: number;
}

export interface ColorUsage {
  name: string;
  hex: string;
  count: number;
}

export interface BoardData {
  id: string;
  position: { row: number; col: number };
  pixels: string[][]; // 32x32 array of hex colors
}
