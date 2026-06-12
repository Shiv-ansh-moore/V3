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

type UnlockPayload = {
  message_id?: string;
  group_id?: string;
  actor_id?: string;
  session_id?: string | null;
  record?: {
    id?: string;
    group_id?: string;
    sender_id?: string | null;
    session_id?: string | null;
  };
};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "method not allowed" }, { status: 405 });
  }

  const unauthorized = requireInternalSecret(req);
  if (unauthorized) return unauthorized;

  try {
    const payload = (await req.json()) as UnlockPayload;
    const record = payload.record ?? {};
    const messageId = payload.message_id ?? record.id;

    if (!messageId) {
      return Response.json({ error: "message_id is required" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data: message, error: messageError } = await supabase
      .from("messages")
      .select("id, group_id, sender_id, kind, session_id")
      .eq("id", messageId)
      .single();

    if (messageError) throw messageError;
    if (!message || message.kind !== "unlock" || !message.sender_id) {
      return Response.json({ ok: true, skipped: true });
    }

    const { data: session, error: sessionError } = await supabase
      .from("screen_sessions")
      .select("id, app_name, reason")
      .eq("id", message.session_id)
      .single();

    if (sessionError) throw sessionError;

    const { data: actorProfile, error: actorError } = await supabase
      .from("profiles")
      .select("display_name, username")
      .eq("id", message.sender_id)
      .maybeSingle();

    if (actorError) throw actorError;

    const { data: members, error: membersError } = await supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", message.group_id)
      .neq("user_id", message.sender_id);

    if (membersError) throw membersError;

    const recipientIds = (members ?? []).map((member) => member.user_id as string);
    const enabledRecipientIds = await getEnabledRecipientIds(
      supabase,
      recipientIds,
      "screen_unlocks_enabled",
    );
    const tokens = await getEnabledPushTokens(supabase, enabledRecipientIds);

    if (tokens.length === 0) {
      return Response.json({ ok: true, sent: 0 });
    }

    const actorName = normalizeDisplayName(actorProfile);
    const appName = session?.app_name?.trim() || "Apps";
    const reason = session?.reason?.trim() || "No reason given";
    const title = `${actorName} unlocked ${appName}`;

    const messages = tokens.map((token) => ({
      to: token.expo_push_token,
      title,
      body: reason,
      sound: "default" as const,
      channelId: "social",
      priority: "high" as const,
      data: {
        tab: "social",
        url: "/(app)?tab=social",
        type: "screen_unlock",
        groupId: message.group_id,
        recipientUserId: token.user_id,
        messageId: message.id,
        sessionId: message.session_id,
      },
    }));

    const tickets = await sendExpoPushMessages(messages);
    const invalidTokenIds = await recordDeliveries(supabase, {
      batchId: null,
      notificationKind: "screen_unlock",
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
    console.error("[send-screen-unlock-notification]", error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : "unknown error",
      },
      { status: 500 },
    );
  }
});
