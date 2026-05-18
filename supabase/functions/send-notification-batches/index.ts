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

type BatchKind = "messages" | "proofs" | "reactions";
type TargetKind = "message" | "proof" | null;

type NotificationBatch = {
  id: string;
  recipient_id: string;
  group_id: string;
  kind: BatchKind;
  target_kind: TargetKind;
  attempt_count: number;
};

type NotificationEvent = {
  id: string;
  actor_id: string | null;
  created_at: string;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  username: string | null;
};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "method not allowed" }, { status: 405 });
  }

  const unauthorized = requireInternalSecret(req);
  if (unauthorized) return unauthorized;

  const supabase = createServiceClient();

  try {
    const { data: batches, error } = await supabase.rpc(
      "claim_due_notification_batches",
      { p_limit: 25 },
    );

    if (error) throw error;

    let sent = 0;
    let failed = 0;
    let skipped = 0;
    let disabledTokens = 0;

    for (const batch of (batches ?? []) as NotificationBatch[]) {
      try {
        const result = await processBatch(supabase, batch);
        sent += result.sent;
        skipped += result.skipped;
        disabledTokens += result.disabledTokens;
      } catch (batchError) {
        failed++;
        await markBatchError(
          supabase,
          batch,
          batchError instanceof Error ? batchError.message : "unknown error",
        );
      }
    }

    return Response.json({
      ok: true,
      claimed: batches?.length ?? 0,
      sent,
      skipped,
      failed,
      disabledTokens,
    });
  } catch (error) {
    console.error("[send-notification-batches]", error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : "unknown error",
      },
      { status: 500 },
    );
  }
});

async function processBatch(
  supabase: ReturnType<typeof createServiceClient>,
  batch: NotificationBatch,
): Promise<{ sent: number; skipped: number; disabledTokens: number }> {
  const { data: events, error: eventsError } = await supabase
    .from("notification_events")
    .select("id, actor_id, created_at")
    .eq("batch_id", batch.id)
    .order("created_at", { ascending: true });

  if (eventsError) throw eventsError;

  const typedEvents = (events ?? []) as NotificationEvent[];
  if (typedEvents.length === 0) {
    await markBatchSent(supabase, batch.id);
    return { sent: 0, skipped: 1, disabledTokens: 0 };
  }

  const enabledRecipientIds = await getEnabledRecipientIds(
    supabase,
    [batch.recipient_id],
    preferenceColumnForBatch(batch.kind),
  );

  if (enabledRecipientIds.length === 0) {
    await markBatchSent(supabase, batch.id);
    return { sent: 0, skipped: 1, disabledTokens: 0 };
  }

  const tokens = await getEnabledPushTokens(supabase, [batch.recipient_id]);
  if (tokens.length === 0) {
    await markBatchSent(supabase, batch.id);
    return { sent: 0, skipped: 1, disabledTokens: 0 };
  }

  const actorNames = await loadActorNames(
    supabase,
    typedEvents
      .map((event) => event.actor_id)
      .filter((actorId): actorId is string => !!actorId),
  );
  const content = buildNotificationContent(batch, typedEvents, actorNames);
  const messages = tokens.map((token) => ({
    to: token.expo_push_token,
    title: "V3",
    body: content.body,
    sound: "default" as const,
    channelId: "social",
    priority: "default" as const,
    data: {
      tab: "social",
      url: "/(app)?tab=social",
      type: batch.kind,
      groupId: batch.group_id,
      batchId: batch.id,
    },
  }));

  const tickets = await sendExpoPushMessages(messages);
  const invalidTokenIds = await recordDeliveries(supabase, {
    batchId: batch.id,
    notificationKind: batch.kind,
    tokens,
    tickets,
  });
  await disablePushTokens(supabase, invalidTokenIds);
  await markBatchSent(supabase, batch.id);

  return {
    sent: tokens.length,
    skipped: 0,
    disabledTokens: invalidTokenIds.length,
  };
}

async function loadActorNames(
  supabase: ReturnType<typeof createServiceClient>,
  actorIds: string[],
): Promise<Map<string, string>> {
  const uniqueActorIds = Array.from(new Set(actorIds));
  const names = new Map<string, string>();
  if (uniqueActorIds.length === 0) return names;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, username")
    .in("id", uniqueActorIds);

  if (error) throw error;

  for (const profile of (data ?? []) as ProfileRow[]) {
    names.set(profile.id, normalizeDisplayName(profile));
  }

  return names;
}

function buildNotificationContent(
  batch: NotificationBatch,
  events: NotificationEvent[],
  actorNames: Map<string, string>,
): { body: string } {
  if (batch.kind === "messages") {
    return {
      body: `You have ${events.length} new ${
        events.length === 1 ? "message" : "messages"
      }`,
    };
  }

  const actorIds = Array.from(
    new Set(
      events
        .map((event) => event.actor_id)
        .filter((actorId): actorId is string => !!actorId),
    ),
  );

  if (batch.kind === "proofs") {
    if (actorIds.length === 1) {
      const actorName = actorNames.get(actorIds[0]) ?? "Someone";
      return {
        body:
          events.length === 1
            ? `${actorName} posted a proof`
            : `${actorName} posted ${events.length} proofs`,
      };
    }

    return {
      body: `${actorIds.length} people posted ${events.length} proofs`,
    };
  }

  const target = batch.target_kind === "proof" ? "proof" : "message";
  if (actorIds.length === 1) {
    return {
      body: `${actorNames.get(actorIds[0]) ?? "Someone"} reacted to your ${target}`,
    };
  }

  return {
    body: `${actorIds.length} people reacted to your ${target}`,
  };
}

function preferenceColumnForBatch(
  kind: BatchKind,
): "messages_enabled" | "proofs_enabled" | "reactions_enabled" {
  switch (kind) {
    case "messages":
      return "messages_enabled";
    case "proofs":
      return "proofs_enabled";
    case "reactions":
      return "reactions_enabled";
  }
}

async function markBatchSent(
  supabase: ReturnType<typeof createServiceClient>,
  batchId: string,
) {
  const { error } = await supabase
    .from("notification_batches")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      locked_at: null,
      last_error: null,
    })
    .eq("id", batchId);

  if (error) throw error;
}

async function markBatchError(
  supabase: ReturnType<typeof createServiceClient>,
  batch: NotificationBatch,
  message: string,
) {
  const shouldRetry = batch.attempt_count < 5;
  const retryDelayMinutes = Math.min(
    30,
    Math.max(1, 2 ** Math.max(0, batch.attempt_count - 1)),
  );
  const readyAt = new Date(
    Date.now() + retryDelayMinutes * 60 * 1000,
  ).toISOString();

  const { error } = await supabase
    .from("notification_batches")
    .update({
      status: shouldRetry ? "pending" : "failed",
      ready_at: shouldRetry ? readyAt : undefined,
      locked_at: null,
      last_error: message,
    })
    .eq("id", batch.id);

  if (error) {
    console.error("[send-notification-batches] failed to mark batch error", {
      batchId: batch.id,
      error,
    });
  }
}
