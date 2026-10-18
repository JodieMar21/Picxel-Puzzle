import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import { autoUpdater } from "electron-updater";
import { config as loadEnvFile } from "dotenv";
import { existsSync } from "fs";
import { delimiter, dirname, join } from "path";
import { spawn, type ChildProcess } from "child_process";

let appWindow: BrowserWindow | null = null;
let localServerProcess: ChildProcess | null = null;

function setupAutoUpdater(): void {
  if (isDev || !app.isPackaged) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("update-available", (info) => {
    console.log(`[desktop] update available: ${info.version}`);
    appWindow?.webContents.send("updater:event", {
      type: "available",
      version: info.version,
    });
  });

  autoUpdater.on("update-not-available", () => {
    appWindow?.webContents.send("updater:event", { type: "not-available" });
  });

  autoUpdater.on("update-downloaded", (info) => {
    console.log(`[desktop] update downloaded: ${info.version}`);
    appWindow?.webContents.send("updater:event", {
      type: "downloaded",
      version: info.version,
    });
    dialog
      .showMessageBox({
        type: "info",
        title: "Update ready",
        message: `Fractix ${info.version} is ready to install.`,
        detail: "The app will restart to apply the update.",
        buttons: ["Restart now", "Later"],
        defaultId: 0,
        cancelId: 1,
      })
      .then(({ response }) => {
        if (response === 0) autoUpdater.quitAndInstall();
      })
      .catch(() => undefined);
  });

  autoUpdater.on("error", (error) => {
    console.error("[desktop] updater error:", error);
    appWindow?.webContents.send("updater:event", {
      type: "error",
      message: error instanceof Error ? error.message : String(error),
    });
  });

  // Delay so the window can load first
  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify().catch((error) => {
      console.error("[desktop] checkForUpdates failed:", error);
    });
  }, 8000);
}

const DEFAULT_SERVER_PORT = 5000;
const ELECTRON_RENDERER_URL = process.env.ELECTRON_RENDERER_URL;
const isDev = process.env.ELECTRON_IS_DEV === "1" || !!ELECTRON_RENDERER_URL;

function resolveServerEntryPath(): string | null {
  const localCjs = join(process.cwd(), "dist", "index.cjs");
  const localJs = join(process.cwd(), "dist", "index.js");
  const bundledCjs = join(process.resourcesPath, "app.asar.unpacked", "dist", "index.cjs");
  const bundledJs = join(process.resourcesPath, "app.asar.unpacked", "dist", "index.js");
  if (existsSync(localCjs)) return localCjs;
  if (existsSync(bundledCjs)) return bundledCjs;
  if (existsSync(localJs)) return localJs;
  if (existsSync(bundledJs)) return bundledJs;
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

function loadPackagedDesktopEnv(): void {
  const desktopEnvPath = join(process.resourcesPath, "desktop.env");
  if (existsSync(desktopEnvPath)) {
    loadEnvFile({ path: desktopEnvPath });
  }
}

function startLocalServer(port: number, serverEntry: string): ChildProcess {
  const serverRoot = dirname(dirname(serverEntry));
  const uploadDir = join(app.getPath("userData"), "uploads");
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    ELECTRON_RUN_AS_NODE: "1",
    PORT: String(port),
    FRACTIX_DESKTOP: "1",
    FRACTIX_UPLOAD_DIR: uploadDir,
    NODE_ENV: "production",
  };

  // Hoisted deps (e.g. detect-libc for sharp) live under app.asar/node_modules while sharp is
  // unpacked under app.asar.unpacked; NODE_PATH lets the embedded server resolve them.
  if (serverEntry.includes("app.asar.unpacked")) {
    const asarNodeModules = join(process.resourcesPath, "app.asar", "node_modules");
    const unpackedNodeModules = join(process.resourcesPath, "app.asar.unpacked", "node_modules");
    const segments: string[] = [];
    if (existsSync(asarNodeModules)) segments.push(asarNodeModules);
    if (existsSync(unpackedNodeModules)) segments.push(unpackedNodeModules);
    if (segments.length > 0) {
      const prefix = segments.join(delimiter);
      env.NODE_PATH = process.env.NODE_PATH
        ? `${prefix}${delimiter}${process.env.NODE_PATH}`
        : prefix;
    }
  }

  return spawn(process.execPath, [serverEntry], {
    cwd: serverRoot,
    env,
    stdio: ["ignore", "pipe", "pipe"],
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

  loadPackagedDesktopEnv();

  const serverEntry = resolveServerEntryPath();
  if (!serverEntry) {
    dialog.showErrorBox(
      "Fractix",
      "Could not find the production server build (dist/index.cjs). Run npm run build, then npm run build:electron, and start the desktop app again.",
    );
    app.quit();
    return;
  }

  const port = Number(process.env.FRACTIX_DESKTOP_PORT || DEFAULT_SERVER_PORT);
  localServerProcess = startLocalServer(port, serverEntry);

  let serverLog = "";
  const appendLog = (chunk: Buffer) => {
    serverLog = (serverLog + chunk.toString()).slice(-4000);
  };
  localServerProcess.stdout?.on("data", appendLog);
  localServerProcess.stderr?.on("data", appendLog);
  localServerProcess.on("exit", (code, signal) => {
    if (code != null && code !== 0) {
      console.error(`[desktop] embedded server exited code=${code}`);
    }
    if (signal) {
      console.error(`[desktop] embedded server killed signal=${signal}`);
    }
  });

  const ready = await waitForServerReady(port);
  if (!ready) {
    const hint =
      serverLog.trim().length > 0 ? `\n\nLast server output:\n${serverLog.trim()}` : "";
    dialog.showErrorBox(
      "Fractix",
      `The embedded server did not become ready on port ${port}. Ensure DATABASE_URL is set (e.g. via desktop.env from your build, or system environment), nothing else is using that port, and try again.${hint}`,
    );
    app.quit();
    return;
  }

  createWindow(`http://127.0.0.1:${port}`);
  setupAutoUpdater();
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

ipcMain.handle("updater:check", async () => {
  if (isDev || !app.isPackaged) {
    return { ok: false, message: "Updates are only available in packaged desktop builds." };
  }
  try {
    const result = await autoUpdater.checkForUpdates();
    return {
      ok: true,
      version: result?.updateInfo?.version ?? null,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
});

ipcMain.handle("updater:install", () => {
  if (isDev || !app.isPackaged) return false;
  autoUpdater.quitAndInstall();
  return true;
});
