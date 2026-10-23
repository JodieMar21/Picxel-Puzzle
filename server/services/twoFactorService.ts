import crypto from "crypto";
import QRCode from "qrcode";
import { generateSecret, generateURI, verify } from "otplib";
import type { License } from "@shared/schema";

const CHALLENGE_TTL_MS = 10 * 60 * 1000;

type ActivateChallenge = {
  licenseKeyHash: string;
  deviceId: string;
  deviceName?: string;
  exp: number;
};

function encryptionKey(): Buffer {
  const secret = process.env.LICENSE_SIGNING_SECRET ?? "dev-only-change-me";
  return crypto.createHash("sha256").update(`${secret}:license-2fa`).digest();
}

export function encryptTotpSecret(plainSecret: string): string {
  const key = encryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plainSecret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function decryptTotpSecret(stored: string): string {
  const key = encryptionKey();
  const buf = Buffer.from(stored, "base64url");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function isTwoFactorEnabled(license: License): boolean {
  return license.totpEnabled === true && !!license.totpSecretEnc;
}

export function hasPendingTwoFactorSetup(license: License): boolean {
  return !license.totpEnabled && !!license.totpSecretEnc;
}

export async function verifyTotpCode(license: License, code: string): Promise<boolean> {
  if (!license.totpSecretEnc) return false;
  const secret = decryptTotpSecret(license.totpSecretEnc);
  const result = await verify({ secret, token: code });
  return result.valid === true;
}

export function createActivateChallenge(input: Omit<ActivateChallenge, "exp">): string {
  const payload: ActivateChallenge = {
    ...input,
    exp: Date.now() + CHALLENGE_TTL_MS,
  };
  const body = JSON.stringify(payload);
  const sig = crypto.createHmac("sha256", encryptionKey()).update(body).digest("base64url");
  return Buffer.from(JSON.stringify({ payload, sig }), "utf8").toString("base64url");
}

export function parseActivateChallenge(token: string): ActivateChallenge {
  const raw = JSON.parse(Buffer.from(token, "base64url").toString("utf8")) as {
    payload: ActivateChallenge;
    sig: string;
  };
  const expected = crypto
    .createHmac("sha256", encryptionKey())
    .update(JSON.stringify(raw.payload))
    .digest("base64url");
  if (expected !== raw.sig) {
    throw new Error("Invalid two-factor challenge.");
  }
  if (raw.payload.exp < Date.now()) {
    throw new Error("Two-factor challenge expired. Start activation again.");
  }
  return raw.payload;
}

export async function beginTotpSetup(license: License): Promise<{
  otpauthUrl: string;
  qrDataUrl: string;
  /** Shown once for manual entry if QR scan fails */
  secret: string;
}> {
  const secret = generateSecret();
  const otpauthUrl = generateURI({
    issuer: "Fractix",
    label: license.customerEmail,
    secret,
  });
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl, { margin: 1, width: 220 });
  return { otpauthUrl, qrDataUrl, secret };
}
