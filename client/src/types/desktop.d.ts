export {};

declare global {
  interface Window {
    desktopApi?: {
      getRuntime: () => Promise<{ isDesktop: boolean; isDev: boolean }>;
      openExternal: (url: string) => Promise<void>;
      checkForUpdates?: () => Promise<{
        ok: boolean;
        version?: string | null;
        message?: string;
      }>;
      installUpdate?: () => Promise<boolean>;
      onUpdaterEvent?: (
        handler: (event: { type: string; version?: string; message?: string }) => void,
      ) => () => void;
      secureStore: {
        get: () => Promise<string | null>;
        set: (value: string) => Promise<void>;
        clear: () => Promise<void>;
      };
    };
  }
}
