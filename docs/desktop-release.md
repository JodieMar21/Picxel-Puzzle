# Desktop release runbook

## 1) Prerequisites

- Node.js 20+
- Apple Developer account (for macOS signing/notarization)
- Windows code-signing certificate (recommended)
- Lemon Squeezy API key
- PostgreSQL database available for production

## 2) Required environment variables

Set variables from `.env.example` plus signing secrets in CI:

- `DATABASE_URL`
- `LEMON_SQUEEZY_API_KEY`
- `LICENSE_SIGNING_SECRET`
- `LICENSE_OFFLINE_DAYS`
- `LICENSE_MAX_DEVICES`
- `CSC_LINK`
- `CSC_KEY_PASSWORD`
- `APPLE_ID`
- `APPLE_APP_SPECIFIC_PASSWORD`
- `APPLE_TEAM_ID`

## 3) Local desktop build

1. Install dependencies:
   - `npm ci`
2. Build web + server + electron bundles:
   - `npm run build`
   - `npm run build:electron`
3. Package installers:
   - `npm run build:desktop`

Artifacts are generated in `release/`.

## 4) License flow behavior

- First launch requires `licenseKey`.
- Activation endpoint: `POST /api/license/activate`.
- App stores signed entitlement token in keychain (`keytar`) with localStorage fallback.
- App can run offline until `nextCheckAt`.
- On expiry window, app revalidates using `POST /api/license/validate`.
- Device limit is enforced server-side from `LICENSE_MAX_DEVICES`.
- Device transfer uses `POST /api/license/deactivate`.

## 5) CI release

- Tag with `v*` to trigger `.github/workflows/desktop-release.yml`.
- Workflow builds on both macOS and Windows and uploads installer artifacts.
- Optional next step: publish artifacts to GitHub Releases.
