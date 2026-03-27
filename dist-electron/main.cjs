"use strict";

// electron/main.ts
var import_electron = require("electron");
var import_fs = require("fs");
var import_path = require("path");
var import_child_process = require("child_process");
var appWindow = null;
var localServerProcess = null;
var DEFAULT_SERVER_PORT = 5e3;
var ELECTRON_RENDERER_URL = process.env.ELECTRON_RENDERER_URL;
var isDev = process.env.ELECTRON_IS_DEV === "1" || !!ELECTRON_RENDERER_URL;
function getServerEntryPath() {
  const localPath = (0, import_path.join)(process.cwd(), "dist", "index.js");
  const bundledPath = (0, import_path.join)(process.resourcesPath, "app.asar.unpacked", "dist", "index.js");
  return (0, import_fs.existsSync)(localPath) ? localPath : bundledPath;
}
function getPreloadPath() {
  const localPathCjs = (0, import_path.join)(process.cwd(), "dist-electron", "preload.cjs");
  const localPathJs = (0, import_path.join)(process.cwd(), "dist-electron", "preload.js");
  const bundledPathCjs = (0, import_path.join)(process.resourcesPath, "app.asar.unpacked", "dist-electron", "preload.cjs");
  const bundledPathJs = (0, import_path.join)(process.resourcesPath, "app.asar.unpacked", "dist-electron", "preload.js");
  if ((0, import_fs.existsSync)(localPathCjs)) return localPathCjs;
  if ((0, import_fs.existsSync)(localPathJs)) return localPathJs;
  if ((0, import_fs.existsSync)(bundledPathCjs)) return bundledPathCjs;
  return bundledPathJs;
}
function startLocalServer(port) {
  const serverEntry = getServerEntryPath();
  localServerProcess = (0, import_child_process.spawn)(process.execPath, [serverEntry], {
    env: {
      ...process.env,
      PORT: String(port),
      PICXEL_DESKTOP: "1",
      NODE_ENV: "production"
    },
    stdio: "inherit"
  });
}
async function waitForServerReady(port, timeoutMs = 1e4) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (res.ok) return true;
    } catch (_error) {
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  return false;
}
function createWindow(targetUrl) {
  appWindow = new import_electron.BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1e3,
    minHeight: 700,
    autoHideMenuBar: true,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
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
import_electron.app.whenReady().then(async () => {
  if (ELECTRON_RENDERER_URL) {
    createWindow(ELECTRON_RENDERER_URL);
    return;
  }
  const port = Number(process.env.PICXEL_DESKTOP_PORT || DEFAULT_SERVER_PORT);
  startLocalServer(port);
  await waitForServerReady(port);
  createWindow(`http://127.0.0.1:${port}`);
});
import_electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    import_electron.app.quit();
  }
});
import_electron.app.on("before-quit", () => {
  if (localServerProcess) {
    localServerProcess.kill();
  }
});
import_electron.app.on("activate", () => {
  if (import_electron.BrowserWindow.getAllWindows().length === 0) {
    const target = ELECTRON_RENDERER_URL ?? `http://127.0.0.1:${DEFAULT_SERVER_PORT}`;
    createWindow(target);
  }
});
import_electron.ipcMain.handle("app:get-runtime", () => ({
  isDesktop: true,
  isDev
}));
import_electron.ipcMain.handle("shell:open-external", (_event, url) => {
  import_electron.shell.openExternal(url);
});
