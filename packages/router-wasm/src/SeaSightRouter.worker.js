// Worker-compatible wrapper for SeaSightRouter WASM module
import SeaSightRouterModule from './SeaSightRouter.js';

// Create a worker-compatible version that handles the async initialization
let moduleInstance = null;
let isInitializing = false;

export function createSeaSightRouterWorker() {
  return {
    async initialize() {
      if (moduleInstance) {
        return moduleInstance;
      }
      
      if (isInitializing) {
        // Wait for ongoing initialization
        while (isInitializing) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        return moduleInstance;
      }
      
      isInitializing = true;
      try {
        moduleInstance = await SeaSightRouterModule();
        return moduleInstance;
      } finally {
        isInitializing = false;
      }
    },
    
    async getModule() {
      if (!moduleInstance) {
        await this.initialize();
      }
      return moduleInstance;
    }
  };
}

// Also export the direct module for non-worker usage
export { SeaSightRouterModule };
