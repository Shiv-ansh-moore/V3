import { NativeModule, requireNativeModule } from 'expo';

import { ScreenTimeLocksModuleEvents } from './ScreenTimeLocks.types';

declare class ScreenTimeLocksModule extends NativeModule<ScreenTimeLocksModuleEvents> {
  PI: number;
  hello(): string;
  setValueAsync(value: string): Promise<void>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<ScreenTimeLocksModule>('ScreenTimeLocks');
