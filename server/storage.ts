import { licenseActivations, licenseEvents, licenses, projects, type License, type Project, type InsertProject } from "@shared/schema";
import { db } from "./db";
import { and, desc, eq } from "drizzle-orm";

export interface IStorage {
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined>;
  getAllProjects(): Promise<Project[]>;
  createLicense(input: { licenseKey: string; licenseKeyHash: string; stripeSessionId: string; customerEmail: string }): Promise<License>;
  getLicenseByHash(licenseKeyHash: string): Promise<License | undefined>;
  getLicenseByStripeSession(stripeSessionId: string): Promise<License | undefined>;
  getLicenseActivationByDevice(licenseKeyHash: string, deviceId: string): Promise<typeof licenseActivations.$inferSelect | undefined>;
  getActiveLicenseActivations(licenseKeyHash: string): Promise<(typeof licenseActivations.$inferSelect)[]>;
  upsertLicenseActivation(input: {
    licenseKeyHash: string;
    deviceId: string;
    deviceName?: string;
    isActive?: boolean;
  }): Promise<typeof licenseActivations.$inferSelect>;
  deactivateLicenseActivation(licenseKeyHash: string, deviceId: string): Promise<void>;
  createLicenseEvent(input: {
    licenseKeyHash: string;
    deviceId?: string;
    eventType: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const [project] = await db
      .insert(projects)
      .values(insertProject)
      .returning();
    return project;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined> {
    const [project] = await db
      .update(projects)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return project || undefined;
  }

  async getAllProjects(): Promise<Project[]> {
    return await db.select().from(projects).orderBy(desc(projects.updatedAt));
  }

  async createLicense(input: { licenseKey: string; licenseKeyHash: string; stripeSessionId: string; customerEmail: string }): Promise<License> {
    const [license] = await db
      .insert(licenses)
      .values(input)
      .returning();
    return license;
  }

  async getLicenseByHash(licenseKeyHash: string): Promise<License | undefined> {
    const [license] = await db.select().from(licenses).where(eq(licenses.licenseKeyHash, licenseKeyHash));
    return license;
  }

  async getLicenseByStripeSession(stripeSessionId: string): Promise<License | undefined> {
    const [license] = await db.select().from(licenses).where(eq(licenses.stripeSessionId, stripeSessionId));
    return license;
  }

  async getLicenseActivationByDevice(licenseKeyHash: string, deviceId: string): Promise<typeof licenseActivations.$inferSelect | undefined> {
    const [activation] = await db
      .select()
      .from(licenseActivations)
      .where(and(eq(licenseActivations.licenseKeyHash, licenseKeyHash), eq(licenseActivations.deviceId, deviceId)));
    return activation;
  }

  async getActiveLicenseActivations(licenseKeyHash: string): Promise<(typeof licenseActivations.$inferSelect)[]> {
    return db
      .select()
      .from(licenseActivations)
      .where(and(eq(licenseActivations.licenseKeyHash, licenseKeyHash), eq(licenseActivations.isActive, true)));
  }

  async upsertLicenseActivation(input: {
    licenseKeyHash: string;
    deviceId: string;
    deviceName?: string;
    isActive?: boolean;
  }): Promise<typeof licenseActivations.$inferSelect> {
    const existing = await this.getLicenseActivationByDevice(input.licenseKeyHash, input.deviceId);
    if (existing) {
      const [updated] = await db
        .update(licenseActivations)
        .set({
          deviceName: input.deviceName ?? existing.deviceName,
          isActive: input.isActive ?? true,
          lastValidatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(licenseActivations.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(licenseActivations)
      .values({
        licenseKeyHash: input.licenseKeyHash,
        deviceId: input.deviceId,
        deviceName: input.deviceName,
        isActive: input.isActive ?? true,
      })
      .returning();
    return created;
  }

  async deactivateLicenseActivation(licenseKeyHash: string, deviceId: string): Promise<void> {
    await db
      .update(licenseActivations)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(and(eq(licenseActivations.licenseKeyHash, licenseKeyHash), eq(licenseActivations.deviceId, deviceId)));
  }

  async createLicenseEvent(input: {
    licenseKeyHash: string;
    deviceId?: string;
    eventType: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await db.insert(licenseEvents).values({
      licenseKeyHash: input.licenseKeyHash,
      deviceId: input.deviceId,
      eventType: input.eventType,
      metadata: input.metadata,
    });
  }
}

export const storage = new DatabaseStorage();
