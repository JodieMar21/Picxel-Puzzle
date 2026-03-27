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

// electron/preload.ts
var import_electron = __toESM(require_electron(), 1);
var SERVICE_NAME = "picxel-license";
var ACCOUNT_NAME = "entitlement";
async function getKeytar() {
  try {
    return await import("keytar");
  } catch (_error) {
    return null;
  }
}
var desktopApi = {
  getRuntime: async () => import_electron.ipcRenderer.invoke("app:get-runtime"),
  secureStore: {
    get: async () => {
      const keytar = await getKeytar();
      if (!keytar) return null;
      return keytar.default.getPassword(SERVICE_NAME, ACCOUNT_NAME);
    },
    set: async (value) => {
      const keytar = await getKeytar();
      if (!keytar) return;
      await keytar.default.setPassword(SERVICE_NAME, ACCOUNT_NAME, value);
    },
    clear: async () => {
      const keytar = await getKeytar();
      if (!keytar) return;
      await keytar.default.deletePassword(SERVICE_NAME, ACCOUNT_NAME);
    }
  }
};
import_electron.contextBridge.exposeInMainWorld("desktopApi", desktopApi);
