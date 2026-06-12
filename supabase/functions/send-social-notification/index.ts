import {
  createServiceClient,
  disablePushTokens,
  getEnabledPushTokens,
  getEnabledRecipientIds,
  normalizeDisplayName,
  recordDeliveries,
  requireInternalSecret,
  sendExpoPushMessages,
} from "../_shared/notifications.ts";

type SocialEventType = "message" | "proof" | "reaction";
type PreferenceColumn =
  | "messages_enabled"
  | "proofs_enabled"
  | "reactions_enabled";

type SocialNotificationPayload = {
  event_type?: SocialEventType;
  type?: SocialEventType;
  message_id?: string;
  actor_id?: string | null;
  emoji?: string | null;
  record?: {
    id?: string;
    message_id?: string;
    user_id?: string | null;
    emoji?: string | null;
  };
};

type MessageRow = {
  id: string;
  group_id: string;
  sender_id: string | null;
  kind: string;
  body: string | null;
  mention_entities: unknown;
  proof_id: string | null;
};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "method not allowed" }, { status: 405 });
  }

  const unauthorized = requireInternalSecret(req);
  if (unauthorized) return unauthorized;

  try {
    const payload = (await req.json()) as SocialNotificationPayload;
    const record = payload.record ?? {};
    const eventType = payload.event_type ?? payload.type;
    const messageId = payload.message_id ?? record.message_id ?? record.id;

    if (!eventType || !["message", "proof", "reaction"].includes(eventType)) {
      return Response.json({ error: "valid event_type is required" }, { status: 400 });
    }

    if (!messageId) {
      return Response.json({ error: "message_id is required" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data: message, error: messageError } = await supabase
      .from("messages")
      .select("id, group_id, sender_id, kind, body, mention_entities, proof_id")
      .eq("id", messageId)
      .single();

    if (messageError) throw messageError;

    const typedMessage = message as MessageRow | null;
    if (!typedMessage) {
      return Response.json({ ok: true, skipped: true });
    }

    const actorId =
      payload.actor_id ?? record.user_id ?? typedMessage.sender_id ?? null;
    const details = buildNotificationDetails({
      actorId,
      emoji: payload.emoji ?? record.emoji ?? null,
      eventType,
      message: typedMessage,
    });

    if (!details) {
      return Response.json({ ok: true, skipped: true });
    }

    const { data: actorProfile, error: actorError } = await supabase
      .from("profiles")
      .select("display_name, username")
      .eq("id", details.actorId)
      .maybeSingle();

    if (actorError) throw actorError;

    const recipientIds =
      details.recipientIds ??
      (await loadGroupRecipientIds(supabase, typedMessage.group_id, details.actorId));
    const recipientIdSet = new Set(recipientIds);
    const mentionedRecipientIds = details.mentionedRecipientIds?.filter((id) =>
      recipientIdSet.has(id)
    ) ?? [];
    const mentionedRecipientSet = new Set(mentionedRecipientIds);
    const enabledRecipientIds = await getEnabledRecipientIds(
      supabase,
      recipientIds,
      details.preferenceColumn,
    );
    const tokens = await getEnabledPushTokens(supabase, enabledRecipientIds);

    if (tokens.length === 0) {
      return Response.json({ ok: true, sent: 0 });
    }

    const actorName = normalizeDisplayName(actorProfile);
    const messages = tokens.map((token) => ({
      to: token.expo_push_token,
      title: actorName,
      body:
        details.mentionBody && mentionedRecipientSet.has(token.user_id)
          ? details.mentionBody
          : details.body,
      sound: "default" as const,
      channelId: "social",
      priority: "high" as const,
      data: {
        tab: "social",
        url: "/(app)?tab=social",
        type: eventType,
        groupId: typedMessage.group_id,
        recipientUserId: token.user_id,
        messageId: typedMessage.id,
        proofId: typedMessage.proof_id,
        emoji: details.emoji,
        isMention: mentionedRecipientSet.has(token.user_id),
      },
    }));

    const tickets = await sendExpoPushMessages(messages);
    const invalidTokenIds = await recordDeliveries(supabase, {
      batchId: null,
      notificationKind: eventType,
      tokens,
      tickets,
    });
    await disablePushTokens(supabase, invalidTokenIds);

    return Response.json({
      ok: true,
      sent: tokens.length,
      disabledTokens: invalidTokenIds.length,
    });
  } catch (error) {
    console.error("[send-social-notification]", error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : "unknown error",
      },
      { status: 500 },
    );
  }
});

function buildNotificationDetails(args: {
  actorId: string | null;
  emoji: string | null;
  eventType: SocialEventType;
  message: MessageRow;
}): {
  actorId: string;
  body: string;
  emoji: string | null;
  preferenceColumn: PreferenceColumn;
  mentionBody?: string;
  mentionedRecipientIds?: string[];
  recipientIds?: string[];
} | null {
  const { actorId, eventType, message } = args;
  if (!actorId) return null;

  if (eventType === "message") {
    if (message.kind !== "text" || message.sender_id !== actorId) return null;
    const preview = notificationPreview(message.body);
    return {
      actorId,
      body: preview,
      emoji: null,
      mentionBody: `mentioned you: ${preview}`,
      mentionedRecipientIds: extractMentionRecipientIds(
        message.mention_entities,
        actorId,
      ),
      preferenceColumn: "messages_enabled",
    };
  }

  if (eventType === "proof") {
    if (message.kind !== "proof" || message.sender_id !== actorId) return null;
    return {
      actorId,
      body: "posted a proof",
      emoji: null,
      preferenceColumn: "proofs_enabled",
    };
  }

  if (
    message.sender_id === null ||
    message.sender_id === actorId ||
    (message.kind !== "text" && message.kind !== "proof")
  ) {
    return null;
  }

  const emoji = args.emoji?.trim() || null;
  const target = message.kind === "proof" ? "proof" : "message";
  return {
    actorId,
    body: `${emoji ? `${emoji} ` : ""}reacted to your ${target}`,
    emoji,
    preferenceColumn: "reactions_enabled",
    recipientIds: [message.sender_id],
  };
}

async function loadGroupRecipientIds(
  supabase: ReturnType<typeof createServiceClient>,
  groupId: string,
  actorId: string,
): Promise<string[]> {
  const { data: members, error } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId)
    .neq("user_id", actorId);

  if (error) throw error;

  return (members ?? []).map((member) => member.user_id as string);
}

function extractMentionRecipientIds(
  value: unknown,
  actorId: string,
): string[] {
  if (!Array.isArray(value)) return [];

  const ids = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== "object") continue;

    const userId = (item as Record<string, unknown>).user_id;
    if (typeof userId === "string" && userId !== actorId) {
      ids.add(userId);
    }
  }

  return Array.from(ids);
}

function notificationPreview(body: string | null): string {
  const normalized = body?.replace(/\s+/g, " ").trim();
  if (!normalized) return "sent a message";
  if (normalized.length <= 140) return normalized;

  return `${normalized.slice(0, 137).trimEnd()}...`;
}
