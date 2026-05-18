import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue | undefined };

export type PushTokenRow = {
  id: string;
  user_id: string;
  expo_push_token: string;
};

export type ExpoPushMessage = {
  to: string;
  title?: string;
  body: string;
  sound?: "default" | null;
  channelId?: string;
  priority?: "default" | "normal" | "high";
  data?: Record<string, JsonValue>;
};

export type ExpoPushTicket = {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: {
    error?: string;
    [key: string]: unknown;
  };
};

export function createServiceClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = getServiceKey();

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Missing Supabase URL or service key");
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function requireInternalSecret(req: Request): Response | null {
  const expected = Deno.env.get("NOTIFICATION_WEBHOOK_SECRET");
  if (!expected) return null;

  const actual = req.headers.get("x-notification-secret");
  if (actual === expected) return null;

  return Response.json({ error: "unauthorized" }, { status: 401 });
}

export function normalizeDisplayName(
  profile: { display_name?: string | null; username?: string | null } | null,
): string {
  return profile?.display_name?.trim() || profile?.username?.trim() || "Someone";
}

export async function getEnabledRecipientIds(
  supabase: SupabaseClient,
  recipientIds: string[],
  preferenceColumn:
    | "messages_enabled"
    | "proofs_enabled"
    | "reactions_enabled"
    | "screen_unlocks_enabled",
): Promise<string[]> {
  const uniqueIds = Array.from(new Set(recipientIds));
  if (uniqueIds.length === 0) return [];

  const { data, error } = await supabase
    .from("notification_preferences")
    .select(`user_id, ${preferenceColumn}`)
    .in("user_id", uniqueIds);

  if (error) throw error;

  const preferenceByUser = new Map<string, boolean>();
  for (const row of data ?? []) {
    preferenceByUser.set(
      row.user_id as string,
      (row[preferenceColumn] as boolean | null) ?? true,
    );
  }

  return uniqueIds.filter((id) => preferenceByUser.get(id) ?? true);
}

export async function getEnabledPushTokens(
  supabase: SupabaseClient,
  recipientIds: string[],
): Promise<PushTokenRow[]> {
  const uniqueIds = Array.from(new Set(recipientIds));
  if (uniqueIds.length === 0) return [];

  const { data, error } = await supabase
    .from("push_tokens")
    .select("id, user_id, expo_push_token")
    .eq("enabled", true)
    .in("user_id", uniqueIds);

  if (error) throw error;

  return (data ?? []) as PushTokenRow[];
}

export async function sendExpoPushMessages(
  messages: ExpoPushMessage[],
): Promise<ExpoPushTicket[]> {
  if (messages.length === 0) return [];

  const tickets: ExpoPushTicket[] = [];
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
    };
    const accessToken = Deno.env.get("EXPO_ACCESS_TOKEN");
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers,
      body: JSON.stringify(chunk),
    });

    const result = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(
        `Expo push request failed (${response.status}): ${
          result ? JSON.stringify(result) : response.statusText
        }`,
      );
    }

    if (!Array.isArray(result?.data)) {
      throw new Error(`Unexpected Expo push response: ${JSON.stringify(result)}`);
    }

    tickets.push(...(result.data as ExpoPushTicket[]));
  }

  return tickets;
}

export async function recordDeliveries(
  supabase: SupabaseClient,
  args: {
    batchId?: string | null;
    notificationKind: string;
    tokens: PushTokenRow[];
    tickets: ExpoPushTicket[];
  },
): Promise<string[]> {
  if (args.tokens.length === 0) return [];

  const invalidTokenIds: string[] = [];
  const rows = args.tokens.map((token, index) => {
    const ticket = args.tickets[index];
    const errorCode = ticket?.details?.error;

    if (errorCode === "DeviceNotRegistered") {
      invalidTokenIds.push(token.id);
    }

    return {
      batch_id: args.batchId ?? null,
      notification_kind: args.notificationKind,
      recipient_id: token.user_id,
      push_token_id: token.id,
      expo_ticket_id: ticket?.id ?? null,
      status: ticket?.status ?? "error",
      error: ticket?.message ?? errorCode ?? null,
    };
  });

  const { error } = await supabase.from("notification_deliveries").insert(rows);
  if (error) throw error;

  return invalidTokenIds;
}

export async function disablePushTokens(
  supabase: SupabaseClient,
  tokenIds: string[],
): Promise<void> {
  const uniqueIds = Array.from(new Set(tokenIds));
  if (uniqueIds.length === 0) return;

  const { error } = await supabase
    .from("push_tokens")
    .update({ enabled: false })
    .in("id", uniqueIds);

  if (error) throw error;
}

function getServiceKey(): string | null {
  const explicit =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
    Deno.env.get("SUPABASE_SECRET_KEY");
  if (explicit) return explicit;

  const secretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (!secretKeys) return null;

  try {
    const parsed = JSON.parse(secretKeys) as Record<string, string | undefined>;
    return parsed.default ?? Object.values(parsed)[0] ?? null;
  } catch {
    return null;
  }
}
