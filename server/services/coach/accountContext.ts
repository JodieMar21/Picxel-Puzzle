import type { License, LicensePlan } from "@shared/schema";
import { storage } from "../../storage";

export type CoachAccountSnapshot = {
  email: string;
  plan: LicensePlan;
  licenseActive: boolean;
  maxDevices: number;
  activeDeviceCount: number;
  activeDevices: { name: string; lastValidatedAt: string }[];
  offlineGraceDays: number;
  canUseProCoach: boolean;
};

function normalizePlan(plan: string | null | undefined): LicensePlan {
  return plan === "pro" ? "pro" : "basic";
}

export async function buildAccountSnapshot(license: License): Promise<CoachAccountSnapshot> {
  const plan = normalizePlan(license.plan);
  const activations = await storage.getActiveLicenseActivations(license.licenseKeyHash);
  const offlineGraceDays = Number(process.env.LICENSE_OFFLINE_DAYS ?? "7");

  return {
    email: license.customerEmail,
    plan,
    licenseActive: license.isActive,
    maxDevices: license.maxDevices,
    activeDeviceCount: activations.length,
    activeDevices: activations.map((a) => ({
      name: a.deviceName || "Unnamed device",
      lastValidatedAt: a.lastValidatedAt.toISOString(),
    })),
    offlineGraceDays,
    canUseProCoach: plan === "pro",
  };
}

export function formatAccountForPrompt(snapshot: CoachAccountSnapshot): string {
  const devices =
    snapshot.activeDevices.length === 0
      ? "none listed"
      : snapshot.activeDevices.map((d) => `${d.name} (last check ${d.lastValidatedAt})`).join("; ");

  return [
    `Plan: ${snapshot.plan} (${snapshot.canUseProCoach ? "Pro Coach" : "Free Coach"})`,
    `License active: ${snapshot.licenseActive ? "yes" : "no"}`,
    `Email on file: ${snapshot.email}`,
    `Devices: ${snapshot.activeDeviceCount} of ${snapshot.maxDevices}`,
    `Active devices: ${devices}`,
    `Offline grace days: ${snapshot.offlineGraceDays}`,
  ].join("\n");
}
