import { apiRequest } from "@/lib/queryClient";
import type { LicenseActivateResponse, LicenseValidateResponse } from "./types";

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
