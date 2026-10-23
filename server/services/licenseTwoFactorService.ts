import type { License } from "@shared/schema";
import { storage } from "../storage";
import { licenseService } from "./licenseService";
import {
  beginTotpSetup,
  createActivateChallenge,
  encryptTotpSecret,
  hasPendingTwoFactorSetup,
  isTwoFactorEnabled,
  parseActivateChallenge,
  verifyTotpCode,
} from "./twoFactorService";

export type ActivateResult =
  | Awaited<ReturnType<typeof licenseService.finishActivation>>
  | { requiresTwoFactor: true; challengeToken: string };

export const licenseTwoFactorService = {
  async activateWithOptional2fa(input: {
    licenseKey: string;
    deviceId: string;
    deviceName?: string;
  }): Promise<ActivateResult> {
    const prepared = await licenseService.prepareActivation(input);
    const license = await storage.getLicenseByHash(prepared.licenseKeyHash);
    if (!license || !isTwoFactorEnabled(license)) {
      return licenseService.finishActivation(prepared);
    }

    const challengeToken = createActivateChallenge({
      licenseKeyHash: prepared.licenseKeyHash,
      deviceId: input.deviceId,
      deviceName: input.deviceName,
    });

    return { requiresTwoFactor: true, challengeToken };
  },

  async completeActivationWith2fa(input: { challengeToken: string; code: string }) {
    const challenge = parseActivateChallenge(input.challengeToken);
    const license = await storage.getLicenseByHash(challenge.licenseKeyHash);
    if (!license || !isTwoFactorEnabled(license)) {
      throw new Error("Two-factor authentication is not enabled for this license.");
    }

    const valid = await verifyTotpCode(license, input.code);
    if (!valid) {
      throw new Error("Invalid authenticator code. Try again.");
    }

    const prepared = await licenseService.prepareActivation({
      licenseKeyHash: challenge.licenseKeyHash,
      deviceId: challenge.deviceId,
      deviceName: challenge.deviceName,
    });

    return licenseService.finishActivation(prepared);
  },

  async getStatus(license: License) {
    return {
      enabled: isTwoFactorEnabled(license),
      pendingSetup: hasPendingTwoFactorSetup(license),
    };
  },

  async startSetup(license: License) {
    if (isTwoFactorEnabled(license)) {
      throw new Error("Two-factor authentication is already enabled.");
    }

    const { qrDataUrl, secret } = await beginTotpSetup(license);
    await storage.updateLicenseTotp(license.licenseKeyHash, {
      totpSecretEnc: encryptTotpSecret(secret),
      totpEnabled: false,
    });

    return { qrDataUrl };
  },

  async confirmSetup(license: License, code: string) {
    const current = await storage.getLicenseByHash(license.licenseKeyHash);
    if (!current?.totpSecretEnc) {
      throw new Error("Start two-factor setup before confirming.");
    }
    if (current.totpEnabled) {
      throw new Error("Two-factor authentication is already enabled.");
    }

    const valid = await verifyTotpCode(current, code);
    if (!valid) {
      throw new Error("Invalid authenticator code. Try again.");
    }

    await storage.updateLicenseTotp(license.licenseKeyHash, {
      totpSecretEnc: current.totpSecretEnc,
      totpEnabled: true,
    });
    await storage.createLicenseEvent({
      licenseKeyHash: license.licenseKeyHash,
      eventType: "2fa_enabled",
    });

    return { ok: true as const };
  },

  async cancelSetup(license: License) {
    if (isTwoFactorEnabled(license)) {
      throw new Error("Disable two-factor authentication instead of canceling setup.");
    }
    await storage.updateLicenseTotp(license.licenseKeyHash, {
      totpSecretEnc: null,
      totpEnabled: false,
    });
    return { ok: true as const };
  },

  async disable(license: License, code: string) {
    if (!isTwoFactorEnabled(license)) {
      throw new Error("Two-factor authentication is not enabled.");
    }

    const valid = await verifyTotpCode(license, code);
    if (!valid) {
      throw new Error("Invalid authenticator code. Try again.");
    }

    await storage.updateLicenseTotp(license.licenseKeyHash, {
      totpSecretEnc: null,
      totpEnabled: false,
    });
    await storage.createLicenseEvent({
      licenseKeyHash: license.licenseKeyHash,
      eventType: "2fa_disabled",
    });

    return { ok: true as const };
  },
};
