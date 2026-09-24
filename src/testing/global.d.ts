import type { GameTestBridge, ResourceCounters } from './bridge';
declare global { interface Window { __gameTest?: GameTestBridge; __lastGameResources?: ResourceCounters } }
export { };