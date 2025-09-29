/// <reference types="vite/client" />

declare module 'virtual:pwa-register' {
  export interface RegisterSWOptions {
    immediate?: boolean;
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
  }

  export function registerSW(options?: RegisterSWOptions): {
    updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
  };
}

declare module '../wasm/SeaSightRouter.js' {
  const SeaSightRouterModule: any;
  export default SeaSightRouterModule;
}

declare module '*.worker.ts' {
  class WebWorker extends Worker {
    constructor();
  }

  export default WebWorker;
}
