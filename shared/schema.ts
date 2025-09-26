import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  originalImageUrl: text("original_image_url").notNull(),
  pixelatedImageUrl: text("pixelated_image_url"),
  boardCount: integer("board_count").notNull(),
  boardLayout: text("board_layout").notNull(),
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
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

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
