import { useCallback, useEffect, useState } from "react";
import {
  APP_SETTINGS_EVENT,
  getAppSettings,
  updateAppSettings,
} from "./storage";
import type { AppSettings } from "./types";

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => getAppSettings());

  useEffect(() => {
    function sync(next?: AppSettings) {
      setSettings(next ?? getAppSettings());
    }

    function onStorage(event: StorageEvent) {
      if (event.key === "fractix-app-settings") sync();
    }

    function onCustom(event: Event) {
      const detail = (event as CustomEvent<AppSettings>).detail;
      sync(detail);
    }

    window.addEventListener("storage", onStorage);
    window.addEventListener(APP_SETTINGS_EVENT, onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(APP_SETTINGS_EVENT, onCustom);
    };
  }, []);

  const patchSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings(updateAppSettings(partial));
  }, []);

  return { settings, patchSettings };
}
