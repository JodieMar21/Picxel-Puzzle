"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/electron/index.js
var require_electron = __commonJS({
  "node_modules/electron/index.js"(exports2, module2) {
    var fs = require("fs");
    var path = require("path");
    var pathFile = path.join(__dirname, "path.txt");
    function getElectronPath() {
      let executablePath;
      if (fs.existsSync(pathFile)) {
        executablePath = fs.readFileSync(pathFile, "utf-8");
      }
      if (process.env.ELECTRON_OVERRIDE_DIST_PATH) {
        return path.join(process.env.ELECTRON_OVERRIDE_DIST_PATH, executablePath || "electron");
      }
      if (executablePath) {
        return path.join(__dirname, "dist", executablePath);
      } else {
        throw new Error("Electron failed to install correctly, please delete node_modules/electron and try installing again");
      }
    }
    module2.exports = getElectronPath();
  }
});

// electron/main.ts
var import_electron = __toESM(require_electron(), 1);
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
  const localPath = (0, import_path.join)(process.cwd(), "dist-electron", "preload.js");
  const bundledPath = (0, import_path.join)(process.resourcesPath, "app.asar.unpacked", "dist-electron", "preload.js");
  return (0, import_fs.existsSync)(localPath) ? localPath : bundledPath;
}
function startLocalServer(port) {
  const serverEntry = getServerEntryPath();
  localServerProcess = (0, import_child_process.spawn)(process.execPath, [serverEntry], {
    env: {
      ...process.env,
      PORT: String(port),
      FRACTIX_DESKTOP: "1",
      NODE_ENV: "production"
    },
    stdio: "inherit"
  });
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
  appWindow.loadURL(targetUrl);
  appWindow.on("closed", () => {
    appWindow = null;
  });
}
import_electron.app.whenReady().then(() => {
  if (ELECTRON_RENDERER_URL) {
    createWindow(ELECTRON_RENDERER_URL);
    return;
  }
  const port = Number(process.env.FRACTIX_DESKTOP_PORT || DEFAULT_SERVER_PORT);
  startLocalServer(port);
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
