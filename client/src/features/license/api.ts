import { apiUrl } from "@/lib/apiBase";
import { apiRequest, getCurrentLicenseHeaders } from "@/lib/queryClient";
import type {
  LicenseActivateResponse,
  LicenseActivateSuccess,
  LicenseTwoFactorStatus,
  LicenseValidateResponse,
} from "./types";

export async function activateLicense(input: {
  licenseKey: string;
  deviceId: string;
  deviceName: string;
}): Promise<LicenseActivateResponse> {
  const response = await apiRequest("POST", "/api/license/activate", input);
  return response.json();
}

export async function validateLicense(input: {
  entitlement: string;
  deviceId: string;
  forceRemote?: boolean;
}): Promise<LicenseValidateResponse> {
  const response = await apiRequest("POST", "/api/license/validate", input);
  return response.json();
}

export async function deactivateLicense(input: { entitlement: string; deviceId: string }): Promise<void> {
  await apiRequest("POST", "/api/license/deactivate", input);
}

export async function deactivateAllDevices(input: { entitlement: string; deviceId: string }): Promise<void> {
  await apiRequest("POST", "/api/license/deactivate-all", input);
}

export async function completeActivationTwoFactor(input: {
  challengeToken: string;
  code: string;
}): Promise<LicenseActivateSuccess> {
  const response = await apiRequest("POST", "/api/license/activate/2fa", input);
  return response.json();
}

export async function fetchTwoFactorStatus(): Promise<LicenseTwoFactorStatus> {
  const response = await fetch(apiUrl("/api/license/2fa/status"), {
    headers: { ...getCurrentLicenseHeaders() },
    credentials: "omit",
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: "Could not load 2FA status." }));
    throw new Error(err.message || "Could not load 2FA status.");
  }
  return response.json();
}

export async function startTwoFactorSetup(): Promise<{ qrDataUrl: string }> {
  const response = await apiRequest("POST", "/api/license/2fa/setup", {});
  return response.json();
}

export async function confirmTwoFactorSetup(code: string): Promise<void> {
  await apiRequest("POST", "/api/license/2fa/confirm", { code });
}

export async function cancelTwoFactorSetup(): Promise<void> {
  await apiRequest("POST", "/api/license/2fa/cancel-setup", {});
}

export async function disableTwoFactor(code: string): Promise<void> {
  await apiRequest("POST", "/api/license/2fa/disable", { code });
}
