# Desktop release runbook

## 1) Prerequisites

- Node.js 20+
- Apple Developer account (for macOS signing/notarization)
- Windows code-signing certificate (recommended)
- PostgreSQL database available for production

## 2) Required GitHub Actions secrets (desktop workflow)

The desktop release workflow ([`.github/workflows/desktop-release.yml`](../.github/workflows/desktop-release.yml)) writes [`electron-desktop-env/desktop.env`](../electron-desktop-env/desktop.env.example) from secrets before packaging. Ensure these repository secrets exist under **Settings → Secrets and variables → Actions**:

**Embedded server / billing (written into `desktop.env`)**

- `DATABASE_URL` — required for the packaged app to start the embedded API (empty values are skipped when writing the file; the server will fail if unset at runtime).
- `LICENSE_SIGNING_SECRET`
- `APP_BASE_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ID`

**Signing (optional — omit for unsigned CI builds)**

- `CSC_LINK` / `CSC_KEY_PASSWORD` — code-signing certificate (macOS `.p12` or Windows `.pfx`, base64-encoded as a single line with no newlines). When these secrets are absent, CI builds unsigned installers.
- `APPLE_ID` / `APPLE_APP_SPECIFIC_PASSWORD` / `APPLE_TEAM_ID` — macOS notarization (only needed when signing macOS builds for Gatekeeper-friendly distribution).

The workflow only exports `CSC_LINK` to electron-builder when the secret is non-empty. GitHub Actions sets missing secrets to an empty string, not "unset"; passing `CSC_LINK=""` causes electron-builder to treat the repo root as a certificate path and fail with `not a file`.

**Publishing installers**

- `GH_TOKEN` — classic `repo` scope or fine-grained token with **Contents: Read and write** on this repository (required when publishing releases with `electron-builder`).

**iPad / iOS (Capacitor build)**

Bundle ID: **`com.picxel.ios`**. CI builds a signed **`.ipa`** only when signing secrets are present; otherwise it builds an unsigned Simulator `.zip` (not installable on a real iPad).

### Apple Developer / TestFlight setup

1. **Apple Developer Program** — paid membership active.
2. **Identifiers** → register App ID `com.picxel.ios` (App Store / iOS).
3. **Certificates** → create **Apple Distribution** (not Development, not Developer ID).
   - On a Mac: Xcode → Settings → Accounts → Manage Certificates → **Apple Distribution**, or Certificates portal → create & download.
   - Export as `.p12` with a password.
4. **App Store Connect** → My Apps → New App → bundle `com.picxel.ios`.
5. **GitHub Actions secrets** (Settings → Secrets and variables → Actions):

| Secret | Purpose |
|--------|---------|
| `APPLE_TEAM_ID` | 10-char Team ID (Membership details) |
| `CSC_LINK` | Base64 of the Distribution `.p12` (one line, no newlines) |
| `CSC_KEY_PASSWORD` | Password for that `.p12` |
| `VITE_API_URL` | Optional; defaults to production Railway URL |
| `IOS_EXPORT_METHOD` | Optional; default in script is `app-store-connect` (TestFlight). Use `development` only for cable installs on registered devices. |

Encode the cert:

```bash
base64 -i YourDistribution.p12 | tr -d '\n' > csc_link.txt
# paste contents of csc_link.txt into CSC_LINK
```

6. **Build the IPA** (does not run on every `deployment` push — that was blocking Railway):
   - GitHub → Actions → **Desktop Release** → **Run workflow**, or
   - Push a `v*` tag.
7. Download the `fractix-ios-latest` artifact (`.ipa`), upload with **Transporter** or Xcode Organizer to App Store Connect, then invite testers in **TestFlight**.

On Railway, set `CORS_ALLOWED_ORIGINS` to include `capacitor://localhost` if the iPad app calls your API (or redeploy after the server CORS update in this repo).

**Note:** Opening `App.app` from a Simulator zip in the iPad Files app will never install the app — that path is Mac Simulator only.

For local packaging only, copy [`electron-desktop-env/desktop.env.example`](../electron-desktop-env/desktop.env.example) to `electron-desktop-env/desktop.env` and set at least `DATABASE_URL` (see also [`scripts/ensure-desktop-env.mjs`](../scripts/ensure-desktop-env.mjs), which creates a stub if the file is missing).

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

- Tag with `v*` to trigger [`.github/workflows/desktop-release.yml`](../.github/workflows/desktop-release.yml).
- Workflow builds Windows, macOS, and **iPad/iOS** (Capacitor `.ipa`) and uploads installer artifacts.
- The **Publish GitHub Release** job needs `contents: write` on `GITHUB_TOKEN` (declared in the workflow). If releases still fail with 403, check **Settings → Actions → General → Workflow permissions** and choose **Read and write permissions**.
