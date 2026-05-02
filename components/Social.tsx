import { StyleSheet, View, Platform, TextInput } from "react-native";
import React, {
  useMemo,
  useCallback,
  useState,
  useRef,
  useEffect,
} from "react";
import AvatarRow from "./social/AvatarRow";
import ChatBubble, { BubblePosition } from "./social/ChatBubble";
import CompletedCard from "./social/CompletedCard";
import ScreenTimeLog from "./social/ScreenTimeLog";
import LongPressSheet from "./social/LongPressSheet";
import MessageInput, { ReplyInfo } from "./social/MessageInput";
import { FlatList } from "react-native-gesture-handler";
import { Colours } from "../constants/Colours";
import { ChatMessage, FeedItem } from "../testData/mockSocial";
import { ReplyQuoteProps } from "./social/ReplyQuote";
import {
  KeyboardAvoidingView,
  KeyboardGestureArea,
} from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { GROUP_USER_COLOURS } from "../lib/groupColours";
import type { Database } from "../lib/database.types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type ProofRow = Database["public"]["Tables"]["proofs"]["Row"];
type GoalRow = Database["public"]["Tables"]["goals"]["Row"];
type GroupMemberRow = Database["public"]["Tables"]["group_members"]["Row"] & {
  profile: ProfileRow | ProfileRow[] | null;
};

type SocialMessageRow = Database["public"]["Tables"]["messages"]["Row"] & {
  proof:
    | (ProofRow & {
        goal: GoalRow | GoalRow[] | null;
      })
    | (ProofRow & {
        goal: GoalRow | GoalRow[] | null;
      })[]
    | null;
};

function firstRelation<T>(relation: T | T[] | null): T | null {
  return Array.isArray(relation) ? (relation[0] ?? null) : relation;
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getMessagePosition(feed: FeedItem[], index: number): BubblePosition {
  const current = feed[index];
  if (current.kind !== "message") return "standalone";

  if (current.replyToId) return "standalone";

  const prev = feed[index - 1];
  const next = feed[index + 1];

  const sameAsPrev =
    prev?.kind === "message" &&
    !prev.replyToId &&
    prev.userId === current.userId;
  const sameAsNext =
    next?.kind === "message" &&
    !next.replyToId &&
    next.userId === current.userId;

  if (sameAsPrev && sameAsNext) return "middle";
  if (sameAsPrev) return "last";
  if (sameAsNext) return "first";
  return "standalone";
}

function buildReplyTo(
  item: ChatMessage,
  feed: FeedItem[],
  resolveUserName: (userId: string) => string,
  resolveUserColour: (userId: string) => string,
): ReplyQuoteProps | undefined {
  if (!item.replyToId) return undefined;

  const ref = feed.find((i) => i.id === item.replyToId);
  if (!ref) return undefined;

  let text: string;
  if (ref.kind === "message") {
    text = ref.text;
  } else if (ref.kind === "completed") {
    text = `Completed ${ref.goalTitle} ✅`;
  } else {
    text =
      ref.type === "unlock"
        ? `unlocked ${ref.app} for ${ref.duration}`
        : `locked ${ref.app} after ${ref.duration}`;
  }

  return {
    userName: resolveUserName(ref.userId),
    userColour: resolveUserColour(ref.userId),
    text,
    timestamp: ref.kind !== "activity" ? ref.timestamp : undefined,
    photoUri: ref.kind === "completed" ? ref.photoUri : undefined,
    activityType: ref.kind === "activity" ? ref.type : undefined,
  };
}

function buildReplyInfo(item: FeedItem): ReplyInfo {
  let text: string;
  if (item.kind === "message") {
    text = item.text;
  } else if (item.kind === "completed") {
    text = `Completed ${item.goalTitle} ✅`;
  } else {
    text =
      item.type === "unlock"
        ? `unlocked ${item.app} for ${item.duration}`
        : `locked ${item.app} after ${item.duration}`;
  }

  return {
    id: item.id,
    userName: "Unknown",
    userColour: Colours.secondaryText,
    text,
  };
}

export default function Social() {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const [replyingTo, setReplyingTo] = useState<ReplyInfo | null>(null);
  const [sheetItem, setSheetItem] = useState<FeedItem | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const { group, user } = useAuth();
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [userColours, setUserColours] = useState<Record<string, string>>({});
  const reversedFeed = useMemo(() => [...feed].reverse(), [feed]);

  const resolveUserName = useCallback(
    (userId: string): string => userNames[userId] ?? "Unknown",
    [userNames],
  );

  const resolveUserColour = useCallback(
    (userId: string): string =>
      userColours[userId] ?? Colours.secondaryText,
    [userColours],
  );

  const refreshFeed = useCallback(async () => {
    if (!group) {
      setFeed([]);
      return;
    }

    const { data: membersData, error: membersError } = await supabase
      .from("group_members")
      .select(
        `
      *,
      profile:profiles!group_members_user_id_fkey(*)
    `,
      )
      .eq("group_id", group.id)
      .order("joined_at", { ascending: true });

    if (membersError) {
      console.log("[social] group members fetch error:", membersError.message);
      return;
    }

    const nextUserNames: Record<string, string> = {};
    const nextUserColours: Record<string, string> = {};

    ((membersData ?? []) as GroupMemberRow[]).forEach((member, index) => {
      const profile = firstRelation(member.profile);
      nextUserNames[member.user_id] =
        profile?.display_name ?? profile?.username ?? "Unknown";
      nextUserColours[member.user_id] =
        GROUP_USER_COLOURS[index % GROUP_USER_COLOURS.length];
    });

    const { data, error } = await supabase
      .from("messages")
      .select(
        `
      *,
      proof:proofs(
        *,
        goal:goals(*)
      )
    `,
      )
      .eq("group_id", group.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.log("[social] fetch error:", error.message);
      return;
    }

    const rows = (data ?? []) as SocialMessageRow[];

    const liveItems = await Promise.all(
      rows.map(async (message): Promise<FeedItem | null> => {
        const proof = firstRelation(message.proof);
        const userId = message.sender_id ?? proof?.user_id;
        if (!userId) return null;

        if (message.kind === "text") {
          if (!message.body) return null;

          return {
            kind: "message",
            id: message.id,
            userId,
            text: message.body,
            timestamp: formatTimestamp(message.created_at),
            replyToId: message.reply_to_id ?? undefined,
          };
        }

        if (message.kind !== "proof" || !proof) return null;

        const goal = firstRelation(proof.goal);
        const { data: signedImage, error: signedImageError } =
          await supabase.storage
            .from("proofs")
            .createSignedUrl(proof.image_path, 60 * 60);

        if (signedImageError) {
          console.log("[social] proof image error:", signedImageError.message);
        }

        return {
          kind: "completed",
          id: message.id,
          userId,
          goalTitle: goal?.title ?? "Goal",
          photoUri: signedImage?.signedUrl ?? null,
          timestamp: formatTimestamp(message.created_at),
        };
      }),
    );

    setUserNames(nextUserNames);
    setUserColours(nextUserColours);
    setFeed(liveItems.filter((item): item is FeedItem => item !== null));
  }, [group]);

  useEffect(() => {
    refreshFeed();
  }, [refreshFeed]);

  const handleReply = useCallback(
    (item: FeedItem) => {
      setReplyingTo({
        ...buildReplyInfo(item),
        userName: resolveUserName(item.userId),
        userColour: resolveUserColour(item.userId),
      });
    },
    [resolveUserColour, resolveUserName],
  );

  const clearReply = useCallback(() => {
    setReplyingTo(null);
  }, []);

  const handleLongPress = useCallback((item: FeedItem) => {
    setSheetItem(item);
    setSheetVisible(true);
  }, []);

  const closeSheet = useCallback(() => {
    setSheetVisible(false);
    setSheetItem(null);
  }, []);

  const handleSheetReact = useCallback((_emoji: string) => {
    // Reaction handling — would add to item.reactions in a real app
  }, []);

  const handleSheetReply = useCallback(() => {
    if (sheetItem) {
      setReplyingTo({
        ...buildReplyInfo(sheetItem),
        userName: resolveUserName(sheetItem.userId),
        userColour: resolveUserColour(sheetItem.userId),
      });
    }
  }, [resolveUserColour, resolveUserName, sheetItem]);

  const handleSendMessage = useCallback(
    async (text: string) => {
      if (!group || !user) {
        throw new Error("Cannot send without an active group and user.");
      }

      const { error } = await supabase.from("messages").insert({
        group_id: group.id,
        sender_id: user.id,
        kind: "text",
        body: text,
        reply_to_id: replyingTo?.id ?? null,
      });

      if (error) {
        console.log("[social] send error:", error.message);
        throw error;
      }

      setReplyingTo(null);
      await refreshFeed();
    },
    [group, refreshFeed, replyingTo?.id, user],
  );

  useEffect(() => {
    if (replyingTo) {
      inputRef.current?.focus();
    }
  }, [replyingTo]);

  const renderItem = useCallback(
    ({ item, index }: { item: FeedItem; index: number }) => {
      const originalIndex = feed.length - 1 - index;

      if (item.kind === "activity") {
        return (
          <ScreenTimeLog
            type={item.type}
            name={resolveUserName(item.userId)}
            nameColour={resolveUserColour(item.userId)}
            app={item.app}
            duration={item.duration}
            reason={item.reason}
            totalTime={item.totalTime}
            reactions={item.reactions}
            onDoubleTap={() => handleReply(item)}
            onLongPress={() => handleLongPress(item)}
          />
        );
      }

      if (item.kind === "message") {
        const prev = feed[originalIndex - 1];
        return (
          <ChatBubble
            name={resolveUserName(item.userId)}
            nameColour={resolveUserColour(item.userId)}
            text={item.text}
            timestamp={item.timestamp}
            position={getMessagePosition(feed, originalIndex)}
            afterActivity={prev?.kind === "activity"}
            replyTo={buildReplyTo(
              item,
              feed,
              resolveUserName,
              resolveUserColour,
            )}
            reactions={item.reactions}
            onDoubleTap={() => handleReply(item)}
            onLongPress={() => handleLongPress(item)}
          />
        );
      }

      if (item.kind === "completed") {
        return (
          <CompletedCard
            name={resolveUserName(item.userId)}
            nameColour={resolveUserColour(item.userId)}
            goalTitle={item.goalTitle}
            photoUri={item.photoUri}
            timestamp={item.timestamp}
            reactions={item.reactions}
            onDoubleTap={() => handleReply(item)}
            onLongPress={() => handleLongPress(item)}
          />
        );
      }

      return null;
    },
    [feed, handleReply, handleLongPress, resolveUserColour, resolveUserName],
  );

  return (
    <>
      <KeyboardAvoidingView
        style={[
          styles.container,
          { paddingLeft: insets.left, paddingRight: insets.right },
        ]}
        behavior={"padding"}
        keyboardVerticalOffset={
          Platform.OS === "ios" ? insets.top : insets.top + 15
        }
      >
        <AvatarRow />
        <KeyboardGestureArea interpolator="ios" style={styles.messagesArea}>
          <FlatList
            data={reversedFeed}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            inverted
            style={styles.messagesArea}
            contentContainerStyle={styles.feed}
          />
        </KeyboardGestureArea>
        <View style={{ paddingBottom: insets.bottom }}>
          <MessageInput
            replyingTo={replyingTo}
            onClearReply={clearReply}
            inputRef={inputRef}
            onSend={handleSendMessage}
          />
        </View>
      </KeyboardAvoidingView>
      <LongPressSheet
        visible={sheetVisible}
        item={sheetItem}
        userName={sheetItem ? resolveUserName(sheetItem.userId) : ""}
        userColour={sheetItem ? resolveUserColour(sheetItem.userId) : ""}
        onClose={closeSheet}
        onReact={handleSheetReact}
        onReply={handleSheetReply}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colours.background,
  },
  messagesArea: {
    flex: 1,
  },
  feed: {
    paddingHorizontal: 19,
  },
});
