import {
  AppState,
  StyleSheet,
  View,
  Platform,
  TextInput,
  Keyboard,
} from "react-native";
import * as Notifications from "expo-notifications";
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
import UnviewedProofBar from "./social/UnviewedProofBar";
import ScreenTimeLog from "./social/ScreenTimeLog";
import LongPressSheet from "./social/LongPressSheet";
import MessageInput, {
  ReplyInfo,
  type MessageSendPayload,
} from "./social/MessageInput";
import StoryViewer, { StoryProof } from "./social/StoryViewer";
import QuickProofGoalSheet, {
  type QuickProofGoalDraft,
} from "./social/QuickProofGoalSheet";
import ProofCamera, { type ProofCameraTarget } from "./personal/ProofCamera";
import { FlatList } from "react-native-gesture-handler";
import { Colours } from "../constants/Colours";
import { ReplyQuoteProps } from "./social/ReplyQuote";
import {
  KeyboardAvoidingView,
  KeyboardGestureArea,
} from "react-native-keyboard-controller";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { GROUP_USER_COLOURS } from "../lib/groupColours";
import type { Database, Json } from "../lib/database.types";
import type { ChatMessage, FeedItem, Reaction } from "../testData/mockSocial";
import GroupMemberOverview, {
  type GroupMemberOverviewHint,
} from "./group/GroupMemberOverview";
import {
  coerceMessageMentions,
  type MentionMember,
} from "../lib/mentions";
import { getProofLateLabel } from "./personal/goalOpenAge";
import {
  dismissNonMentionNotificationAsync,
  dismissNonMentionNotificationsAsync,
} from "../lib/pushNotifications";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type ProofRow = Database["public"]["Tables"]["proofs"]["Row"];
type GoalRow = Database["public"]["Tables"]["goals"]["Row"];
type ScreenSessionRow =
  Database["public"]["Tables"]["screen_sessions"]["Row"];
type ReactionRow = Database["public"]["Tables"]["reactions"]["Row"];
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
  reactions: ReactionRow[] | null;
};

type StoriesByUser = Record<string, StoryProof[]>;

type SelectedStoryOverride = {
  userId: string;
  stories: StoryProof[];
};

interface SocialProps {
  active?: boolean;
}

type SignedProofImageUrl = {
  signedUrl: string;
  expiresAt: number;
};

const PROOF_IMAGE_URL_TTL_SECONDS = 60 * 60;
const PROOF_IMAGE_URL_REFRESH_BUFFER_MS = 5 * 60 * 1000;
const REACTION_REFRESH_DEBOUNCE_MS = 150;

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

function mapReactions(reactions?: ReactionRow[] | null): Reaction[] {
  return (reactions ?? []).map((reaction) => ({
    userId: reaction.user_id,
    emoji: reaction.emoji,
  }));
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

function formatActivityText(
  type: "unlock" | "lock",
  app: string,
  duration: string,
): string {
  const normalizedApp = app.trim();
  const appText =
    normalizedApp && normalizedApp.toLowerCase() !== "apps"
      ? `${normalizedApp} `
      : "";

  return type === "unlock"
    ? `unlocked ${appText}for ${duration}`
    : `locked ${appText}after ${duration}`;
}

function buildReplyTo(
  item: ChatMessage,
  feed: FeedItem[],
  resolveUserName: (userId: string) => string,
  resolveUserColour: (userId: string) => string,
  openMemberOverview: (userId: string) => void,
): ReplyQuoteProps | undefined {
  if (!item.replyToId) return undefined;

  const ref = feed.find((i) => i.id === item.replyToId);
  if (!ref) return undefined;

  let text: string;
  if (ref.kind === "message") {
    text = ref.text;
  } else if (ref.kind === "completed" || ref.kind === "unviewedProof") {
    text = ref.goalTitle;
  } else {
    text = formatActivityText(ref.type, ref.app, ref.duration);
  }

  return {
    userId: ref.userId,
    userName: resolveUserName(ref.userId),
    userColour: resolveUserColour(ref.userId),
    text,
    timestamp: ref.kind !== "activity" ? ref.timestamp : undefined,
    photoUri: ref.kind === "completed" ? ref.photoUri : undefined,
    caption: ref.kind === "completed" ? ref.caption : undefined,
    activityType: ref.kind === "activity" ? ref.type : undefined,
    reason:
      ref.kind === "activity" && ref.type === "unlock"
        ? ref.reason?.trim() || undefined
        : undefined,
    onNamePress: () => openMemberOverview(ref.userId),
  };
}

function buildReplyInfo(item: FeedItem): ReplyInfo {
  let text: string;
  if (item.kind === "message") {
    text = item.text;
  } else if (item.kind === "completed") {
    text = `Completed ${item.goalTitle}`;
  } else if (item.kind === "unviewedProof") {
    text = `Proof ${item.goalTitle}`;
  } else {
    text = formatActivityText(item.type, item.app, item.duration);
  }

  return {
    id: item.id,
    userId: item.userId,
    userName: "Unknown",
    userColour: Colours.secondaryText,
    text,
    reason:
      item.kind === "activity" && item.type === "unlock"
        ? item.reason?.trim() || undefined
        : undefined,
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
  const [selectedStoryOverride, setSelectedStoryOverride] =
    useState<SelectedStoryOverride | null>(null);
  const [selectedStoryUserId, setSelectedStoryUserId] = useState<string | null>(
    null,
  );
  const [selectedStoryInitialIndex, setSelectedStoryInitialIndex] = useState(0);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [userColours, setUserColours] = useState<Record<string, string>>({});
  const [userAvatars, setUserAvatars] = useState<Record<string, string | null>>(
    {},
  );
  const [mentionMembers, setMentionMembers] = useState<MentionMember[]>([]);
  const [overviewUserId, setOverviewUserId] = useState<string | null>(null);
  const [quickProofSheetVisible, setQuickProofSheetVisible] = useState(false);
  const [quickProofTarget, setQuickProofTarget] =
    useState<ProofCameraTarget | null>(null);
  const signedProofImageUrlsRef = useRef(new Map<string, SignedProofImageUrl>());
  const visibleSessionIdsRef = useRef<Set<string>>(new Set());
  const socialMessagesSubscriptionIdRef = useRef(0);
  const reversedFeed = useMemo(() => [...feed].reverse(), [feed]);
  const selectedStoryMember =
    groupMembers.find((member) => member.id === selectedStoryUserId) ??
    (selectedStoryUserId
      ? {
          id: selectedStoryUserId,
          displayName: userNames[selectedStoryUserId] ?? "Unknown",
          avatarUrl: userAvatars[selectedStoryUserId] ?? null,
          colour: userColours[selectedStoryUserId] ?? Colours.secondaryText,
          storyStatus: null,
        }
      : null);
  const selectedStories = selectedStoryUserId
    ? selectedStoryOverride?.userId === selectedStoryUserId
      ? selectedStoryOverride.stories
      : (storiesByUser[selectedStoryUserId] ?? [])
    : [];
  const currentSheetItem = useMemo(() => {
    if (!sheetItem) return null;

    return feed.find((item) => item.id === sheetItem.id) ?? sheetItem;
  }, [feed, sheetItem]);
  const activeReactionEmojis = useMemo(() => {
    if (!currentSheetItem || !user) return [];

    return (currentSheetItem.reactions ?? [])
      .filter((reaction) => reaction.userId === user.id)
      .map((reaction) => reaction.emoji);
  }, [currentSheetItem, user]);

  const resolveUserName = useCallback(
    (userId: string): string => userNames[userId] ?? "Unknown",
    [userNames],
  );

  const resolveUserColour = useCallback(
    (userId: string): string =>
      userColours[userId] ?? Colours.secondaryText,
    [userColours],
  );
  const overviewHint: GroupMemberOverviewHint | undefined = overviewUserId
    ? {
        displayName: resolveUserName(overviewUserId),
        avatarUrl: userAvatars[overviewUserId] ?? null,
        colour: resolveUserColour(overviewUserId),
      }
    : undefined;

  const getSignedProofImageUrl = useCallback(
    async (imagePath: string): Promise<string | null> => {
      const cached = signedProofImageUrlsRef.current.get(imagePath);
      const now = Date.now();

      if (
        cached &&
        cached.expiresAt - PROOF_IMAGE_URL_REFRESH_BUFFER_MS > now
      ) {
        return cached.signedUrl;
      }

      const { data: signedImage, error: signedImageError } =
        await supabase.storage
          .from("proofs")
          .createSignedUrl(imagePath, PROOF_IMAGE_URL_TTL_SECONDS);

      if (signedImageError) {
        console.log("[social] proof image error:", signedImageError.message);
        return cached?.signedUrl ?? null;
      }

      if (!signedImage?.signedUrl) return cached?.signedUrl ?? null;

      signedProofImageUrlsRef.current.set(imagePath, {
        signedUrl: signedImage.signedUrl,
        expiresAt: now + PROOF_IMAGE_URL_TTL_SECONDS * 1000,
      });

      return signedImage.signedUrl;
    },
    [],
  );

  const performRefreshFeed = useCallback(async () => {
    if (!group) {
      setFeed([]);
      setGroupMembers([]);
      setMentionMembers([]);
      setStoriesByUser({});
      setSelectedStoryOverride(null);
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
          const imageUrl = await getSignedProofImageUrl(proof.image_path);

          return {
            proofId: proof.proof_id,
            userId: proof.user_id,
            messageId: proof.message_id,
            goalId: proof.goal_id,
            goalTitle: proof.goal_title,
            caption: proof.caption,
            imagePath: proof.image_path,
            imageUrl,
            submittedAt: proof.submitted_at,
            lateLabel: getProofLateLabel(
              proof.goal_created_at,
              proof.submitted_at,
            ),
            viewedByMe:
              proof.user_id === user?.id ? true : proof.viewed_by_me,
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
    const storyByProofId = new Map(
      signedStories.map((story) => [story.proofId, story]),
    );

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
    const nextUserAvatars: Record<string, string | null> = {};
    const nextGroupMembers: AvatarRowMember[] = [];
    const nextMentionMembers: MentionMember[] = [];
    const groupMemberOrder = new Map<string, number>();

    ((membersData ?? []) as GroupMemberRow[]).forEach((member, index) => {
      const profile = firstRelation(member.profile);
      const displayName =
        profile?.display_name ?? profile?.username ?? "Unknown";
      const username = profile?.username?.trim() ?? null;
      const colour = GROUP_USER_COLOURS[index % GROUP_USER_COLOURS.length];
      groupMemberOrder.set(member.user_id, index);

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

      if (member.user_id !== user?.id && username) {
        nextMentionMembers.push({
          id: member.user_id,
          username,
          displayName,
          avatarUrl: profile?.avatar_url ?? null,
          colour,
        });
      }

      nextUserNames[member.user_id] = displayName;
      nextUserColours[member.user_id] = colour;
      nextUserAvatars[member.user_id] = profile?.avatar_url ?? null;
    });

    nextGroupMembers.sort((a, b) => {
      if (a.id === user?.id && b.id !== user?.id) return 1;
      if (b.id === user?.id && a.id !== user?.id) return -1;

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
      session:screen_sessions(*),
      reactions(
        user_id,
        emoji
      )
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

    const lateLabelByProofId = new Map<string, string | null>();

    const liveItems = await Promise.all(
      rows.map(async (message): Promise<FeedItem | null> => {
        const proof = firstRelation(message.proof);
        const session = firstRelation(message.session);
        const userId = message.sender_id ?? proof?.user_id ?? session?.user_id;
        const reactions = mapReactions(message.reactions);
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
            mentions: coerceMessageMentions(
              message.mention_entities,
              message.body,
            ),
            reactions,
          };
        }

        if (message.kind === "unlock" && session) {
          const actualSeconds =
            session.actual_seconds ?? session.granted_seconds;

          return {
            kind: "activity",
            id: message.id,
            userId,
            type: "unlock",
            sessionId: session.id,
            app: session.app_name ?? "Apps",
            duration: formatDuration(actualSeconds),
            reason: session.reason ?? undefined,
            reactions,
          };
        }

        if (message.kind === "lock") return null;

        if (message.kind !== "proof" || !proof) return null;

        const goal = firstRelation(proof.goal);
        const photoUri = await getSignedProofImageUrl(proof.image_path);
        const goalTitle = goal?.title ?? "Goal";
        const goalIcon = goal?.icon ?? "";
        const lateLabel = getProofLateLabel(
          goal?.created_at,
          proof.submitted_at,
        );
        lateLabelByProofId.set(proof.id, lateLabel);
        const proofFeedBase = {
          id: message.id,
          proofId: proof.id,
          messageId: message.id,
          userId,
          goalId: proof.goal_id,
          goalTitle,
          goalIcon,
          imagePath: proof.image_path,
          photoUri,
          caption: proof.caption,
          submittedAt: proof.submitted_at,
          lateLabel,
          timestamp: formatTimestamp(message.created_at),
          reactions,
        };
        const story = storyByProofId.get(proof.id);

        if (userId !== user?.id && story && !story.viewedByMe) {
          return {
            kind: "unviewedProof",
            ...proofFeedBase,
          };
        }

        return {
          kind: "completed",
          ...proofFeedBase,
        };
      }),
    );

    for (const [storyUserId, stories] of Object.entries(nextStoriesByUser)) {
      nextStoriesByUser[storyUserId] = stories.map((story) => {
        if (story.lateLabel) return story;

        const lateLabel = lateLabelByProofId.get(story.proofId);
        return lateLabel ? { ...story, lateLabel } : story;
      });
    }

    setUserNames(nextUserNames);
    setUserColours(nextUserColours);
    setUserAvatars(nextUserAvatars);
    setGroupMembers(nextGroupMembers);
    setMentionMembers(nextMentionMembers);
    setStoriesByUser(nextStoriesByUser);
    setFeed(liveItems.filter((item): item is FeedItem => item !== null));
  }, [getSignedProofImageUrl, group, user?.id]);

  const latestRefreshFeedRef = useRef(performRefreshFeed);
  const refreshInFlightRef = useRef<Promise<void> | null>(null);
  const refreshQueuedRef = useRef(false);
  const reactionRefreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

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

  const scheduleReactionRefresh = useCallback(() => {
    if (reactionRefreshTimeoutRef.current) {
      clearTimeout(reactionRefreshTimeoutRef.current);
    }

    reactionRefreshTimeoutRef.current = setTimeout(() => {
      reactionRefreshTimeoutRef.current = null;
      void refreshFeed();
    }, REACTION_REFRESH_DEBOUNCE_MS);
  }, [refreshFeed]);

  useEffect(() => {
    return () => {
      if (reactionRefreshTimeoutRef.current) {
        clearTimeout(reactionRefreshTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (active) {
      refreshFeed();
    }
  }, [active, refreshFeed]);

  useEffect(() => {
    if (!active) return;

    const sweepTimeouts: ReturnType<typeof setTimeout>[] = [];
    const sweepNotifications = () => {
      void dismissNonMentionNotificationsAsync();
    };
    const scheduleSweep = (delay: number) => {
      const timeout = setTimeout(sweepNotifications, delay);
      sweepTimeouts.push(timeout);
    };

    sweepNotifications();
    scheduleSweep(250);
    scheduleSweep(1000);

    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        sweepNotifications();
        scheduleSweep(250);
        scheduleSweep(1000);
      }
    });

    const notificationSubscription =
      Notifications.addNotificationReceivedListener((notification) => {
        void dismissNonMentionNotificationAsync(notification);
        scheduleSweep(250);
      });

    return () => {
      appStateSubscription.remove();
      notificationSubscription.remove();
      sweepTimeouts.forEach(clearTimeout);
    };
  }, [active]);

  useEffect(() => {
    visibleSessionIdsRef.current = new Set(
      feed
        .filter(
          (item): item is FeedItem & { kind: "activity"; sessionId: string } =>
            item.kind === "activity" && Boolean(item.sessionId),
        )
        .map((item) => item.sessionId),
    );
  }, [feed]);

  useEffect(() => {
    if (!active || !group) return;

    let isClosed = false;
    const subscriptionId = ++socialMessagesSubscriptionIdRef.current;
    const channel = supabase
      .channel(`social-messages:${group.id}:${subscriptionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `group_id=eq.${group.id}`,
        },
        () => {
          if (isClosed) return;
          void refreshFeed();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reactions",
          filter: `group_id=eq.${group.id}`,
        },
        () => {
          if (isClosed) return;
          scheduleReactionRefresh();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "screen_sessions",
        },
        (payload) => {
          if (isClosed) return;
          const sessionId = (payload.new as Partial<ScreenSessionRow>).id;
          if (!sessionId || visibleSessionIdsRef.current.has(sessionId)) {
            void refreshFeed();
          }
        },
      )
      .subscribe((status) => {
        if (isClosed) return;
        if (status === "CHANNEL_ERROR") {
          console.log("[social] realtime subscription error");
        }
      });

    return () => {
      isClosed = true;
      void supabase.removeChannel(channel);
    };
  }, [active, group, refreshFeed, scheduleReactionRefresh]);

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

  const openMemberOverview = useCallback((userId: string) => {
    Keyboard.dismiss();
    setOverviewUserId(userId);
  }, []);

  const openQuickProofSheet = useCallback(() => {
    Keyboard.dismiss();
    setReplyingTo(null);
    setQuickProofSheetVisible(true);
  }, []);

  const closeQuickProofSheet = useCallback(() => {
    setQuickProofSheetVisible(false);
  }, []);

  const startQuickProofCamera = useCallback((draft: QuickProofGoalDraft) => {
    setQuickProofSheetVisible(false);
    setQuickProofTarget({
      kind: "quick",
      goalName: draft.title,
      goalIcon: draft.icon,
    });
  }, []);

  const closeQuickProofCamera = useCallback(() => {
    setQuickProofTarget(null);
  }, []);

  const handleQuickProofSubmitted = useCallback(() => {
    void refreshFeed();
  }, [refreshFeed]);

  const openStoriesForUserId = useCallback(
    (userId: string) => {
      const stories = storiesByUser[userId] ?? [];
      if (stories.length === 0) return;

      const firstUnseenIndex = stories.findIndex((story) => !story.viewedByMe);
      setSelectedStoryOverride(null);
      setSelectedStoryInitialIndex(
        firstUnseenIndex === -1 ? 0 : firstUnseenIndex,
      );
      setSelectedStoryUserId(userId);
    },
    [storiesByUser],
  );

  const openStoriesForProofCard = useCallback(
    (item: Extract<FeedItem, { kind: "completed" }>) => {
      if (!item.proofId) return;

      const stories = storiesByUser[item.userId] ?? [];
      const storyIndex = stories.findIndex(
        (story) => story.proofId === item.proofId,
      );

      if (storyIndex !== -1) {
        setSelectedStoryOverride({
          userId: item.userId,
          stories: stories.map((story) =>
            story.proofId === item.proofId
              ? { ...story, lateLabel: story.lateLabel ?? item.lateLabel }
              : story,
          ),
        });
        setSelectedStoryInitialIndex(storyIndex);
        setSelectedStoryUserId(item.userId);
        return;
      }

      if (!item.goalId || !item.imagePath || !item.submittedAt) return;

      setSelectedStoryOverride({
        userId: item.userId,
        stories: [
          {
            proofId: item.proofId,
            userId: item.userId,
            messageId: item.messageId ?? item.id,
            goalId: item.goalId,
            goalTitle: item.goalTitle,
            caption: item.caption ?? null,
            imagePath: item.imagePath,
            imageUrl: item.photoUri,
            submittedAt: item.submittedAt,
            lateLabel: item.lateLabel,
            viewedByMe: true,
          },
        ],
      });
      setSelectedStoryInitialIndex(0);
      setSelectedStoryUserId(item.userId);
    },
    [storiesByUser],
  );

  const openStoriesForMember = useCallback(
    (member: AvatarRowMember) => {
      openStoriesForUserId(member.id);
    },
    [openStoriesForUserId],
  );

  const closeStories = useCallback(() => {
    setSelectedStoryOverride(null);
    setSelectedStoryUserId(null);
  }, []);

  const openOverviewFromStories = useCallback(() => {
    if (!selectedStoryUserId) return;

    const userId = selectedStoryUserId;
    closeStories();
    setTimeout(() => {
      openMemberOverview(userId);
    }, 260);
  }, [closeStories, openMemberOverview, selectedStoryUserId]);

  const playNextMemberStories = useCallback(() => {
    if (!selectedStoryUserId) {
      setSelectedStoryUserId(null);
      return;
    }

    const storyMembers = groupMembers.filter((member) =>
      (storiesByUser[member.id] ?? []).some((story) => !story.viewedByMe),
    );
    const currentMemberIndex = storyMembers.findIndex(
      (member) => member.id === selectedStoryUserId,
    );
    const candidateMembers =
      currentMemberIndex === -1
        ? storyMembers
        : storyMembers.slice(currentMemberIndex + 1);
    const nextMember = candidateMembers[0] ?? null;

    if (!nextMember) {
      setSelectedStoryOverride(null);
      setSelectedStoryUserId(null);
      return;
    }

    const nextStories = storiesByUser[nextMember.id] ?? [];
    const firstUnseenIndex = nextStories.findIndex(
      (story) => !story.viewedByMe,
    );
    if (firstUnseenIndex === -1) {
      setSelectedStoryOverride(null);
      setSelectedStoryUserId(null);
      return;
    }

    setSelectedStoryOverride(null);
    setSelectedStoryInitialIndex(firstUnseenIndex);
    setSelectedStoryUserId(nextMember.id);
  }, [groupMembers, selectedStoryUserId, storiesByUser]);

  const handleProofViewed = useCallback((proofId: string) => {
    setFeed((currentFeed) =>
      currentFeed.map((item): FeedItem => {
        if (item.kind !== "unviewedProof" || item.proofId !== proofId) {
          return item;
        }

        return {
          kind: "completed",
          id: item.id,
          proofId: item.proofId,
          messageId: item.messageId,
          userId: item.userId,
          goalId: item.goalId,
          goalTitle: item.goalTitle,
          goalIcon: item.goalIcon,
          imagePath: item.imagePath,
          photoUri: item.photoUri,
          caption: item.caption,
          submittedAt: item.submittedAt,
          lateLabel: item.lateLabel,
          timestamp: item.timestamp,
          reactions: item.reactions,
        };
      }),
    );

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
    Keyboard.dismiss();
    setSheetItem(item);
    setSheetVisible(true);
  }, []);

  const closeSheet = useCallback(() => {
    setSheetVisible(false);
    setSheetItem(null);
  }, []);

  const handleSheetReact = useCallback(
    async (emoji: string) => {
      if (!currentSheetItem || !user || !group) return;

      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const hasReaction = (currentSheetItem.reactions ?? []).some(
        (reaction) => reaction.userId === user.id && reaction.emoji === emoji,
      );

      const mutation = hasReaction
        ? supabase
            .from("reactions")
            .delete()
            .eq("message_id", currentSheetItem.id)
            .eq("user_id", user.id)
            .eq("group_id", group.id)
            .eq("emoji", emoji)
        : supabase.from("reactions").insert({
            message_id: currentSheetItem.id,
            group_id: group.id,
            user_id: user.id,
            emoji,
          });

      const { error } = await mutation;

      if (error) {
        console.log("[social] reaction error:", error.message);
      }

      await refreshFeed();
    },
    [currentSheetItem, group, refreshFeed, user],
  );

  const handleSheetReply = useCallback(() => {
    if (currentSheetItem) {
      setReplyingTo({
        ...buildReplyInfo(currentSheetItem),
        userName: resolveUserName(currentSheetItem.userId),
        userColour: resolveUserColour(currentSheetItem.userId),
      });
    }
  }, [currentSheetItem, resolveUserColour, resolveUserName]);

  const handleSendMessage = useCallback(
    async ({ text, mentions }: MessageSendPayload) => {
      if (!group || !user) {
        throw new Error("Cannot send without an active group and user.");
      }

      const { error } = await supabase.from("messages").insert({
        group_id: group.id,
        sender_id: user.id,
        kind: "text",
        body: text,
        mention_entities: mentions as unknown as Json,
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
            currentUserId={user?.id}
            onDoubleTap={() => handleReply(item)}
            onLongPress={() => handleLongPress(item)}
            onNamePress={() => openMemberOverview(item.userId)}
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
              openMemberOverview,
            )}
            reactions={item.reactions}
            mentions={item.mentions}
            currentUserId={user?.id}
            onDoubleTap={() => handleReply(item)}
            onLongPress={() => handleLongPress(item)}
            onNamePress={() => openMemberOverview(item.userId)}
            onMentionPress={openMemberOverview}
            resolveMentionColour={resolveUserColour}
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
            lateLabel={item.lateLabel}
            timestamp={item.timestamp}
            reactions={item.reactions}
            currentUserId={user?.id}
            onPress={() => openStoriesForProofCard(item)}
            onDoubleTap={() => handleReply(item)}
            onLongPress={() => handleLongPress(item)}
            onNamePress={() => openMemberOverview(item.userId)}
          />
        );
      }

      if (item.kind === "unviewedProof") {
        return (
          <UnviewedProofBar
            name={resolveUserName(item.userId)}
            nameColour={resolveUserColour(item.userId)}
            goalTitle={item.goalTitle}
            goalIcon={item.goalIcon}
            reactions={item.reactions}
            currentUserId={user?.id}
            onPress={() => openStoriesForUserId(item.userId)}
            onDoubleTap={() => handleReply(item)}
            onLongPress={() => handleLongPress(item)}
            onNamePress={() => openMemberOverview(item.userId)}
          />
        );
      }

      return null;
    },
    [
      feed,
      handleReply,
      handleLongPress,
      openMemberOverview,
      openStoriesForProofCard,
      openStoriesForUserId,
      resolveUserColour,
      resolveUserName,
      user?.id,
    ],
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
          onMemberNamePress={(member) => openMemberOverview(member.id)}
          onMemberLongPress={(member) => openMemberOverview(member.id)}
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
            onQuickProofPress={openQuickProofSheet}
            onReplyUserPress={openMemberOverview}
            mentionMembers={mentionMembers}
          />
        </View>
      </KeyboardAvoidingView>
      <LongPressSheet
        visible={sheetVisible}
        item={currentSheetItem}
        userName={currentSheetItem ? resolveUserName(currentSheetItem.userId) : ""}
        userColour={
          currentSheetItem ? resolveUserColour(currentSheetItem.userId) : ""
        }
        activeReactionEmojis={activeReactionEmojis}
        onClose={closeSheet}
        onReact={handleSheetReact}
        onReply={handleSheetReply}
        onUserPress={
          currentSheetItem
            ? () => openMemberOverview(currentSheetItem.userId)
            : undefined
        }
      />
      {selectedStoryMember && (
        <StoryViewer
          visible={selectedStories.length > 0}
          memberName={selectedStoryMember.displayName}
          memberAvatarUrl={selectedStoryMember.avatarUrl}
          memberColour={selectedStoryMember.colour}
          stories={selectedStories}
          initialIndex={selectedStoryInitialIndex}
          onClose={closeStories}
          onComplete={playNextMemberStories}
          onProofViewed={handleProofViewed}
          onMemberPress={openOverviewFromStories}
        />
      )}
      <GroupMemberOverview
        visible={overviewUserId !== null}
        userId={overviewUserId}
        hint={overviewHint}
        onClose={() => setOverviewUserId(null)}
        onProofViewed={handleProofViewed}
      />
      <QuickProofGoalSheet
        visible={quickProofSheetVisible}
        onClose={closeQuickProofSheet}
        onSubmit={startQuickProofCamera}
      />
      <ProofCamera
        visible={quickProofTarget !== null}
        target={quickProofTarget}
        onClose={closeQuickProofCamera}
        onProofSubmitted={handleQuickProofSubmitted}
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
