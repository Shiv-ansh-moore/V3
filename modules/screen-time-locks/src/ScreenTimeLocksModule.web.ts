import { registerWebModule, NativeModule } from 'expo';

import { ChangeEventPayload } from './ScreenTimeLocks.types';

type ScreenTimeLocksModuleEvents = {
  onChange: (params: ChangeEventPayload) => void;
}

class ScreenTimeLocksModule extends NativeModule<ScreenTimeLocksModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
};

export default registerWebModule(ScreenTimeLocksModule, 'ScreenTimeLocksModule');
