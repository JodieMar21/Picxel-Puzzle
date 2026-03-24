import crypto from "crypto";
import { storage } from "../storage";

type EntitlementPayload = {
  licenseKeyHash: string;
  deviceId: string;
  lastValidatedAt: string;
  nextCheckAt: string;
};

type ValidateRemoteResult = {
  valid: boolean;
  reason?: string;
  lemonResponse?: unknown;
};

const LEMON_VALIDATE_URL = process.env.LEMON_SQUEEZY_VALIDATE_URL ?? "https://api.lemonsqueezy.com/v1/licenses/validate";
const SIGNING_SECRET = process.env.LICENSE_SIGNING_SECRET ?? "dev-only-change-me";
const OFFLINE_GRACE_DAYS = Number(process.env.LICENSE_OFFLINE_DAYS ?? "7");
const MAX_DEVICES = Number(process.env.LICENSE_MAX_DEVICES ?? "2");

function hashLicenseKey(licenseKey: string): string {
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

async function validateWithLemonSqueezy(licenseKey: string, instanceName: string): Promise<ValidateRemoteResult> {
  const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
  if (!apiKey) {
    return { valid: true, reason: "LEMON_SQUEEZY_API_KEY missing; running permissive validation." };
  }

  try {
    const response = await fetch(LEMON_VALIDATE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        license_key: licenseKey,
        instance_name: instanceName,
      }),
    });

    const responseText = await response.text();
    let parsed: any = null;
    try {
      parsed = responseText ? JSON.parse(responseText) : null;
    } catch (_error) {
      parsed = { raw: responseText };
    }

    const bodyValid =
      parsed?.valid === true ||
      parsed?.license_key?.status === "active" ||
      parsed?.meta?.valid === true;

    if (!response.ok || !bodyValid) {
      return {
        valid: false,
        reason: parsed?.error ?? parsed?.message ?? "License is invalid.",
        lemonResponse: parsed,
      };
    }

    return { valid: true, lemonResponse: parsed };
  } catch (error) {
    return {
      valid: false,
      reason: error instanceof Error ? error.message : "License server unreachable.",
    };
  }
}

function nextValidationDate(now = new Date()): string {
  return new Date(now.getTime() + OFFLINE_GRACE_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

export const licenseService = {
  verifyEntitlement,

  async activate(input: { licenseKey: string; deviceId: string; deviceName?: string }) {
    const keyHash = hashLicenseKey(input.licenseKey.trim());
    const remoteResult = await validateWithLemonSqueezy(input.licenseKey.trim(), input.deviceName ?? input.deviceId);
    if (!remoteResult.valid) {
      throw new Error(remoteResult.reason ?? "License validation failed.");
    }

    const activeDevices = await storage.getActiveLicenseActivations(keyHash);
    const existingDevice = activeDevices.find((entry) => entry.deviceId === input.deviceId);
    if (!existingDevice && activeDevices.length >= MAX_DEVICES) {
      throw new Error(`Device limit reached (${MAX_DEVICES}). Deactivate another device first.`);
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
      metadata: { deviceName: input.deviceName, maxDevices: MAX_DEVICES },
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
      maxDevices: MAX_DEVICES,
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
