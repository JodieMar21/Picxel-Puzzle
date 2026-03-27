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
- `GH_TOKEN` (required for `electron-builder` GitHub publish)

## 3) Local desktop build (package only)

1. Install dependencies:
   - `npm ci`
2. Build web + server + electron bundles:
   - `npm run build`
   - `npm run build:electron`
3. Package installers without publishing:
   - `npm run build:desktop`

Artifacts are generated in `release/`.

## 4) Publish desktop build to GitHub Releases

`electron-builder` uses `GH_TOKEN` when publishing with the GitHub provider.

- Token options:
  - Fine-grained token scoped to this repository with `Contents: Read and write`.
  - Classic token with `repo` scope.
- Windows setup examples:
  - Command Prompt (persistent): `setx GH_TOKEN "your_token_here"`
  - PowerShell (current session): `$env:GH_TOKEN="your_token_here"`
- Run publish build:
  - `npm run build:desktop:publish`
- Quick verify:
  - Confirm build logs do not contain `GitHub Personal Access Token is not set`.
  - Confirm release artifacts appear under your GitHub repository Releases.

## 5) License flow behavior

- First launch requires `licenseKey`.
- Activation endpoint: `POST /api/license/activate`.
- App stores signed entitlement token in keychain (`keytar`) with localStorage fallback.
- App can run offline until `nextCheckAt`.
- On expiry window, app revalidates using `POST /api/license/validate`.
- Device limit is enforced server-side from `LICENSE_MAX_DEVICES`.
- Device transfer uses `POST /api/license/deactivate`.

## 6) CI release

- Tag with `v*` to trigger `.github/workflows/desktop-release.yml`.
- Workflow builds on both macOS and Windows and uploads installer artifacts.
- To publish from CI, store `GH_TOKEN` in repository secrets and expose it to the release job.
