"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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

// electron/preload.ts
var import_electron = require("electron");
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
  openExternal: (url) => import_electron.ipcRenderer.invoke("shell:open-external", url),
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
