import { requireNativeModule } from 'expo';

const ScreenTimeLocks = requireNativeModule('ScreenTimeLocks')

export async function requestAuthorization(): Promise<string> {
  return await ScreenTimeLocks.requestAuthorization();
}
export async function showAppPicker(): Promise<{ selectedApps: number }> {
  return await ScreenTimeLocks.showAppPicker();
}
export async function blockApps(packageNames: string[]): Promise<{ blocked: number }> {
  return await ScreenTimeLocks.blockApps(packageNames);
}

export async function unblockApps(): Promise<string> {
  return await ScreenTimeLocks.unblockApps();
}

export async function addBlockedApp(packageName: string): Promise<void> {
  return await ScreenTimeLocks.addBlockedApp(packageName);
}

export async function removeBlockedApp(packageName: string): Promise<void> {
  return await ScreenTimeLocks.removeBlockedApp(packageName);
}

export async function getBlockedApps(): Promise<string[]> {
  return await ScreenTimeLocks.getBlockedApps();
}

export async function manageBlockedApps(): Promise<{ blocked?: number; cancelled?: boolean }> {
  return await ScreenTimeLocks.manageBlockedApps();
}

export async function unlockForDuration(minutes: number, reason: string): Promise<string> {
  return await ScreenTimeLocks.unlockForDuration(minutes, reason);
}
export async function relockNow(): Promise<string> {
  return await ScreenTimeLocks.relockNow();
}

export interface ActiveUnlock {
  endTime: number;
  startTime: number;
  totalDuration: number;
  reason: string;
}

export function getActiveUnlock(): ActiveUnlock | null {
  return ScreenTimeLocks.getActiveUnlock();
}
