/**
 * Optional: regenerate client/vercel.json rewrites from env (then commit the file).
 * Vercel reads vercel.json before/at deploy — the committed /api proxy must match your
 * Railway public URL. Run from repo root:
 *   RAILWAY_PUBLIC_URL=https://your-api.up.railway.app node scripts/write-vercel-api-rewrite.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const vercelJsonPath = join(__dirname, "..", "client", "vercel.json");

const raw = (process.env.RAILWAY_PUBLIC_URL || process.env.VITE_API_URL || "").trim();
const base = raw.replace(/\/+$/, "");

if (!base) {
  console.error(
    "Usage: RAILWAY_PUBLIC_URL=https://your-service.up.railway.app node scripts/write-vercel-api-rewrite.mjs",
  );
  process.exit(1);
}

let config;
try {
  config = JSON.parse(readFileSync(vercelJsonPath, "utf8"));
} catch (e) {
  console.error("[vercel] Could not read client/vercel.json:", e);
  process.exit(1);
}

config.rewrites = [
  { source: "/api/:path*", destination: `${base}/api/:path*` },
  { source: "/(.*)", destination: "/index.html" },
];

writeFileSync(vercelJsonPath, `${JSON.stringify(config, null, 4)}\n`);
console.log(`[vercel] Wrote client/vercel.json: /api/* -> ${base}/api/*`);
