import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { supabase } from "./supabase";

const DEVICE_ID_KEY = "v3.pushNotifications.deviceId";
const LAST_EXPO_PUSH_TOKEN_KEY = "v3.pushNotifications.lastExpoPushToken";
const LAST_REGISTRATION_AT_KEY = "v3.pushNotifications.lastRegistrationAt";
const REGISTRATION_REFRESH_MS = 24 * 60 * 60 * 1000;

type PushRegistration = {
  deviceId: string;
  expoPushToken: string;
};

export async function registerCurrentPushToken(): Promise<boolean> {
  const registration = await getPushRegistration();
  if (!registration) return false;

  const { error } = await supabase.rpc("register_push_token", {
    p_device_id: registration.deviceId,
    p_expo_push_token: registration.expoPushToken,
    p_platform: Platform.OS,
    p_app_version: Constants.expoConfig?.version ?? null,
  });

  if (error) throw error;

  await AsyncStorage.multiSet([
    [LAST_EXPO_PUSH_TOKEN_KEY, registration.expoPushToken],
    [LAST_REGISTRATION_AT_KEY, String(Date.now())],
  ]);
  return true;
}

export async function refreshCurrentPushTokenIfStale(): Promise<boolean> {
  const lastRegistrationAt = await AsyncStorage.getItem(
    LAST_REGISTRATION_AT_KEY,
  );
  const lastRegistrationTime = lastRegistrationAt
    ? Number(lastRegistrationAt)
    : 0;

  if (
    Number.isFinite(lastRegistrationTime) &&
    Date.now() - lastRegistrationTime < REGISTRATION_REFRESH_MS
  ) {
    return true;
  }

  return registerCurrentPushToken();
}

export async function unregisterCurrentPushToken(): Promise<number> {
  if (Platform.OS === "web") return 0;

  const [deviceId, expoPushToken] = await Promise.all([
    AsyncStorage.getItem(DEVICE_ID_KEY),
    AsyncStorage.getItem(LAST_EXPO_PUSH_TOKEN_KEY),
  ]);

  if (!deviceId && !expoPushToken) return 0;

  const { data, error } = await supabase.rpc("unregister_push_token", {
    p_device_id: deviceId,
    p_expo_push_token: expoPushToken,
  });

  if (error) throw error;

  await AsyncStorage.removeItem(LAST_REGISTRATION_AT_KEY);
  return data ?? 0;
}

async function getPushRegistration(): Promise<PushRegistration | null> {
  if (Platform.OS === "web") return null;
  if (!Device.isDevice) {
    console.log("[notifications] physical device required for push tokens");
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("social", {
      name: "Social",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF6A00",
      showBadge: false,
    });
  }

  const existingPermission = await Notifications.getPermissionsAsync();
  let finalStatus = existingPermission.status;

  if (existingPermission.status !== "granted") {
    const requestedPermission = await Notifications.requestPermissionsAsync();
    finalStatus = requestedPermission.status;
  }

  if (finalStatus !== "granted") {
    console.log("[notifications] permission not granted");
    return null;
  }

  const projectId = getExpoProjectId();
  if (!projectId) {
    console.log("[notifications] missing Expo project id");
    return null;
  }

  const [deviceId, token] = await Promise.all([
    getOrCreateDeviceId(),
    Notifications.getExpoPushTokenAsync({ projectId }),
  ]);

  return {
    deviceId,
    expoPushToken: token.data,
  };
}

async function getOrCreateDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;

  const generated = `${Platform.OS}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 12)}`;
  await AsyncStorage.setItem(DEVICE_ID_KEY, generated);
  return generated;
}

function getExpoProjectId(): string | null {
  const expoConfigExtra = Constants.expoConfig?.extra as
    | { eas?: { projectId?: string } }
    | undefined;

  return (
    Constants.easConfig?.projectId ??
    expoConfigExtra?.eas?.projectId ??
    null
  );
}
