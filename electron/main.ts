import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import { existsSync } from "fs";
import { join } from "path";
import { spawn, type ChildProcess } from "child_process";

let appWindow: BrowserWindow | null = null;
let localServerProcess: ChildProcess | null = null;

const DEFAULT_SERVER_PORT = 5000;
const ELECTRON_RENDERER_URL = process.env.ELECTRON_RENDERER_URL;
const isDev = process.env.ELECTRON_IS_DEV === "1" || !!ELECTRON_RENDERER_URL;

function resolveServerEntryPath(): string | null {
  const localPath = join(process.cwd(), "dist", "index.js");
  const bundledPath = join(process.resourcesPath, "app.asar.unpacked", "dist", "index.js");
  if (existsSync(localPath)) return localPath;
  if (existsSync(bundledPath)) return bundledPath;
  return null;
}

function getPreloadPath(): string {
  const localPathCjs = join(process.cwd(), "dist-electron", "preload.cjs");
  const localPathJs = join(process.cwd(), "dist-electron", "preload.js");
  const bundledPathCjs = join(process.resourcesPath, "app.asar.unpacked", "dist-electron", "preload.cjs");
  const bundledPathJs = join(process.resourcesPath, "app.asar.unpacked", "dist-electron", "preload.js");

  if (existsSync(localPathCjs)) return localPathCjs;
  if (existsSync(localPathJs)) return localPathJs;
  if (existsSync(bundledPathCjs)) return bundledPathCjs;
  return bundledPathJs;
}

function startLocalServer(port: number, serverEntry: string): void {
  localServerProcess = spawn(process.execPath, [serverEntry], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      PORT: String(port),
      FRACTIX_DESKTOP: "1",
      NODE_ENV: "production",
    },
    stdio: "inherit",
  });
}

async function waitForServerReady(port: number, timeoutMs = 30000): Promise<boolean> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (res.ok) return true;
    } catch (_error) {
      // Server might still be starting; retry.
    }

    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  return false;
}

function createWindow(targetUrl: string): void {
  appWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    autoHideMenuBar: true,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  appWindow.webContents.on("did-finish-load", () => {
    console.log(`[desktop] renderer loaded: ${targetUrl}`);
  });
  appWindow.webContents.on("did-fail-load", (_event, errorCode, errorDesc) => {
    console.error(`[desktop] renderer failed: ${errorCode} ${errorDesc} url=${targetUrl}`);
  });

  appWindow.loadURL(targetUrl);
  appWindow.on("closed", () => {
    appWindow = null;
  });
}

app.whenReady().then(async () => {
  if (ELECTRON_RENDERER_URL) {
    createWindow(ELECTRON_RENDERER_URL);
    return;
  }

  const serverEntry = resolveServerEntryPath();
  if (!serverEntry) {
    dialog.showErrorBox(
      "Picxel",
      "Could not find the production server build (dist/index.js). Run npm run build, then npm run build:electron, and start the desktop app again.",
    );
    app.quit();
    return;
  }

  const port = Number(process.env.FRACTIX_DESKTOP_PORT || DEFAULT_SERVER_PORT);
  startLocalServer(port, serverEntry);

  const ready = await waitForServerReady(port);
  if (!ready) {
    dialog.showErrorBox(
      "Picxel",
      `The embedded server did not become ready on port ${port}. Run npm run build to refresh dist/index.js, ensure nothing else is using that port, then try again.`,
    );
    app.quit();
    return;
  }

  createWindow(`http://127.0.0.1:${port}`);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (localServerProcess) {
    localServerProcess.kill();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    const target = ELECTRON_RENDERER_URL ?? `http://127.0.0.1:${DEFAULT_SERVER_PORT}`;
    createWindow(target);
  }
});

ipcMain.handle("app:get-runtime", () => ({
  isDesktop: true,
  isDev,
}));

ipcMain.handle("shell:open-external", (_event, url: string) => {
  shell.openExternal(url);
});
