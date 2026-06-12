import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useAuth } from "./AuthContext";
import {
  refreshCurrentPushTokenIfStale,
  registerCurrentPushToken,
} from "./pushNotificationTokens";

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const isMention = isMentionNotificationData(
      notification.request.content.data,
    );

    return {
      shouldShowBanner: isMention,
      shouldShowList: isMention,
      shouldPlaySound: isMention,
      shouldSetBadge: false,
    };
  },
});

function isMentionNotificationData(data: Record<string, unknown> | undefined) {
  return data?.isMention === true || data?.isMention === "true";
}

function isRuntimeShuttingDownError(error: unknown) {
  const message =
    error instanceof Error
      ? `${error.name} ${error.message}`
      : typeof error === "string"
        ? error
        : JSON.stringify(error);

  return message.includes("Runtime is shutting down");
}

function logNotificationError(label: string, error: unknown) {
  if (isRuntimeShuttingDownError(error)) return;

  console.log(label, error instanceof Error ? error.message : error);
}

export async function dismissNonMentionNotificationAsync(
  notification: Notifications.Notification,
) {
  if (isMentionNotificationData(notification.request.content.data)) return;

  try {
    await Notifications.dismissNotificationAsync(
      notification.request.identifier,
    );
  } catch (error) {
    console.log(
      "[notifications] notification dismissal failed:",
      error instanceof Error ? error.message : error,
    );
  }
}

export async function dismissNonMentionNotificationsAsync() {
  let notifications: Notifications.Notification[];

  try {
    notifications = await Notifications.getPresentedNotificationsAsync();
  } catch (error) {
    console.log(
      "[notifications] presented notification fetch failed:",
      error instanceof Error ? error.message : error,
    );
    return;
  }

  await Promise.all(
    notifications.map((notification) =>
      dismissNonMentionNotificationAsync(notification),
    ),
  );
}

export function PushNotificationRegistrar() {
  const { user, group } = useAuth();
  const userId = user?.id ?? null;
  const groupId = group?.id ?? null;
  const registeredKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userId || !groupId) {
      registeredKeyRef.current = null;
      return;
    }

    const registrationKey = `${userId}:${groupId}`;
    if (registeredKeyRef.current === registrationKey) return;
    registeredKeyRef.current = registrationKey;

    let isActive = true;

    registerCurrentPushToken()
      .then(() => {
        if (!isActive) return;
        registeredKeyRef.current = registrationKey;
      })
      .catch((error) => {
        if (!isActive) return;
        if (registeredKeyRef.current === registrationKey) {
          registeredKeyRef.current = null;
        }
        logNotificationError("[notifications] registration failed:", error);
      });

    return () => {
      isActive = false;
    };
  }, [groupId, userId]);

  useEffect(() => {
    if (!userId || !groupId) return;

    let isActive = true;

    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      const registrationKey = `${userId}:${groupId}`;
      const refresh =
        registeredKeyRef.current === registrationKey
          ? refreshCurrentPushTokenIfStale
          : registerCurrentPushToken;

      refresh()
        .then(() => {
          if (!isActive) return;
          registeredKeyRef.current = registrationKey;
        })
        .catch((error) => {
          if (!isActive) return;
          logNotificationError("[notifications] refresh failed:", error);
        });
    });

    const tokenSubscription = Notifications.addPushTokenListener(() => {
      const registrationKey = `${userId}:${groupId}`;
      registerCurrentPushToken()
        .then(() => {
          if (!isActive) return;
          registeredKeyRef.current = registrationKey;
        })
        .catch((error) => {
          if (!isActive) return;
          logNotificationError("[notifications] token refresh failed:", error);
        });
    });

    return () => {
      isActive = false;
      appStateSubscription.remove();
      tokenSubscription.remove();
    };
  }, [groupId, userId]);

  return null;
}

export function useNotificationRouting() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  useEffect(() => {
    const redirect = (notification: Notifications.Notification) => {
      const data = notification.request.content.data;
      const recipientUserId = data?.recipientUserId;
      if (typeof recipientUserId === "string" && recipientUserId !== userId) {
        return;
      }

      const url = data?.url;
      if (typeof url === "string") {
        router.push(url);
        return;
      }

      if (data?.tab === "social") {
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
  }, [userId]);
}
