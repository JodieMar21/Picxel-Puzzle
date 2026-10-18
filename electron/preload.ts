import { contextBridge, ipcRenderer } from "electron";

const SERVICE_NAME = "fractix-license";
const ACCOUNT_NAME = "entitlement";

type RuntimeInfo = {
  isDesktop: boolean;
  isDev: boolean;
};

async function getKeytar() {
  try {
    return await import("keytar");
  } catch (_error) {
    return null;
  }
}

const desktopApi = {
  getRuntime: async (): Promise<RuntimeInfo> => ipcRenderer.invoke("app:get-runtime"),
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke("shell:open-external", url),
  checkForUpdates: (): Promise<{ ok: boolean; version?: string | null; message?: string }> =>
    ipcRenderer.invoke("updater:check"),
  installUpdate: (): Promise<boolean> => ipcRenderer.invoke("updater:install"),
  onUpdaterEvent: (handler: (event: { type: string; version?: string; message?: string }) => void) => {
    const listener = (_: unknown, payload: { type: string; version?: string; message?: string }) =>
      handler(payload);
    ipcRenderer.on("updater:event", listener);
    return () => {
      ipcRenderer.removeListener("updater:event", listener);
    };
  },
  secureStore: {
    get: async (): Promise<string | null> => {
      const keytar = await getKeytar();
      if (!keytar) return null;
      return keytar.default.getPassword(SERVICE_NAME, ACCOUNT_NAME);
    },
    set: async (value: string): Promise<void> => {
      const keytar = await getKeytar();
      if (!keytar) return;
      await keytar.default.setPassword(SERVICE_NAME, ACCOUNT_NAME, value);
    },
    clear: async (): Promise<void> => {
      const keytar = await getKeytar();
      if (!keytar) return;
      await keytar.default.deletePassword(SERVICE_NAME, ACCOUNT_NAME);
    },
  },
};

contextBridge.exposeInMainWorld("desktopApi", desktopApi);
