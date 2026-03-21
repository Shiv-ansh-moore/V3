// Reexport the native module. On web, it will be resolved to ScreenTimeLocksModule.web.ts
// and on native platforms to ScreenTimeLocksModule.ts
export { default } from './src/ScreenTimeLocksModule';
export { default as ScreenTimeLocksView } from './src/ScreenTimeLocksView';
export * from  './src/ScreenTimeLocks.types';
