import { app, BrowserWindow, ipcMain } from "electron";
import { existsSync } from "fs";
import { join } from "path";
import { spawn, type ChildProcess } from "child_process";

let appWindow: BrowserWindow | null = null;
let localServerProcess: ChildProcess | null = null;

const DEFAULT_SERVER_PORT = 5000;
const ELECTRON_RENDERER_URL = process.env.ELECTRON_RENDERER_URL;
const isDev = process.env.ELECTRON_IS_DEV === "1" || !!ELECTRON_RENDERER_URL;

function getServerEntryPath(): string {
  const localPath = join(process.cwd(), "dist", "index.js");
  const bundledPath = join(process.resourcesPath, "app.asar.unpacked", "dist", "index.js");
  return existsSync(localPath) ? localPath : bundledPath;
}

function getPreloadPath(): string {
  const localPath = join(process.cwd(), "dist-electron", "preload.js");
  const bundledPath = join(process.resourcesPath, "app.asar.unpacked", "dist-electron", "preload.js");
  return existsSync(localPath) ? localPath : bundledPath;
}

function startLocalServer(port: number): void {
  const serverEntry = getServerEntryPath();
  localServerProcess = spawn(process.execPath, [serverEntry], {
    env: {
      ...process.env,
      PORT: String(port),
      PICXEL_DESKTOP: "1",
      NODE_ENV: "production",
    },
    stdio: "inherit",
  });
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

  appWindow.loadURL(targetUrl);
  appWindow.on("closed", () => {
    appWindow = null;
  });
}

app.whenReady().then(() => {
  if (ELECTRON_RENDERER_URL) {
    createWindow(ELECTRON_RENDERER_URL);
    return;
  }

  const port = Number(process.env.PICXEL_DESKTOP_PORT || DEFAULT_SERVER_PORT);
  startLocalServer(port);
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
