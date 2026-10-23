import { apiUrl } from "@/lib/apiBase";
import type { CoachPlan } from "./types";

export async function startPlanCheckout(plan: CoachPlan): Promise<void> {
  const res = await fetch(apiUrl("/api/checkout"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan }),
    credentials: "omit",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Could not start checkout." }));
    throw new Error(err.message || "Could not start checkout.");
  }
  const { url } = (await res.json()) as { url: string };
  if (window.desktopApi?.openExternal) {
    await window.desktopApi.openExternal(url);
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
