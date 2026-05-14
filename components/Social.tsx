import { StyleSheet, View, Platform, TextInput } from "react-native";
import React, {
  useMemo,
  useCallback,
  useState,
  useRef,
  useEffect,
} from "react";
import AvatarRow, { AvatarRowMember } from "./social/AvatarRow";
import ChatBubble, { BubblePosition } from "./social/ChatBubble";
import CompletedCard from "./social/CompletedCard";
import ScreenTimeLog from "./social/ScreenTimeLog";
import LongPressSheet from "./social/LongPressSheet";
import MessageInput, { ReplyInfo } from "./social/MessageInput";
import StoryViewer, { StoryProof } from "./social/StoryViewer";
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
type ScreenSessionRow =
  Database["public"]["Tables"]["screen_sessions"]["Row"];
type RecentProofRow =
  Database["public"]["Functions"]["get_group_recent_proofs"]["Returns"][number];
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
  session: ScreenSessionRow | ScreenSessionRow[] | null;
};

type StoriesByUser = Record<string, StoryProof[]>;

interface SocialProps {
  active?: boolean;
}

type ScreenSessionSummary = {
  id: string;
  userId: string;
  startedAt: string;
  seconds: number;
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

function formatDuration(totalSeconds: number): string {
  const clamped = Math.max(0, Math.round(totalSeconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;

  if (mins === 0) {
    return `${secs} sec${secs === 1 ? "" : "s"}`;
  }

  const minuteText = `${mins} min${mins === 1 ? "" : "s"}`;
  if (secs === 0) return minuteText;

  return `${minuteText} ${secs} sec${secs === 1 ? "" : "s"}`;
}

function getLocalDayKey(value: string): string {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getUsedSeconds(session: ScreenSessionRow): number {
  return session.actual_seconds ?? session.granted_seconds;
}

function buildDailyTotalLookup(
  sessionsById: Map<string, ScreenSessionSummary>,
): Map<string, number> {
  const sessionsByUserDay = new Map<string, ScreenSessionSummary[]>();
  const dailyTotals = new Map<string, number>();

  sessionsById.forEach((session, sessionId) => {
    const key = `${session.userId}:${getLocalDayKey(session.startedAt)}`;
    sessionsByUserDay.set(key, [
      ...(sessionsByUserDay.get(key) ?? []),
      session,
    ]);
    dailyTotals.set(sessionId, 0);
  });

  sessionsByUserDay.forEach((sessions) => {
    sessions.sort(
      (a, b) =>
        new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
    );

    let runningTotal = 0;
    sessions.forEach((session) => {
      runningTotal += session.seconds;
      dailyTotals.set(session.id, runningTotal);
    });
  });

  return dailyTotals;
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
    text = ref.goalTitle;
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
    caption: ref.kind === "completed" ? ref.caption : undefined,
    activityType: ref.kind === "activity" ? ref.type : undefined,
  };
}

function buildReplyInfo(item: FeedItem): ReplyInfo {
  let text: string;
  if (item.kind === "message") {
    text = item.text;
  } else if (item.kind === "completed") {
    text = `Completed ${item.goalTitle}`;
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

export default function Social({ active = true }: SocialProps) {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const [replyingTo, setReplyingTo] = useState<ReplyInfo | null>(null);
  const [sheetItem, setSheetItem] = useState<FeedItem | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const { group, user } = useAuth();
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [groupMembers, setGroupMembers] = useState<AvatarRowMember[]>([]);
  const [storiesByUser, setStoriesByUser] = useState<StoriesByUser>({});
  const [selectedStoryUserId, setSelectedStoryUserId] = useState<string | null>(
    null,
  );
  const [selectedStoryInitialIndex, setSelectedStoryInitialIndex] = useState(0);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [userColours, setUserColours] = useState<Record<string, string>>({});
  const reversedFeed = useMemo(() => [...feed].reverse(), [feed]);
  const selectedStoryMember =
    groupMembers.find((member) => member.id === selectedStoryUserId) ?? null;
  const selectedStories = selectedStoryUserId
    ? (storiesByUser[selectedStoryUserId] ?? [])
    : [];

  const resolveUserName = useCallback(
    (userId: string): string => userNames[userId] ?? "Unknown",
    [userNames],
  );

  const resolveUserColour = useCallback(
    (userId: string): string =>
      userColours[userId] ?? Colours.secondaryText,
    [userColours],
  );

  const performRefreshFeed = useCallback(async () => {
    if (!group) {
      setFeed([]);
      setGroupMembers([]);
      setStoriesByUser({});
      setSelectedStoryUserId(null);
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

    const { data: storyRows, error: storyError } = await supabase.rpc(
      "get_group_recent_proofs",
      { p_group_id: group.id },
    );

    if (storyError) {
      console.log("[social] story proofs fetch error:", storyError.message);
    }

    const nextStoriesByUser: StoriesByUser = {};
    const signedStories = await Promise.all(
      ((storyRows ?? []) as RecentProofRow[]).map(
        async (proof): Promise<StoryProof> => {
          const { data: signedImage, error: signedImageError } =
            await supabase.storage
              .from("proofs")
              .createSignedUrl(proof.image_path, 60 * 60);

          if (signedImageError) {
            console.log(
              "[social] story proof image error:",
              signedImageError.message,
            );
          }

          return {
            proofId: proof.proof_id,
            userId: proof.user_id,
            messageId: proof.message_id,
            goalId: proof.goal_id,
            goalTitle: proof.goal_title,
            caption: proof.caption,
            imageUrl: signedImage?.signedUrl ?? null,
            submittedAt: proof.submitted_at,
            viewedByMe: proof.viewed_by_me,
          };
        },
      ),
    );

    signedStories.forEach((story) => {
      nextStoriesByUser[story.userId] = [
        ...(nextStoriesByUser[story.userId] ?? []),
        story,
      ];
    });

    const latestStoryTimeByUser = new Map<string, number>();
    signedStories.forEach((story) => {
      const submittedAt = new Date(story.submittedAt).getTime();
      const currentLatest = latestStoryTimeByUser.get(story.userId);
      if (currentLatest === undefined || submittedAt > currentLatest) {
        latestStoryTimeByUser.set(story.userId, submittedAt);
      }
    });

    const nextUserNames: Record<string, string> = {};
    const nextUserColours: Record<string, string> = {};
    const nextGroupMembers: AvatarRowMember[] = [];
    const groupMemberOrder = new Map<string, number>();

    ((membersData ?? []) as GroupMemberRow[]).forEach((member, index) => {
      const profile = firstRelation(member.profile);
      const displayName =
        profile?.display_name ?? profile?.username ?? "Unknown";
      const colour = GROUP_USER_COLOURS[index % GROUP_USER_COLOURS.length];
      groupMemberOrder.set(member.user_id, index);

      if (member.user_id !== user?.id) {
        nextGroupMembers.push({
          id: member.user_id,
          displayName,
          avatarUrl: profile?.avatar_url ?? null,
          colour,
          storyStatus:
            (nextStoriesByUser[member.user_id]?.length ?? 0) === 0
              ? null
              : nextStoriesByUser[member.user_id].some(
                  (story) => !story.viewedByMe,
                )
                ? "unseen"
                : "seen",
        });
      }

      nextUserNames[member.user_id] = displayName;
      nextUserColours[member.user_id] = colour;
    });

    nextGroupMembers.sort((a, b) => {
      const aLatestStoryTime = latestStoryTimeByUser.get(a.id);
      const bLatestStoryTime = latestStoryTimeByUser.get(b.id);

      if (aLatestStoryTime !== undefined && bLatestStoryTime !== undefined) {
        return bLatestStoryTime - aLatestStoryTime;
      }

      if (aLatestStoryTime !== undefined) return -1;
      if (bLatestStoryTime !== undefined) return 1;

      return (
        (groupMemberOrder.get(a.id) ?? 0) - (groupMemberOrder.get(b.id) ?? 0)
      );
    });

    const { data, error } = await supabase
      .from("messages")
      .select(
        `
      *,
      proof:proofs(
        *,
        goal:goals(*)
      ),
      session:screen_sessions(*)
    `,
      )
      .eq("group_id", group.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.log("[social] fetch error:", error.message);
      return;
    }

    const rows = [...((data ?? []) as SocialMessageRow[])].reverse();
    const screenSessionsById = new Map<string, ScreenSessionSummary>();

    rows.forEach((message) => {
      const session = firstRelation(message.session);
      if (!session) return;

      screenSessionsById.set(session.id, {
        id: session.id,
        userId: message.sender_id ?? session.user_id,
        startedAt: session.started_at,
        seconds: getUsedSeconds(session),
      });
    });

    const dailySessionTotals = buildDailyTotalLookup(screenSessionsById);

    const liveItems = await Promise.all(
      rows.map(async (message): Promise<FeedItem | null> => {
        const proof = firstRelation(message.proof);
        const session = firstRelation(message.session);
        const userId = message.sender_id ?? proof?.user_id ?? session?.user_id;
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

        if (
          (message.kind === "unlock" || message.kind === "lock") &&
          session
        ) {
          const actualSeconds =
            session.actual_seconds ?? session.granted_seconds;
          const duration =
            message.kind === "unlock"
              ? formatDuration(session.granted_seconds)
              : formatDuration(actualSeconds);
          const reason =
            message.kind === "unlock"
              ? (session.reason ?? undefined)
              : undefined;
          const dailyTotalSeconds =
            dailySessionTotals.get(session.id) ?? actualSeconds;
          const totalTime =
            message.kind === "lock"
              ? `${formatDuration(dailyTotalSeconds)} total time today`
              : undefined;

          return {
            kind: "activity",
            id: message.id,
            userId,
            type: message.kind,
            app: session.app_name ?? "Apps",
            duration,
            reason,
            totalTime,
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
          caption: proof.caption,
          timestamp: formatTimestamp(message.created_at),
        };
      }),
    );

    setUserNames(nextUserNames);
    setUserColours(nextUserColours);
    setGroupMembers(nextGroupMembers);
    setStoriesByUser(nextStoriesByUser);
    setFeed(liveItems.filter((item): item is FeedItem => item !== null));
  }, [group, user?.id]);

  const latestRefreshFeedRef = useRef(performRefreshFeed);
  const refreshInFlightRef = useRef<Promise<void> | null>(null);
  const refreshQueuedRef = useRef(false);

  useEffect(() => {
    latestRefreshFeedRef.current = performRefreshFeed;
  }, [performRefreshFeed]);

  const refreshFeed = useCallback(() => {
    latestRefreshFeedRef.current = performRefreshFeed;

    if (refreshInFlightRef.current) {
      refreshQueuedRef.current = true;
      return refreshInFlightRef.current;
    }

    const refreshPromise = (async () => {
      try {
        do {
          refreshQueuedRef.current = false;
          await latestRefreshFeedRef.current();
        } while (refreshQueuedRef.current);
      } finally {
        refreshInFlightRef.current = null;
        refreshQueuedRef.current = false;
      }
    })();

    refreshInFlightRef.current = refreshPromise;
    return refreshPromise;
  }, [performRefreshFeed]);

  useEffect(() => {
    if (active) {
      refreshFeed();
    }
  }, [active, refreshFeed]);

  useEffect(() => {
    if (!active || !group) return;

    const channel = supabase
      .channel(`social-messages:${group.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `group_id=eq.${group.id}`,
        },
        () => {
          void refreshFeed();
        },
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.log("[social] realtime subscription error");
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [active, group, refreshFeed]);

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

  const openStoriesForMember = useCallback(
    (member: AvatarRowMember) => {
      const stories = storiesByUser[member.id] ?? [];
      if (stories.length === 0) return;

      const firstUnseenIndex = stories.findIndex((story) => !story.viewedByMe);
      setSelectedStoryInitialIndex(
        firstUnseenIndex === -1 ? 0 : firstUnseenIndex,
      );
      setSelectedStoryUserId(member.id);
    },
    [storiesByUser],
  );

  const closeStories = useCallback(() => {
    setSelectedStoryUserId(null);
  }, []);

  const playNextMemberStories = useCallback(() => {
    if (!selectedStoryUserId) {
      setSelectedStoryUserId(null);
      return;
    }

    const currentMemberIndex = groupMembers.findIndex(
      (member) => member.id === selectedStoryUserId,
    );
    const nextMember = groupMembers
      .slice(currentMemberIndex + 1)
      .find((member) => (storiesByUser[member.id]?.length ?? 0) > 0);

    if (!nextMember) {
      setSelectedStoryUserId(null);
      return;
    }

    const nextStories = storiesByUser[nextMember.id] ?? [];
    const firstUnseenIndex = nextStories.findIndex(
      (story) => !story.viewedByMe,
    );
    setSelectedStoryInitialIndex(firstUnseenIndex === -1 ? 0 : firstUnseenIndex);
    setSelectedStoryUserId(nextMember.id);
  }, [groupMembers, selectedStoryUserId, storiesByUser]);

  const handleProofViewed = useCallback((proofId: string) => {
    setStoriesByUser((currentStoriesByUser) => {
      for (const [userId, stories] of Object.entries(currentStoriesByUser)) {
        const storyIndex = stories.findIndex(
          (story) => story.proofId === proofId,
        );

        if (storyIndex === -1) continue;

        const story = stories[storyIndex];
        if (story.viewedByMe) return currentStoriesByUser;

        const nextStories = [...stories];
        nextStories[storyIndex] = { ...story, viewedByMe: true };
        const remainingUnseen = nextStories.some(
          (nextStory) => !nextStory.viewedByMe,
        );
        const nextStoryStatus = remainingUnseen ? "unseen" : "seen";

        setGroupMembers((members) =>
          members.map((member) => {
            if (member.id !== userId) return member;
            if (member.storyStatus === nextStoryStatus) return member;

            return {
              ...member,
              storyStatus: nextStoryStatus,
            };
          }),
        );

        return {
          ...currentStoriesByUser,
          [userId]: nextStories,
        };
      }

      return currentStoriesByUser;
    });
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
            caption={item.caption}
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
        <AvatarRow
          members={groupMembers}
          onMemberPress={openStoriesForMember}
        />
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
      {selectedStoryMember && (
        <StoryViewer
          key={selectedStoryMember.id}
          visible={selectedStories.length > 0}
          memberName={selectedStoryMember.displayName}
          memberAvatarUrl={selectedStoryMember.avatarUrl}
          memberColour={selectedStoryMember.colour}
          stories={selectedStories}
          initialIndex={selectedStoryInitialIndex}
          onClose={closeStories}
          onComplete={playNextMemberStories}
          onProofViewed={handleProofViewed}
        />
      )}
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
