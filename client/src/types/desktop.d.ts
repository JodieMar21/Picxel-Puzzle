export {};

declare global {
  interface Window {
    desktopApi?: {
      getRuntime: () => Promise<{ isDesktop: boolean; isDev: boolean }>;
      openExternal: (url: string) => Promise<void>;
      secureStore: {
        get: () => Promise<string | null>;
        set: (value: string) => Promise<void>;
        clear: () => Promise<void>;
      };
    };
  }
}
