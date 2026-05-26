import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { XIcon } from "phosphor-react-native";
import { Colours } from "../constants/Colours";
import { Fonts } from "../constants/Fonts";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { GROUP_USER_COLOURS } from "../lib/groupColours";
import type { Database } from "../lib/database.types";
import GoalIcon from "./personal/GoalIcon";
import StoryViewer, { type StoryProof } from "./social/StoryViewer";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type GroupMemberRow = Database["public"]["Tables"]["group_members"]["Row"] & {
  profile: ProfileRow | ProfileRow[] | null;
};
type GoalRow = Database["public"]["Tables"]["goals"]["Row"];
type ProofRow = Database["public"]["Tables"]["proofs"]["Row"];
type ScreenSessionRow =
  Database["public"]["Tables"]["screen_sessions"]["Row"];

type DashboardProofRow = Pick<
  ProofRow,
  "id" | "user_id" | "submitted_at" | "image_path" | "caption"
> & {
  goal:
    | Pick<
        GoalRow,
        | "id"
        | "user_id"
        | "title"
        | "icon"
        | "status"
        | "archived_at"
        | "deleted_at"
      >
    | Pick<
        GoalRow,
        | "id"
        | "user_id"
        | "title"
        | "icon"
        | "status"
        | "archived_at"
        | "deleted_at"
      >[]
    | null;
};

type DashboardGoal = Pick<GoalRow, "id" | "title" | "icon" | "duration">;
type DashboardGoalRow = DashboardGoal & {
  user_id: string;
};

type DashboardDoneProof = Pick<ProofRow, "id" | "submitted_at"> & {
  goalId: string;
  goalTitle: string;
  goalIcon: string;
  imagePath: string;
  caption: string | null;
};

type DashboardDoneProofItem = DashboardDoneProof & {
  user_id: string;
};

type DashboardSession = Pick<
  ScreenSessionRow,
  "id" | "reason" | "started_at"
> & {
  seconds: number;
};

type DashboardSessionItem = DashboardSession & {
  user_id: string;
};

type DashboardMember = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  colour: string;
  todaySeconds: number;
  doneCount: number;
  leftCount: number;
  activeGoals: DashboardGoal[];
  doneProofs: DashboardDoneProof[];
  sessions: DashboardSession[];
  stories: StoryProof[];
};

interface DashboardProps {
  active?: boolean;
}

const MIN_PROGRESS_SEGMENT = 20;
const REFRESH_INTERVAL_MS = 60 * 1000;

function firstRelation<T>(relation: T | T[] | null): T | null {
  return Array.isArray(relation) ? (relation[0] ?? null) : relation;
}

function getLocalTodayBounds() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
}

function getInitial(displayName: string): string {
  return displayName.trim().charAt(0).toUpperCase() || "?";
}

function formatDuration(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(clamped / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) {
    return remainingMinutes > 0
      ? `${hours}h ${remainingMinutes}m`
      : `${hours}h`;
  }

  if (minutes === 0 && clamped > 0) return "<1m";
  return `${minutes}m`;
}

function formatShortTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getScreenSessionSeconds(
  session: Pick<
    ScreenSessionRow,
    "actual_seconds" | "granted_seconds" | "started_at"
  >,
  nowMs: number,
) {
  if (session.actual_seconds !== null) return session.actual_seconds;

  const startedAtMs = new Date(session.started_at).getTime();
  if (!Number.isFinite(startedAtMs)) return session.granted_seconds;

  const elapsedSeconds = Math.floor((nowMs - startedAtMs) / 1000);
  if (elapsedSeconds < 0) return 0;

  return Math.min(elapsedSeconds, session.granted_seconds);
}

function countByUser(rows: { user_id: string }[]) {
  return rows.reduce<Record<string, number>>((result, row) => {
    result[row.user_id] = (result[row.user_id] ?? 0) + 1;
    return result;
  }, {});
}

function groupByUser<T extends { user_id: string }>(rows: T[]) {
  return rows.reduce<Record<string, T[]>>((result, row) => {
    result[row.user_id] = [...(result[row.user_id] ?? []), row];
    return result;
  }, {});
}

function getProgressWidths(doneCount: number, leftCount: number) {
  const total = doneCount + leftCount;

  if (total === 0) {
    return { doneWidth: 50, leftWidth: 50 };
  }

  if (doneCount === 0) {
    return {
      doneWidth: MIN_PROGRESS_SEGMENT,
      leftWidth: 100 - MIN_PROGRESS_SEGMENT,
    };
  }

  if (leftCount === 0) {
    return {
      doneWidth: 100 - MIN_PROGRESS_SEGMENT,
      leftWidth: MIN_PROGRESS_SEGMENT,
    };
  }

  const rawDoneWidth = (doneCount / total) * 100;
  const doneWidth = Math.min(
    100 - MIN_PROGRESS_SEGMENT,
    Math.max(MIN_PROGRESS_SEGMENT, rawDoneWidth),
  );

  return { doneWidth, leftWidth: 100 - doneWidth };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Could not load dashboard.";
}

function Stat({
  value,
  label,
}: {
  value: string | number;
  label: string;
}) {
  return (
    <View style={styles.stat}>
      <Text
        style={styles.statValue}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
      >
        {value}
      </Text>
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function OverviewPanel({
  totalSeconds,
  memberCount,
  doneCount,
  leftCount,
}: {
  totalSeconds: number;
  memberCount: number;
  doneCount: number;
  leftCount: number;
}) {
  const { doneWidth, leftWidth } = getProgressWidths(doneCount, leftCount);

  return (
    <View style={styles.overviewCard}>
      <View style={styles.overviewHeader}>
        <Text style={styles.blockLabel}>GROUP TODAY</Text>
        <Text style={styles.overviewMeta}>
          {memberCount} member{memberCount === 1 ? "" : "s"}
        </Text>
      </View>
      <Text
        style={styles.summaryTime}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.65}
      >
        {formatDuration(totalSeconds)}
      </Text>
      <Text style={styles.summaryMeta}>Distracting app time</Text>

      <View style={styles.taskHeader}>
        <Text style={styles.taskTitle}>Tasks</Text>
        <Text style={styles.taskMeta}>{doneCount + leftCount} total</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressDone, { width: `${doneWidth}%` }]}>
          <Text
            style={styles.progressText}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.65}
          >
            {doneCount}
          </Text>
        </View>
        <View style={[styles.progressLeft, { width: `${leftWidth}%` }]}>
          <Text
            style={styles.progressText}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.65}
          >
            {leftCount}
          </Text>
        </View>
      </View>
      <View style={styles.taskLegend}>
        <Text style={styles.legendText}>{doneCount} done</Text>
        <Text style={styles.legendText}>{leftCount} left</Text>
      </View>
    </View>
  );
}

function MemberCard({
  member,
  onPress,
}: {
  member: DashboardMember;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.memberCard,
        pressed && styles.memberCardPressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.memberHeader}>
        <View style={[styles.avatarRing, { borderColor: member.colour }]}>
          <View style={styles.avatar}>
            {member.avatarUrl ? (
              <Image
                source={{ uri: member.avatarUrl }}
                style={styles.avatarImage}
                contentFit="cover"
              />
            ) : (
              <Text style={[styles.avatarInitial, { color: member.colour }]}>
                {getInitial(member.displayName)}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.memberTitleBlock}>
          <Text style={styles.memberName} numberOfLines={1}>
            {member.displayName}
          </Text>
          <Text style={styles.memberSubLabel}>Today</Text>
        </View>
      </View>

      <View style={styles.memberPrimaryMetric}>
        <Text
          style={styles.memberTime}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {formatDuration(member.todaySeconds)}
        </Text>
        <Text style={styles.memberMetricLabel} numberOfLines={1}>
          Distracting apps
        </Text>
      </View>

      <View style={styles.memberStatsRow}>
        <Stat value={member.doneCount} label="Done" />
        <Stat value={member.leftCount} label="Left" />
      </View>
    </Pressable>
  );
}

function ProfileAvatar({
  member,
  size,
}: {
  member: DashboardMember;
  size: "large" | "small";
}) {
  const ringStyle = size === "large" ? styles.profileRing : styles.avatarRing;
  const avatarStyle = size === "large" ? styles.profileAvatar : styles.avatar;
  const imageStyle =
    size === "large" ? styles.profileAvatarImage : styles.avatarImage;
  const initialStyle =
    size === "large" ? styles.profileAvatarInitial : styles.avatarInitial;

  return (
    <View style={[ringStyle, { borderColor: member.colour }]}>
      <View style={avatarStyle}>
        {member.avatarUrl ? (
          <Image
            source={{ uri: member.avatarUrl }}
            style={imageStyle}
            contentFit="cover"
          />
        ) : (
          <Text style={[initialStyle, { color: member.colour }]}>
            {getInitial(member.displayName)}
          </Text>
        )}
      </View>
    </View>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <View style={styles.emptyRow}>
      <Text style={styles.emptyRowText}>{text}</Text>
    </View>
  );
}

function GoalOverviewRow({
  icon,
  title,
  meta,
  done,
}: {
  icon: string;
  title: string;
  meta?: string | null;
  done?: boolean;
}) {
  return (
    <View style={styles.goalRow}>
      <View style={styles.goalRowIcon}>
        <GoalIcon
          name={icon}
          size={22}
          color={done ? "#22C55E" : Colours.fadedBrand}
          weight={done ? "fill" : "light"}
        />
      </View>
      <View style={styles.goalRowText}>
        <Text
          style={[styles.goalRowTitle, done && styles.goalRowTitleDone]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {meta ? (
          <Text style={styles.goalRowMeta} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function ReasonRow({ session }: { session: DashboardSession }) {
  return (
    <View style={styles.reasonRow}>
      <View style={styles.reasonMarker} />
      <View style={styles.reasonBody}>
        <Text style={styles.reasonText} numberOfLines={2}>
          {session.reason?.trim() || "Unlocked apps"}
        </Text>
        <Text style={styles.reasonMeta}>
          {formatDuration(session.seconds)} -{" "}
          {formatShortTime(session.started_at)}
        </Text>
      </View>
    </View>
  );
}

function MemberOverview({
  member,
  visible,
  onClose,
  onOpenStories,
}: {
  member: DashboardMember | null;
  visible: boolean;
  onClose: () => void;
  onOpenStories: (member: DashboardMember) => void;
}) {
  if (!member) return null;

  const hasStories = member.stories.length > 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.overviewModal} edges={["top", "bottom"]}>
        <View style={styles.overviewTopBar}>
          <Text style={styles.overviewTitle}>Profile</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <XIcon size={20} color={Colours.text} weight="bold" />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.overviewContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.profileHero}>
            <TouchableOpacity
              activeOpacity={hasStories ? 0.72 : 1}
              disabled={!hasStories}
              onPress={() => onOpenStories(member)}
            >
              <ProfileAvatar member={member} size="large" />
            </TouchableOpacity>
            <Text style={styles.profileName} numberOfLines={1}>
              {member.displayName}
            </Text>
            <Text style={styles.profileMeta}>
              {hasStories ? "Tap photo for proofs" : "No proofs today"}
            </Text>
          </View>

          <View style={styles.profileHeroStats}>
            <View style={styles.profileMainStat}>
              <Text
                style={styles.profileTime}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {formatDuration(member.todaySeconds)}
              </Text>
              <Text style={styles.profileTimeLabel}>Distracting app time</Text>
            </View>
            <View style={styles.profileSideStats}>
              <Stat value={member.doneCount} label="Done" />
              <Stat value={member.leftCount} label="Left" />
            </View>
          </View>

          <View style={styles.overviewSection}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.overviewSectionTitle}>Done today</Text>
              <Text style={styles.overviewSectionMeta}>
                {member.doneProofs.length}
              </Text>
            </View>
            {member.doneProofs.length > 0 ? (
              member.doneProofs.map((proof) => (
                <GoalOverviewRow
                  key={proof.id}
                  icon={proof.goalIcon}
                  title={proof.goalTitle}
                  meta={formatShortTime(proof.submitted_at)}
                  done
                />
              ))
            ) : (
              <EmptyRow text="No completed tasks today." />
            )}
          </View>

          <View style={styles.overviewSection}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.overviewSectionTitle}>Left to do</Text>
              <Text style={styles.overviewSectionMeta}>
                {member.activeGoals.length}
              </Text>
            </View>
            {member.activeGoals.length > 0 ? (
              member.activeGoals.map((goal) => (
                <GoalOverviewRow
                  key={goal.id}
                  icon={goal.icon}
                  title={goal.title}
                  meta={goal.duration}
                />
              ))
            ) : (
              <EmptyRow text="No active tasks left." />
            )}
          </View>

          <View style={styles.overviewSection}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.overviewSectionTitle}>Unlock reasons</Text>
              <Text style={styles.overviewSectionMeta}>
                {member.sessions.length}
              </Text>
            </View>
            {member.sessions.length > 0 ? (
              member.sessions.map((session) => (
                <ReasonRow key={session.id} session={session} />
              ))
            ) : (
              <EmptyRow text="No app unlocks today." />
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export default function Dashboard({ active = true }: DashboardProps) {
  const { group } = useAuth();
  const [members, setMembers] = useState<DashboardMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [storyMemberId, setStoryMemberId] = useState<string | null>(null);

  const groupTodaySeconds = members.reduce(
    (sum, member) => sum + member.todaySeconds,
    0,
  );
  const groupDoneCount = members.reduce(
    (sum, member) => sum + member.doneCount,
    0,
  );
  const groupLeftCount = members.reduce(
    (sum, member) => sum + member.leftCount,
    0,
  );
  const selectedMember =
    members.find((member) => member.id === selectedMemberId) ?? null;
  const storyMember =
    members.find((member) => member.id === storyMemberId) ?? null;

  const closeMemberOverview = useCallback(() => {
    setSelectedMemberId(null);
  }, []);

  const openMemberStories = useCallback((member: DashboardMember) => {
    if (member.stories.length === 0) return;
    setSelectedMemberId(null);
    setTimeout(() => {
      setStoryMemberId(member.id);
    }, 260);
  }, []);

  const closeMemberStories = useCallback(() => {
    setStoryMemberId(null);
  }, []);

  const handleProofViewed = useCallback((proofId: string) => {
    setMembers((currentMembers) =>
      currentMembers.map((member) => ({
        ...member,
        stories: member.stories.map((story) =>
          story.proofId === proofId ? { ...story, viewedByMe: true } : story,
        ),
      })),
    );
  }, []);

  const refreshDashboard = useCallback(async () => {
    if (!group) {
      setMembers([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { start, end } = getLocalTodayBounds();
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

      if (membersError) throw membersError;

      const groupMembers = (membersData ?? []) as GroupMemberRow[];
      const memberIds = groupMembers.map((member) => member.user_id);

      if (memberIds.length === 0) {
        setMembers([]);
        return;
      }

      const [goalsResult, proofsResult, sessionsResult] =
        await Promise.all([
          supabase
            .from("goals")
            .select("id, user_id, title, icon, duration")
            .in("user_id", memberIds)
            .eq("status", "active")
            .is("archived_at", null)
            .is("deleted_at", null),
          supabase
            .from("proofs")
            .select(
              `
            id,
            user_id,
            submitted_at,
            image_path,
            caption,
            goal:goals!inner(
              id,
              user_id,
              title,
              icon,
              status,
              archived_at,
              deleted_at
            )
          `,
            )
            .in("user_id", memberIds)
            .gte("submitted_at", start.toISOString())
            .lt("submitted_at", end.toISOString())
            .eq("goal.status", "done")
            .is("goal.archived_at", null)
            .is("goal.deleted_at", null),
          supabase
            .from("screen_sessions")
            .select(
              "id, user_id, started_at, actual_seconds, granted_seconds, reason",
            )
            .in("user_id", memberIds)
            .gte("started_at", start.toISOString())
            .lt("started_at", end.toISOString()),
        ]);

      if (goalsResult.error) throw goalsResult.error;
      if (proofsResult.error) throw proofsResult.error;
      if (sessionsResult.error) throw sessionsResult.error;

      const activeGoalRows = (goalsResult.data ?? []) as DashboardGoalRow[];
      const activeGoalsByUser = groupByUser(activeGoalRows);
      const leftByUser = countByUser(activeGoalRows);

      const doneProofItems = ((proofsResult.data ?? []) as DashboardProofRow[])
        .map((proof): DashboardDoneProofItem | null => {
          const goal = firstRelation(proof.goal);
          if (
            goal?.status === "done" &&
            goal.archived_at === null &&
            goal.deleted_at === null
          ) {
            return {
              id: proof.id,
              user_id: proof.user_id,
              submitted_at: proof.submitted_at,
              goalId: goal.id,
              goalTitle: goal.title,
              goalIcon: goal.icon,
              imagePath: proof.image_path,
              caption: proof.caption,
            };
          }

          return null;
        })
        .filter((proof): proof is DashboardDoneProofItem => proof !== null);
      const doneProofsByUser = groupByUser(doneProofItems);
      const doneByUser = countByUser(doneProofItems);

      const nowMs = Date.now();
      const sessionItems = (
        (sessionsResult.data ?? []) as (Pick<
          ScreenSessionRow,
          | "id"
          | "user_id"
          | "started_at"
          | "actual_seconds"
          | "granted_seconds"
          | "reason"
        >)[]
      ).map((session): DashboardSessionItem => ({
        id: session.id,
        user_id: session.user_id,
        reason: session.reason,
        started_at: session.started_at,
        seconds: getScreenSessionSeconds(session, nowMs),
      }));
      const sessionsByUser = groupByUser(sessionItems);
      const secondsByUser = sessionItems.reduce<Record<string, number>>(
        (result, session) => {
          result[session.user_id] =
            (result[session.user_id] ?? 0) + session.seconds;
          return result;
        },
        {},
      );

      const signedStories = await Promise.all(
        doneProofItems.map(async (proof): Promise<StoryProof> => {
          const { data: signedImage, error: signedImageError } =
            await supabase.storage
              .from("proofs")
              .createSignedUrl(proof.imagePath, 60 * 60);

          if (signedImageError) {
            console.log(
              "[dashboard] story proof image error:",
              signedImageError.message,
            );
          }

          return {
            proofId: proof.id,
            userId: proof.user_id,
            messageId: null,
            goalId: proof.goalId,
            goalTitle: proof.goalTitle,
            caption: proof.caption,
            imageUrl: signedImage?.signedUrl ?? null,
            submittedAt: proof.submitted_at,
            viewedByMe: false,
          };
        }),
      );
      const storiesByUser = signedStories.reduce<Record<string, StoryProof[]>>(
        (result, story) => {
          result[story.userId] = [...(result[story.userId] ?? []), story];
          return result;
        },
        {},
      );

      setMembers(
        groupMembers.map((member, index) => {
          const profile = firstRelation(member.profile);

          return {
            id: member.user_id,
            displayName:
              profile?.display_name ?? profile?.username ?? "Unknown",
            avatarUrl: profile?.avatar_url ?? null,
            colour: GROUP_USER_COLOURS[index % GROUP_USER_COLOURS.length],
            todaySeconds: secondsByUser[member.user_id] ?? 0,
            doneCount: doneByUser[member.user_id] ?? 0,
            leftCount: leftByUser[member.user_id] ?? 0,
            activeGoals: activeGoalsByUser[member.user_id] ?? [],
            doneProofs: doneProofsByUser[member.user_id] ?? [],
            sessions: sessionsByUser[member.user_id] ?? [],
            stories: storiesByUser[member.user_id] ?? [],
          };
        }),
      );
    } catch (e) {
      console.log("[dashboard] refresh error:", e);
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [group]);

  useEffect(() => {
    if (!group) {
      setMembers([]);
      setError(null);
      setLoading(false);
      setSelectedMemberId(null);
      setStoryMemberId(null);
    }
  }, [group]);

  useEffect(() => {
    if (!active) return;

    void refreshDashboard();
    const intervalId = setInterval(() => {
      void refreshDashboard();
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [active, refreshDashboard]);

  if (!group) {
    return (
      <SafeAreaView
        style={styles.emptyContainer}
        edges={["bottom", "left", "right"]}
      >
        <Text style={styles.emptyTitle}>No group yet</Text>
        <Text style={styles.emptyText}>
          Join a group to see the dashboard.
        </Text>
      </SafeAreaView>
    );
  }

  if (loading && members.length === 0) {
    return (
      <SafeAreaView
        style={styles.emptyContainer}
        edges={["bottom", "left", "right"]}
      >
        <ActivityIndicator color={Colours.brand} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <OverviewPanel
          totalSeconds={groupTodaySeconds}
          memberCount={members.length}
          doneCount={groupDoneCount}
          leftCount={groupLeftCount}
        />

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Members</Text>
          {loading && <ActivityIndicator size="small" color={Colours.brand} />}
        </View>

        <View style={styles.memberGrid}>
          {members.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              onPress={() => setSelectedMemberId(member.id)}
            />
          ))}
        </View>
      </ScrollView>

      <MemberOverview
        visible={selectedMember !== null}
        member={selectedMember}
        onClose={closeMemberOverview}
        onOpenStories={openMemberStories}
      />

      {storyMember ? (
        <StoryViewer
          visible={storyMember.stories.length > 0}
          memberName={storyMember.displayName}
          memberAvatarUrl={storyMember.avatarUrl}
          memberColour={storyMember.colour}
          stories={storyMember.stories}
          initialIndex={0}
          onClose={closeMemberStories}
          onComplete={closeMemberStories}
          onProofViewed={handleProofViewed}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 19,
  },
  content: {
    paddingBottom: 100,
    gap: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: Colours.text,
    fontFamily: Fonts.semiBold,
    fontSize: 18,
    marginBottom: 6,
  },
  emptyText: {
    color: Colours.secondaryText,
    fontFamily: Fonts.regular,
    fontSize: 13,
    textAlign: "center",
  },
  overviewCard: {
    backgroundColor: Colours.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#222222",
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  overviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  blockLabel: {
    color: Colours.secondaryText,
    fontFamily: Fonts.bold,
    fontSize: 10,
  },
  overviewMeta: {
    color: Colours.secondaryText,
    fontFamily: Fonts.medium,
    fontSize: 11,
  },
  summaryTime: {
    color: Colours.text,
    fontFamily: Fonts.extraBold,
    fontSize: 42,
    marginTop: 6,
  },
  summaryMeta: {
    color: Colours.secondaryText,
    fontFamily: Fonts.medium,
    fontSize: 12,
  },
  taskHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    marginBottom: 7,
  },
  taskTitle: {
    color: Colours.text,
    fontFamily: Fonts.semiBold,
    fontSize: 13,
  },
  taskMeta: {
    color: Colours.secondaryText,
    fontFamily: Fonts.regular,
    fontSize: 11,
  },
  progressTrack: {
    height: 28,
    borderRadius: 14,
    overflow: "hidden",
    flexDirection: "row",
    backgroundColor: Colours.cardHighlight,
  },
  progressDone: {
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colours.brand,
    paddingHorizontal: 8,
  },
  progressLeft: {
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colours.cardHighlight,
    paddingHorizontal: 8,
  },
  progressText: {
    color: Colours.text,
    fontFamily: Fonts.bold,
    fontSize: 14,
  },
  taskLegend: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  legendText: {
    color: Colours.secondaryText,
    fontFamily: Fonts.regular,
    fontSize: 11,
  },
  errorBanner: {
    backgroundColor: "rgba(255,90,90,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,90,90,0.32)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    color: "#FF7777",
    fontFamily: Fonts.medium,
    fontSize: 12,
  },
  sectionHeader: {
    minHeight: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: Colours.text,
    fontFamily: Fonts.semiBold,
    fontSize: 15,
  },
  memberGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 12,
    rowGap: 12,
  },
  memberCard: {
    width: "48%",
    minHeight: 148,
    backgroundColor: Colours.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#222222",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  memberCardPressed: {
    borderColor: Colours.fadedBrand,
  },
  memberHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  avatarRing: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colours.cardHighlight,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarInitial: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
  },
  memberTitleBlock: {
    flex: 1,
  },
  memberName: {
    color: Colours.text,
    fontFamily: Fonts.semiBold,
    fontSize: 13,
  },
  memberSubLabel: {
    color: Colours.secondaryText,
    fontFamily: Fonts.regular,
    fontSize: 10,
    marginTop: 1,
  },
  memberPrimaryMetric: {
    marginTop: 12,
  },
  memberTime: {
    color: Colours.text,
    fontFamily: Fonts.bold,
    fontSize: 22,
  },
  memberMetricLabel: {
    color: Colours.secondaryText,
    fontFamily: Fonts.regular,
    fontSize: 10,
    marginTop: 2,
  },
  memberStatsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
  },
  stat: {
    flex: 1,
  },
  statValue: {
    color: Colours.text,
    fontFamily: Fonts.bold,
    fontSize: 18,
  },
  statLabel: {
    color: Colours.secondaryText,
    fontFamily: Fonts.regular,
    fontSize: 10,
    marginTop: 2,
  },
  overviewModal: {
    flex: 1,
    backgroundColor: Colours.background,
  },
  overviewTopBar: {
    minHeight: 52,
    paddingHorizontal: 19,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  overviewTitle: {
    color: Colours.text,
    fontFamily: Fonts.semiBold,
    fontSize: 16,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colours.cardHighlight,
    alignItems: "center",
    justifyContent: "center",
  },
  overviewContent: {
    paddingHorizontal: 19,
    paddingBottom: 36,
    gap: 14,
  },
  profileHero: {
    alignItems: "center",
    paddingTop: 6,
  },
  profileRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: Colours.cardHighlight,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  profileAvatarImage: {
    width: "100%",
    height: "100%",
  },
  profileAvatarInitial: {
    fontFamily: Fonts.bold,
    fontSize: 30,
  },
  profileName: {
    color: Colours.text,
    fontFamily: Fonts.bold,
    fontSize: 24,
    marginTop: 10,
  },
  profileMeta: {
    color: Colours.secondaryText,
    fontFamily: Fonts.medium,
    fontSize: 12,
    marginTop: 2,
  },
  profileHeroStats: {
    backgroundColor: Colours.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#222222",
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  profileMainStat: {
    marginBottom: 14,
  },
  profileTime: {
    color: Colours.text,
    fontFamily: Fonts.extraBold,
    fontSize: 40,
  },
  profileTimeLabel: {
    color: Colours.secondaryText,
    fontFamily: Fonts.medium,
    fontSize: 12,
  },
  profileSideStats: {
    flexDirection: "row",
    gap: 14,
  },
  overviewSection: {
    backgroundColor: Colours.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#222222",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  overviewSectionTitle: {
    color: Colours.text,
    fontFamily: Fonts.semiBold,
    fontSize: 15,
  },
  overviewSectionMeta: {
    color: Colours.secondaryText,
    fontFamily: Fonts.medium,
    fontSize: 12,
  },
  goalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 42,
  },
  goalRowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colours.cardHighlight,
    alignItems: "center",
    justifyContent: "center",
  },
  goalRowText: {
    flex: 1,
    minWidth: 0,
  },
  goalRowTitle: {
    color: Colours.text,
    fontFamily: Fonts.medium,
    fontSize: 13,
  },
  goalRowTitleDone: {
    color: Colours.secondaryText,
    textDecorationLine: "line-through",
  },
  goalRowMeta: {
    color: Colours.secondaryText,
    fontFamily: Fonts.regular,
    fontSize: 11,
    marginTop: 1,
  },
  emptyRow: {
    minHeight: 38,
    borderRadius: 12,
    backgroundColor: Colours.cardHighlight,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  emptyRowText: {
    color: Colours.secondaryText,
    fontFamily: Fonts.regular,
    fontSize: 12,
  },
  reasonRow: {
    flexDirection: "row",
    gap: 10,
  },
  reasonMarker: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colours.brand,
    marginTop: 6,
  },
  reasonBody: {
    flex: 1,
    minWidth: 0,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colours.cardHighlight,
  },
  reasonText: {
    color: Colours.text,
    fontFamily: Fonts.medium,
    fontSize: 13,
    lineHeight: 18,
  },
  reasonMeta: {
    color: Colours.secondaryText,
    fontFamily: Fonts.regular,
    fontSize: 11,
    marginTop: 2,
  },
});
