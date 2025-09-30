// TypeScript definitions for SeaSightRouter worker module
import type { SeaSightRouterModule } from './SeaSightRouter';

export interface SeaSightRouterWorker {
  initialize(): Promise<SeaSightRouterModule>;
  getModule(): Promise<SeaSightRouterModule>;
}

export function createSeaSightRouterWorker(): SeaSightRouterWorker;
export { SeaSightRouterModule };
