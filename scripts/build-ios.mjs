#!/usr/bin/env node
/**
 * Build a signed Fractix .ipa for iPhone/iPad (Capacitor shell + Vite SPA).
 * Requires macOS with Xcode, CocoaPods, VITE_API_URL, and APPLE_TEAM_ID.
 * Optional: CSC_LINK / CSC_KEY_PASSWORD imported to keychain before this runs (CI).
 */
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const apiUrl =
  process.env.VITE_API_URL?.replace(/\/+$/, "") ??
  "https://picxel-puzzle-production.up.railway.app";
const teamId = process.env.APPLE_TEAM_ID;
const version = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version ?? "1.0.0";

function run(cmd, opts = {}) {
  console.log(`\n> ${cmd}\n`);
  execSync(cmd, { stdio: "inherit", cwd: root, ...opts });
}

if (!teamId) {
  console.error("[build:ios] APPLE_TEAM_ID is required for signed iOS export.");
  process.exit(1);
}

console.log(`[build:ios] API URL: ${apiUrl}`);
console.log(`[build:ios] Team ID: ${teamId}`);

run(`npx vite build`, {
  env: { ...process.env, NODE_ENV: "production", VITE_API_URL: apiUrl },
});

run("npx cap sync ios");
run("cd ios/App && pod install");

const releaseDir = join(root, "release", "ios");
mkdirSync(releaseDir, { recursive: true });

const archivePath = join(releaseDir, "Fractix.xcarchive");
const exportPlist = join(releaseDir, "ExportOptions.plist");

run(
  [
    "xcodebuild",
    "-workspace ios/App/App.xcworkspace",
    "-scheme App",
    "-configuration Release",
    '-destination "generic/platform=iOS"',
    `-archivePath "${archivePath}"`,
    "archive",
    "CODE_SIGN_STYLE=Automatic",
    `DEVELOPMENT_TEAM=${teamId}`,
    "-allowProvisioningUpdates",
  ].join(" "),
  { shell: "/bin/bash" },
);

writeFileSync(
  exportPlist,
  `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>development</string>
  <key>teamID</key>
  <string>${teamId}</string>
  <key>signingStyle</key>
  <string>automatic</string>
</dict>
</plist>
`,
);

run(
  [
    "xcodebuild",
    "-exportArchive",
    `-archivePath "${archivePath}"`,
    `-exportOptionsPlist "${exportPlist}"`,
    `-exportPath "${releaseDir}"`,
    "-allowProvisioningUpdates",
  ].join(" "),
  { shell: "/bin/bash" },
);

const exportedIpa = join(releaseDir, "App.ipa");
const artifactName = `Fractix-${version}-ios.ipa`;
const artifactPath = join(root, "release", artifactName);

run(`mv "${exportedIpa}" "${artifactPath}"`);

console.log(`\n[build:ios] Done: ${artifactPath}`);
