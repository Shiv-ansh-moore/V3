import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { supabase } from "./supabase";
import { useAuth } from "./AuthContext";

const DEVICE_ID_KEY = "v3.pushNotifications.deviceId";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export function PushNotificationRegistrar() {
  const { user, group } = useAuth();
  const registeredKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user || !group) {
      registeredKeyRef.current = null;
      return;
    }

    const registrationKey = `${user.id}:${group.id}`;
    if (registeredKeyRef.current === registrationKey) return;
    registeredKeyRef.current = registrationKey;

    let cancelled = false;

    registerForPushNotifications()
      .then(async (registration) => {
        if (cancelled || !registration) return;

        const { error } = await supabase.rpc("register_push_token", {
          p_device_id: registration.deviceId,
          p_expo_push_token: registration.expoPushToken,
          p_platform: Platform.OS,
          p_app_version: Constants.expoConfig?.version ?? null,
        });

        if (error) {
          console.log("[notifications] token registration error:", error.message);
        }
      })
      .catch((error) => {
        console.log(
          "[notifications] registration failed:",
          error instanceof Error ? error.message : error,
        );
      });

    return () => {
      cancelled = true;
    };
  }, [group, user]);

  return null;
}

export function useNotificationRouting() {
  useEffect(() => {
    const redirect = (notification: Notifications.Notification) => {
      const url = notification.request.content.data?.url;
      if (typeof url === "string") {
        router.push(url);
        return;
      }

      if (notification.request.content.data?.tab === "social") {
        router.push("/(app)?tab=social");
      }
    };

    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse?.notification) {
      redirect(lastResponse.notification);
      Notifications.clearLastNotificationResponse();
    }

    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        redirect(response.notification);
        Notifications.clearLastNotificationResponse();
      },
    );

    return () => {
      subscription.remove();
    };
  }, []);
}

async function registerForPushNotifications(): Promise<{
  deviceId: string;
  expoPushToken: string;
} | null> {
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
