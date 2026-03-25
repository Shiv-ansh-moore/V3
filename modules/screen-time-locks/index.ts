import { requireNativeModule } from 'expo';

const ScreenTimeLocks = requireNativeModule('ScreenTimeLocks')

export async function requestAuthorization(): Promise<string> {
  return await ScreenTimeLocks.requestAuthorization();
}
export async function showAppPicker(): Promise<{ selectedApps: number }> {
  return await ScreenTimeLocks.showAppPicker();
}
export async function blockApps(): Promise<{ blocked: number }> {
  return await ScreenTimeLocks.blockApps();
}

export async function unblockApps(): Promise<string> {
  return await ScreenTimeLocks.unblockApps();
}
