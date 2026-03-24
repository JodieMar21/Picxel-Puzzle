import { v4 as uuidv4 } from "uuid";

const DEVICE_ID_KEY = "picxel.device.id";

export function getDeviceId(): string {
  const existing = localStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const created = uuidv4();
  localStorage.setItem(DEVICE_ID_KEY, created);
  return created;
}

export function getDeviceName(): string {
  return `${navigator.platform || "Unknown"}:${navigator.userAgent.slice(0, 64)}`;
}
