import crypto from "crypto";
import { storage } from "../storage";

type EntitlementPayload = {
  licenseKeyHash: string;
  deviceId: string;
  lastValidatedAt: string;
  nextCheckAt: string;
};

const SIGNING_SECRET = process.env.LICENSE_SIGNING_SECRET ?? "dev-only-change-me";
const OFFLINE_GRACE_DAYS = Number(process.env.LICENSE_OFFLINE_DAYS ?? "7");
const MAX_DEVICES = Number(process.env.LICENSE_MAX_DEVICES ?? "2");

export function hashLicenseKey(licenseKey: string): string {
  return crypto.createHash("sha256").update(licenseKey).digest("hex");
}

function signPayload(payload: EntitlementPayload): string {
  return crypto.createHmac("sha256", SIGNING_SECRET).update(JSON.stringify(payload)).digest("hex");
}

function createEntitlement(payload: EntitlementPayload): string {
  const signature = signPayload(payload);
  const body = JSON.stringify({ payload, signature });
  return Buffer.from(body, "utf-8").toString("base64url");
}

function parseEntitlement(entitlement: string): { payload: EntitlementPayload; signature: string } {
  const raw = Buffer.from(entitlement, "base64url").toString("utf-8");
  return JSON.parse(raw);
}

function verifyEntitlement(entitlement: string): EntitlementPayload {
  const { payload, signature } = parseEntitlement(entitlement);
  const expected = signPayload(payload);
  if (expected !== signature) {
    throw new Error("Invalid entitlement signature.");
  }
  return payload;
}

async function validateWithDatabase(licenseKeyHash: string): Promise<{ valid: boolean; reason?: string; maxDevices?: number }> {
  const license = await storage.getLicenseByHash(licenseKeyHash);
  if (!license) {
    return { valid: false, reason: "License key not found. Please check your key and try again." };
  }
  if (!license.isActive) {
    return { valid: false, reason: "This license key has been deactivated." };
  }
  return { valid: true, maxDevices: license.maxDevices };
}

function nextValidationDate(now = new Date()): string {
  return new Date(now.getTime() + OFFLINE_GRACE_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

export const licenseService = {
  verifyEntitlement,

  async activate(input: { licenseKey: string; deviceId: string; deviceName?: string }) {
    const keyHash = hashLicenseKey(input.licenseKey.trim());
    const dbResult = await validateWithDatabase(keyHash);
    if (!dbResult.valid) {
      throw new Error(dbResult.reason ?? "License validation failed.");
    }

    const deviceLimit = dbResult.maxDevices ?? MAX_DEVICES;
    const activeDevices = await storage.getActiveLicenseActivations(keyHash);
    const existingDevice = activeDevices.find((entry) => entry.deviceId === input.deviceId);
    if (!existingDevice && activeDevices.length >= deviceLimit) {
      throw new Error(`Device limit reached (${deviceLimit}). Deactivate another device first.`);
    }

    await storage.upsertLicenseActivation({
      licenseKeyHash: keyHash,
      deviceId: input.deviceId,
      deviceName: input.deviceName,
      isActive: true,
    });
    await storage.createLicenseEvent({
      licenseKeyHash: keyHash,
      deviceId: input.deviceId,
      eventType: "activated",
      metadata: { deviceName: input.deviceName, maxDevices: deviceLimit },
    });

    const now = new Date();
    const payload: EntitlementPayload = {
      licenseKeyHash: keyHash,
      deviceId: input.deviceId,
      lastValidatedAt: now.toISOString(),
      nextCheckAt: nextValidationDate(now),
    };

    return {
      entitlement: createEntitlement(payload),
      nextCheckAt: payload.nextCheckAt,
      maxDevices: deviceLimit,
      offlineGraceDays: OFFLINE_GRACE_DAYS,
    };
  },

  async validate(input: { entitlement: string; deviceId: string; forceRemote?: boolean }) {
    const payload = verifyEntitlement(input.entitlement);
    if (payload.deviceId !== input.deviceId) {
      throw new Error("Entitlement does not belong to this device.");
    }

    const activation = await storage.getLicenseActivationByDevice(payload.licenseKeyHash, input.deviceId);
    if (!activation || !activation.isActive) {
      throw new Error("This device activation is no longer valid.");
    }

    const now = new Date();
    const shouldForceRemote = input.forceRemote === true || new Date(payload.nextCheckAt) <= now;
    if (shouldForceRemote) {
      await storage.createLicenseEvent({
        licenseKeyHash: payload.licenseKeyHash,
        deviceId: input.deviceId,
        eventType: "revalidated",
      });
    }

    const refreshedPayload: EntitlementPayload = {
      ...payload,
      lastValidatedAt: now.toISOString(),
      nextCheckAt: nextValidationDate(now),
    };

    await storage.upsertLicenseActivation({
      licenseKeyHash: payload.licenseKeyHash,
      deviceId: input.deviceId,
      isActive: true,
    });

    return {
      entitlement: createEntitlement(refreshedPayload),
      nextCheckAt: refreshedPayload.nextCheckAt,
      requiresOnlineValidation: shouldForceRemote,
    };
  },

  async deactivate(input: { entitlement: string; deviceId: string }) {
    const payload = verifyEntitlement(input.entitlement);
    if (payload.deviceId !== input.deviceId) {
      throw new Error("Entitlement does not belong to this device.");
    }

    await storage.deactivateLicenseActivation(payload.licenseKeyHash, input.deviceId);
    await storage.createLicenseEvent({
      licenseKeyHash: payload.licenseKeyHash,
      deviceId: input.deviceId,
      eventType: "deactivated",
    });
  },
};
