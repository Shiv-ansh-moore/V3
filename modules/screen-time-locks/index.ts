import { requireNativeModule } from 'expo';
import { Platform } from 'react-native';

const ScreenTimeLocks = requireNativeModule('ScreenTimeLocks')

export interface AndroidAppInfo {
  name: string;
  packageName: string;
}

export async function requestAuthorization(): Promise<string> {
  if (Platform.OS !== 'ios') {
    return 'not_supported';
  }

  return await ScreenTimeLocks.requestAuthorization();
}
export async function showAppPicker(): Promise<{ selectedApps: number }> {
  return await ScreenTimeLocks.showAppPicker();
}

export async function getInstalledApps(): Promise<AndroidAppInfo[]> {
  if (Platform.OS !== 'android') {
    return [];
  }

  return await ScreenTimeLocks.getInstalledApps();
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

export interface ScreenTimeDiagnostics {
  available: boolean;
  authorizationStatus: string;
  hasAppGroupDefaults?: boolean;
  savedApplicationTokens?: number;
  savedCategoryTokens?: number;
  savedWebDomainTokens?: number;
  unlockEndTime?: number;
  unlockStartTime?: number;
  unlockTotalDuration?: number;
  now?: number;
}

export function getScreenTimeDiagnostics(): ScreenTimeDiagnostics {
  if (Platform.OS !== 'ios') {
    return {
      available: false,
      authorizationStatus: 'not_supported',
    };
  }

  return ScreenTimeLocks.getDiagnostics();
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
