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

