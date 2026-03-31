import type { LicenseEntitlement } from "./types";

const FALLBACK_KEY = "fractix.license.entitlement";

export async function getStoredEntitlement(): Promise<LicenseEntitlement | null> {
  const secureValue = await window.desktopApi?.secureStore.get();
  const localValue = secureValue ?? localStorage.getItem(FALLBACK_KEY);
  if (!localValue) return null;
  try {
    return JSON.parse(localValue) as LicenseEntitlement;
  } catch (_error) {
    return null;
  }
}

export async function saveStoredEntitlement(entitlement: LicenseEntitlement): Promise<void> {
  const raw = JSON.stringify(entitlement);
  if (window.desktopApi?.secureStore) {
    await window.desktopApi.secureStore.set(raw);
  }
  localStorage.setItem(FALLBACK_KEY, raw);
}

export async function clearStoredEntitlement(): Promise<void> {
  if (window.desktopApi?.secureStore) {
    await window.desktopApi.secureStore.clear();
  }
  localStorage.removeItem(FALLBACK_KEY);
}
