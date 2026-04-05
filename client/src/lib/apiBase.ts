/**
 * API origin for split deploy (e.g. Vercel SPA → Railway). When unset, paths stay
 * relative for same-origin (local monolith, Electron + embedded server).
 */
export function apiUrl(path: string): string {
  const raw = import.meta.env.VITE_API_URL as string | undefined;
  const base = raw?.replace(/\/+$/, "") ?? "";
  const p = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}
