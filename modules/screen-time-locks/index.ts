import { requireNativeModule } from 'expo';

const ScreenTimeLocks = requireNativeModule('ScreenTimeLocks')

export async function requestAuthorization(): Promise<string> {
  return await ScreenTimeLocks.requestAuthorization();
}
