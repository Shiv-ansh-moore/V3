import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useAuth } from "./AuthContext";
import { coerceMessageMentions } from "./mentions";
import {
  registerDevicePushToken,
  refreshCurrentPushTokenIfStale,
  registerCurrentPushToken,
} from "./pushNotificationTokens";
import { supabase } from "./supabase";

export type NotificationMentionContext = {
  currentUserId?: string | null;
  currentUsername?: string | null;
};

type MentionSignal = "mention" | "not-mention" | "unknown";

const MENTION_FIELD_NAMES = new Set(["ismention"]);
const MENTION_LIST_FIELD_NAMES = new Set([
  "mentionentities",
  "mentionedrecipientids",
  "mentionedusers",
  "mentions",
]);
const MESSAGE_ID_FIELD_NAMES = new Set(["messageid"]);
const NOTIFICATION_TYPE_FIELD_NAMES = new Set(["type", "eventtype"]);
const TEXT_FIELD_NAMES = new Set([
  "alert",
  "body",
  "message",
  "subtitle",
  "text",
  "title",
]);
const messageMentionLookupCache = new Map<string, Promise<boolean | null>>();

let currentNotificationMentionContext: NotificationMentionContext = {};

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const isMention =
      getLocalMentionNotificationSignal(
        notification,
        currentNotificationMentionContext,
      ) === "mention";

    return {
      shouldShowBanner: isMention,
      shouldShowList: isMention,
      shouldPlaySound: isMention,
      shouldSetBadge: false,
    };
  },
});

function setCurrentNotificationMentionContext(
  context: NotificationMentionContext,
) {
  currentNotificationMentionContext = context;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function parseNotificationJsonString(value: unknown): unknown {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function normalizeFieldName(value: string) {
  return value.replace(/[_-]/g, "").toLowerCase();
}

function normalizeUsername(value: string | null | undefined) {
  const username = value?.trim();
  return username ? username : null;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function textMentionsUsername(text: string, username: string | null) {
  if (!username) return false;

  const pattern = new RegExp(
    `(^|[^A-Za-z0-9_])@${escapeRegExp(username)}($|[^A-Za-z0-9_])`,
    "i",
  );
  return pattern.test(text);
}

function textHasAtMention(text: string) {
  return /(^|[^A-Za-z0-9_])@[A-Za-z0-9_]+/.test(text);
}

function textMentionsCurrentUser(
  text: string,
  context: NotificationMentionContext,
) {
  if (/\bmentioned\s+you\b/i.test(text)) return true;
  return textMentionsUsername(text, normalizeUsername(context.currentUsername));
}

function notificationPayloadCandidates(
  notification: Notifications.Notification,
): unknown[] {
  const content = notification.request.content;
  const data = content.data;

  return [
    content,
    data,
    parseNotificationJsonString(data?.body),
    parseNotificationJsonString(data?.message),
  ];
}

function mentionFieldSignal(value: unknown): MentionSignal {
  if (value === true) return "mention";
  if (value === false) return "not-mention";

  if (typeof value === "number") {
    if (value === 1) return "mention";
    if (value === 0) return "not-mention";
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes"].includes(normalized)) return "mention";
    if (["0", "false", "no"].includes(normalized)) return "not-mention";
  }

  return "unknown";
}

function mentionSignalFromValue(
  value: unknown,
  depth = 0,
  seen = new Set<object>(),
): MentionSignal {
  if (depth > 5 || value == null) return "unknown";

  const parsed = parseNotificationJsonString(value);
  if (parsed != null) {
    return mentionSignalFromValue(parsed, depth + 1, seen);
  }

  if (Array.isArray(value)) {
    let foundNotMention = false;

    for (const item of value) {
      const signal = mentionSignalFromValue(item, depth + 1, seen);
      if (signal === "mention") return "mention";
      if (signal === "not-mention") foundNotMention = true;
    }

    return foundNotMention ? "not-mention" : "unknown";
  }

  if (!isObjectRecord(value)) return "unknown";
  if (seen.has(value)) return "unknown";
  seen.add(value);

  let foundNotMention = false;
  for (const [key, item] of Object.entries(value)) {
    if (MENTION_FIELD_NAMES.has(normalizeFieldName(key))) {
      const signal = mentionFieldSignal(item);
      if (signal === "mention") return "mention";
      if (signal === "not-mention") foundNotMention = true;
    }

    const signal = mentionSignalFromValue(item, depth + 1, seen);
    if (signal === "mention") return "mention";
    if (signal === "not-mention") foundNotMention = true;
  }

  return foundNotMention ? "not-mention" : "unknown";
}

function valueContainsUserId(
  value: unknown,
  userId: string,
  depth = 0,
  seen = new Set<object>(),
): boolean {
  if (depth > 5 || value == null) return false;
  if (typeof value === "string") return value === userId;

  const parsed = parseNotificationJsonString(value);
  if (parsed != null) return valueContainsUserId(parsed, userId, depth + 1, seen);

  if (Array.isArray(value)) {
    return value.some((item) =>
      valueContainsUserId(item, userId, depth + 1, seen),
    );
  }

  if (!isObjectRecord(value)) return false;
  if (seen.has(value)) return false;
  seen.add(value);

  return Object.values(value).some((item) =>
    valueContainsUserId(item, userId, depth + 1, seen),
  );
}

function payloadMentionsCurrentUser(
  value: unknown,
  userId: string | null | undefined,
  depth = 0,
  seen = new Set<object>(),
): boolean {
  if (!userId || depth > 5 || value == null) return false;

  const parsed = parseNotificationJsonString(value);
  if (parsed != null) {
    return payloadMentionsCurrentUser(parsed, userId, depth + 1, seen);
  }

  if (Array.isArray(value)) {
    return value.some((item) =>
      payloadMentionsCurrentUser(item, userId, depth + 1, seen),
    );
  }

  if (!isObjectRecord(value)) return false;
  if (seen.has(value)) return false;
  seen.add(value);

  for (const [key, item] of Object.entries(value)) {
    const normalizedKey = normalizeFieldName(key);
    if (
      MENTION_LIST_FIELD_NAMES.has(normalizedKey) &&
      valueContainsUserId(item, userId)
    ) {
      return true;
    }

    if (payloadMentionsCurrentUser(item, userId, depth + 1, seen)) return true;
  }

  return false;
}

function collectTextValues(
  value: unknown,
  texts: string[],
  depth = 0,
  seen = new Set<object>(),
) {
  if (depth > 5 || value == null) return;

  const parsed = parseNotificationJsonString(value);
  if (parsed != null) {
    collectTextValues(parsed, texts, depth + 1, seen);
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectTextValues(item, texts, depth + 1, seen));
    return;
  }

  if (!isObjectRecord(value)) return;
  if (seen.has(value)) return;
  seen.add(value);

  for (const [key, item] of Object.entries(value)) {
    if (
      TEXT_FIELD_NAMES.has(normalizeFieldName(key)) &&
      typeof item === "string"
    ) {
      texts.push(item);
    }

    collectTextValues(item, texts, depth + 1, seen);
  }
}

function notificationTextValues(notification: Notifications.Notification) {
  const content = notification.request.content;
  const texts = [content.title, content.subtitle, content.body].filter(
    (value): value is string => typeof value === "string",
  );

  for (const candidate of notificationPayloadCandidates(notification)) {
    collectTextValues(candidate, texts);
  }

  return texts;
}

function findStringField(
  value: unknown,
  fieldNames: Set<string>,
  depth = 0,
  seen = new Set<object>(),
): string | null {
  if (depth > 5 || value == null) return null;

  const parsed = parseNotificationJsonString(value);
  if (parsed != null) return findStringField(parsed, fieldNames, depth + 1, seen);

  if (Array.isArray(value)) {
    for (const item of value) {
      const result = findStringField(item, fieldNames, depth + 1, seen);
      if (result) return result;
    }

    return null;
  }

  if (!isObjectRecord(value)) return null;
  if (seen.has(value)) return null;
  seen.add(value);

  for (const [key, item] of Object.entries(value)) {
    if (fieldNames.has(normalizeFieldName(key)) && typeof item === "string") {
      return item;
    }

    const result = findStringField(item, fieldNames, depth + 1, seen);
    if (result) return result;
  }

  return null;
}

function notificationStringField(
  notification: Notifications.Notification,
  fieldNames: Set<string>,
) {
  for (const candidate of notificationPayloadCandidates(notification)) {
    const value = findStringField(candidate, fieldNames);
    if (value) return value;
  }

  return null;
}

function getLocalMentionNotificationSignal(
  notification: Notifications.Notification,
  context: NotificationMentionContext,
): MentionSignal {
  const texts = notificationTextValues(notification);
  if (texts.some((text) => textMentionsCurrentUser(text, context))) {
    return "mention";
  }

  for (const candidate of notificationPayloadCandidates(notification)) {
    if (payloadMentionsCurrentUser(candidate, context.currentUserId)) {
      return "mention";
    }
  }

  let foundNotMention = false;
  for (const candidate of notificationPayloadCandidates(notification)) {
    const signal = mentionSignalFromValue(candidate);
    if (signal === "mention") return "mention";
    if (signal === "not-mention") foundNotMention = true;
  }

  return foundNotMention ? "not-mention" : "unknown";
}

async function messageMentionsCurrentUserAsync(
  messageId: string,
  userId: string,
) {
  const cacheKey = `${messageId}:${userId}`;
  let lookup = messageMentionLookupCache.get(cacheKey);

  if (!lookup) {
    lookup = (async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("mention_entities")
        .eq("id", messageId)
        .maybeSingle();

      if (error) {
        console.log("[notifications] mention lookup failed:", error.message);
        return null;
      }

      return coerceMessageMentions(data?.mention_entities).some(
        (mention) => mention.user_id === userId,
      );
    })();

    messageMentionLookupCache.set(cacheKey, lookup);
  }

  return lookup;
}

async function shouldPreserveMentionNotificationAsync(
  notification: Notifications.Notification,
  context: NotificationMentionContext,
) {
  const localSignal = getLocalMentionNotificationSignal(notification, context);
  if (localSignal === "mention") return true;

  const notificationType = notificationStringField(
    notification,
    NOTIFICATION_TYPE_FIELD_NAMES,
  )?.toLowerCase();
  if (
    notificationType &&
    notificationType !== "message" &&
    notificationType !== "social_message"
  ) {
    return false;
  }

  const messageId = notificationStringField(
    notification,
    MESSAGE_ID_FIELD_NAMES,
  );
  if (messageId && context.currentUserId) {
    const messageMentionsUser = await messageMentionsCurrentUserAsync(
      messageId,
      context.currentUserId,
    );

    if (messageMentionsUser !== null) return messageMentionsUser;
    if (localSignal === "not-mention") return false;
    return true;
  }

  if (localSignal === "not-mention") return false;

  return notificationTextValues(notification).some(textHasAtMention);
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
  context: NotificationMentionContext = currentNotificationMentionContext,
) {
  if (await shouldPreserveMentionNotificationAsync(notification, context)) {
    return;
  }

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

export async function dismissNonMentionNotificationsAsync(
  context: NotificationMentionContext = currentNotificationMentionContext,
) {
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
      dismissNonMentionNotificationAsync(notification, context),
    ),
  );
}

export function PushNotificationRegistrar() {
  const { user, group, profile } = useAuth();
  const userId = user?.id ?? null;
  const groupId = group?.id ?? null;
  const username = profile?.username ?? null;
  const registeredKeyRef = useRef<string | null>(null);

  useEffect(() => {
    setCurrentNotificationMentionContext({
      currentUserId: userId,
      currentUsername: username,
    });

    return () => {
      setCurrentNotificationMentionContext({});
    };
  }, [userId, username]);

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

    const tokenSubscription = Notifications.addPushTokenListener((token) => {
      const registrationKey = `${userId}:${groupId}`;
      registerDevicePushToken(token)
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
