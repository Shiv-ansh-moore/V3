import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import {
  SafeAreaProvider,
  SafeAreaView,
} from "react-native-safe-area-context";
import { XIcon } from "phosphor-react-native";
import { Colours } from "../../constants/Colours";
import { Fonts } from "../../constants/Fonts";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/AuthContext";
import { GROUP_USER_COLOURS } from "../../lib/groupColours";
import type { Database } from "../../lib/database.types";
import GoalIcon from "../personal/GoalIcon";
import {
  getGoalOpenAgeLabel,
  getProofLateLabel,
} from "../personal/goalOpenAge";
import StoryViewer, { type StoryProof } from "../social/StoryViewer";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type GroupMemberRow = Database["public"]["Tables"]["group_members"]["Row"] & {
  profile: ProfileRow | ProfileRow[] | null;
};
type GoalRow = Database["public"]["Tables"]["goals"]["Row"];
type ProofRow = Database["public"]["Tables"]["proofs"]["Row"];
type ScreenSessionRow =
  Database["public"]["Tables"]["screen_sessions"]["Row"];

type ProofWithGoal = Pick<
  ProofRow,
  "id" | "user_id" | "submitted_at" | "image_path" | "caption"
> & {
  goal:
    | Pick<
        GoalRow,
        | "id"
        | "title"
        | "icon"
        | "created_at"
        | "status"
        | "archived_at"
        | "deleted_at"
      >
    | Pick<
        GoalRow,
        | "id"
        | "title"
        | "icon"
        | "created_at"
        | "status"
        | "archived_at"
        | "deleted_at"
      >[]
    | null;
};

type OverviewGoal = Pick<
  GoalRow,
  "id" | "title" | "icon" | "duration" | "created_at"
>;
type DeletedGoalRow = Pick<
  GoalRow,
  "id" | "title" | "icon" | "duration" | "deleted_at"
>;
type DeletedGoal = Omit<DeletedGoalRow, "deleted_at"> & {
  deleted_at: string;
};
type DoneProof = Pick<ProofRow, "id" | "submitted_at" | "caption"> & {
  goalId: string;
  goalTitle: string;
  goalIcon: string;
  goalCreatedAt: string;
  imagePath: string;
};
type OverviewSession = Pick<
  ScreenSessionRow,
  "id" | "reason" | "started_at"
> & {
  seconds: number;
};

export type GroupMemberOverviewHint = {
  displayName?: string;
  avatarUrl?: string | null;
  colour?: string;
};

type MemberOverviewData = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  colour: string;
  todaySeconds: number;
  activeGoals: OverviewGoal[];
  deletedGoals: DeletedGoal[];
  doneProofs: DoneProof[];
  sessions: OverviewSession[];
  stories: StoryProof[];
};

interface GroupMemberOverviewProps {
  visible: boolean;
  userId: string | null;
  hint?: GroupMemberOverviewHint;
  onClose: () => void;
  onProofViewed?: (proofId: string) => void;
}

const DELETED_GOAL_VISIBLE_MS = 24 * 60 * 60 * 1000;

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

function Stat({ value, label }: { value: string | number; label: string }) {
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

function ProfileAvatar({
  member,
  highlighted,
}: {
  member: MemberOverviewData;
  highlighted: boolean;
}) {
  return (
    <View
      style={[
        styles.profileRing,
        highlighted
          ? { borderColor: member.colour }
          : styles.profileRingMuted,
      ]}
    >
      <View style={styles.profileAvatar}>
        {member.avatarUrl ? (
          <Image
            source={{ uri: member.avatarUrl }}
            style={styles.profileAvatarImage}
            contentFit="cover"
          />
        ) : (
          <Text style={[styles.profileAvatarInitial, { color: member.colour }]}>
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
  openAgeLabel,
  done,
  deleted,
}: {
  icon: string;
  title: string;
  meta?: string | null;
  openAgeLabel?: string | null;
  done?: boolean;
  deleted?: boolean;
}) {
  let iconColor = Colours.fadedBrand;
  if (done) iconColor = "#22C55E";
  if (deleted) iconColor = "#FF7777";

  return (
    <View style={styles.goalRow}>
      <View style={styles.goalRowIcon}>
        <GoalIcon
          name={icon}
          size={22}
          color={iconColor}
          weight={done ? "fill" : "light"}
        />
      </View>
      <View style={styles.goalRowText}>
        <Text
          style={[
            styles.goalRowTitle,
            done && styles.goalRowTitleDone,
            deleted && styles.goalRowTitleDeleted,
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {meta || openAgeLabel ? (
          <View style={styles.goalRowMetaLine}>
            {meta ? (
              <Text style={styles.goalRowMeta} numberOfLines={1}>
                {meta}
              </Text>
            ) : null}
            {openAgeLabel ? (
              <View style={styles.goalRowOpenAgePill}>
                <Text style={styles.goalRowOpenAge} numberOfLines={1}>
                  {openAgeLabel}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function ReasonRow({ session }: { session: OverviewSession }) {
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

export default function GroupMemberOverview({
  visible,
  userId,
  hint,
  onClose,
  onProofViewed,
}: GroupMemberOverviewProps) {
  const { group } = useAuth();
  const [member, setMember] = useState<MemberOverviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storyData, setStoryData] = useState<MemberOverviewData | null>(null);
  const [storiesVisible, setStoriesVisible] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const loadMemberOverview = useCallback(async () => {
    if (!visible || !group || !userId) return;

    setLoading(true);
    setError(null);

    try {
      const { start, end } = getLocalTodayBounds();
      const deletedCutoff = new Date(
        Date.now() - DELETED_GOAL_VISIBLE_MS,
      ).toISOString();
      const { data: memberRows, error: membersError } = await supabase
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

      const groupMembers = (memberRows ?? []) as GroupMemberRow[];
      const memberIndex = groupMembers.findIndex(
        (item) => item.user_id === userId,
      );
      const groupMember = groupMembers[memberIndex];

      if (!groupMember) {
        throw new Error("This user is not in your group.");
      }

      const profile = firstRelation(groupMember.profile);
      const displayName =
        profile?.display_name ?? profile?.username ?? hint?.displayName ?? "Unknown";
      const avatarUrl = profile?.avatar_url ?? hint?.avatarUrl ?? null;
      const colour =
        hint?.colour ??
        GROUP_USER_COLOURS[Math.max(0, memberIndex) % GROUP_USER_COLOURS.length];

      const [goalsResult, proofsResult, sessionsResult, deletedGoalsResult] =
        await Promise.all([
          supabase
            .from("goals")
            .select("id, title, icon, duration, created_at")
            .eq("user_id", userId)
            .eq("status", "active")
            .is("archived_at", null)
            .is("deleted_at", null)
            .order("created_at", { ascending: true }),
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
              title,
              icon,
              created_at,
              status,
              archived_at,
              deleted_at
            )
          `,
            )
            .eq("user_id", userId)
            .gte("submitted_at", start.toISOString())
            .lt("submitted_at", end.toISOString())
            .eq("goal.status", "done")
            .is("goal.archived_at", null)
            .is("goal.deleted_at", null)
            .order("submitted_at", { ascending: false }),
          supabase
            .from("screen_sessions")
            .select(
              "id, started_at, actual_seconds, granted_seconds, reason",
            )
            .eq("user_id", userId)
            .gte("started_at", start.toISOString())
            .lt("started_at", end.toISOString())
            .order("started_at", { ascending: false }),
          supabase
            .from("goals")
            .select("id, title, icon, duration, deleted_at")
            .eq("user_id", userId)
            .eq("status", "deleted")
            .gte("deleted_at", deletedCutoff)
            .order("deleted_at", { ascending: false }),
        ]);

      if (goalsResult.error) throw goalsResult.error;
      if (proofsResult.error) throw proofsResult.error;
      if (sessionsResult.error) throw sessionsResult.error;
      if (deletedGoalsResult.error) throw deletedGoalsResult.error;

      const doneProofs = ((proofsResult.data ?? []) as ProofWithGoal[])
        .map((proof): DoneProof | null => {
          const goal = firstRelation(proof.goal);
          if (
            goal?.status === "done" &&
            goal.archived_at === null &&
            goal.deleted_at === null
          ) {
            return {
              id: proof.id,
              submitted_at: proof.submitted_at,
              caption: proof.caption,
              goalId: goal.id,
              goalTitle: goal.title,
              goalIcon: goal.icon,
              goalCreatedAt: goal.created_at,
              imagePath: proof.image_path,
            };
          }

          return null;
        })
        .filter((proof): proof is DoneProof => proof !== null);

      const refreshedAtMs = Date.now();
      const sessions = (
        (sessionsResult.data ?? []) as Pick<
          ScreenSessionRow,
          | "id"
          | "started_at"
          | "actual_seconds"
          | "granted_seconds"
          | "reason"
        >[]
      ).map((session): OverviewSession => ({
        id: session.id,
        reason: session.reason,
        started_at: session.started_at,
        seconds: getScreenSessionSeconds(session, refreshedAtMs),
      }));
      const todaySeconds = sessions.reduce(
        (sum, session) => sum + session.seconds,
        0,
      );

      const stories = await Promise.all(
        doneProofs.map(async (proof): Promise<StoryProof> => {
          const { data: signedImage, error: signedImageError } =
            await supabase.storage
              .from("proofs")
              .createSignedUrl(proof.imagePath, 60 * 60);

          if (signedImageError) {
            console.log(
              "[member overview] story proof image error:",
              signedImageError.message,
            );
          }

          return {
            proofId: proof.id,
            userId,
            messageId: null,
            goalId: proof.goalId,
            goalTitle: proof.goalTitle,
            caption: proof.caption,
            imagePath: proof.imagePath,
            imageUrl: signedImage?.signedUrl ?? null,
            submittedAt: proof.submitted_at,
            lateLabel: getProofLateLabel(
              proof.goalCreatedAt,
              proof.submitted_at,
            ),
            viewedByMe: false,
          };
        }),
      );

      setMember({
        id: userId,
        displayName,
        avatarUrl,
        colour,
        todaySeconds,
        activeGoals: (goalsResult.data ?? []) as OverviewGoal[],
        deletedGoals: ((deletedGoalsResult.data ?? []) as DeletedGoalRow[])
          .filter((goal): goal is DeletedGoal => goal.deleted_at !== null),
        doneProofs,
        sessions,
        stories,
      });
      setNowMs(refreshedAtMs);
    } catch (e) {
      console.log("[member overview] load error:", e);
      setError(e instanceof Error ? e.message : "Could not load profile.");
    } finally {
      setLoading(false);
    }
  }, [group, hint?.avatarUrl, hint?.colour, hint?.displayName, userId, visible]);

  useEffect(() => {
    if (!visible) return;
    void loadMemberOverview();
  }, [loadMemberOverview, visible]);

  useEffect(() => {
    if (visible || userId) return;
    setMember(null);
    setError(null);
  }, [userId, visible]);

  useEffect(() => {
    if (!visible || !member?.activeGoals.length) return;

    const intervalId = setInterval(() => {
      setNowMs(Date.now());
    }, 60 * 1000);

    return () => clearInterval(intervalId);
  }, [member?.activeGoals.length, visible]);

  const closeStories = useCallback(() => {
    setStoriesVisible(false);
    setStoryData(null);
  }, []);

  const openStories = useCallback(() => {
    if (!member || member.stories.length === 0) return;
    setStoryData(member);
    onClose();
    setTimeout(() => {
      setStoriesVisible(true);
    }, 260);
  }, [member, onClose]);

  const handleProofViewed = useCallback((proofId: string) => {
    onProofViewed?.(proofId);

    setMember((current) =>
      current
        ? {
            ...current,
            stories: current.stories.map((story) =>
              story.proofId === proofId
                ? { ...story, viewedByMe: true }
                : story,
            ),
          }
        : current,
    );
    setStoryData((current) =>
      current
        ? {
            ...current,
            stories: current.stories.map((story) =>
              story.proofId === proofId
                ? { ...story, viewedByMe: true }
                : story,
            ),
          }
        : current,
    );
  }, [onProofViewed]);

  const activeMember =
    member ??
    (userId
      ? {
          id: userId,
          displayName: hint?.displayName ?? "Unknown",
          avatarUrl: hint?.avatarUrl ?? null,
          colour: hint?.colour ?? Colours.fadedBrand,
          todaySeconds: 0,
          activeGoals: [],
          deletedGoals: [],
          doneProofs: [],
          sessions: [],
          stories: [],
        }
      : null);
  const hasStories = (activeMember?.stories.length ?? 0) > 0;

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={onClose}
      >
        <SafeAreaProvider style={styles.overviewProvider}>
          <SafeAreaView style={styles.overviewModal} edges={["top", "bottom"]}>
            <View style={styles.overviewTopBar}>
              <Text style={styles.overviewTitle}>Profile</Text>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <XIcon size={20} color={Colours.text} weight="bold" />
              </TouchableOpacity>
            </View>

            {loading && !member ? (
              <View style={styles.loadingState}>
                <ActivityIndicator color={Colours.brand} />
              </View>
            ) : activeMember ? (
              <ScrollView
                contentContainerStyle={styles.overviewContent}
                showsVerticalScrollIndicator={false}
              >
                {error ? (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                <View style={styles.profileSummaryRow}>
                  <View style={styles.profileHero}>
                    <TouchableOpacity
                      activeOpacity={hasStories ? 0.72 : 1}
                      disabled={!hasStories}
                      onPress={openStories}
                    >
                      <ProfileAvatar
                        member={activeMember}
                        highlighted={hasStories}
                      />
                    </TouchableOpacity>
                    <Text style={styles.profileName} numberOfLines={1}>
                      {activeMember.displayName}
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
                        {formatDuration(activeMember.todaySeconds)}
                      </Text>
                      <Text style={styles.profileTimeLabel}>
                        Distracting app time
                      </Text>
                    </View>
                    <View style={styles.profileSideStats}>
                      <Stat
                        value={activeMember.doneProofs.length}
                        label="Done"
                      />
                      <Stat
                        value={activeMember.activeGoals.length}
                        label="Left"
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.overviewSection}>
                  <View style={styles.sectionTitleRow}>
                    <Text style={styles.overviewSectionTitle}>Done today</Text>
                    <Text style={styles.overviewSectionMeta}>
                      {activeMember.doneProofs.length}
                    </Text>
                  </View>
                  {activeMember.doneProofs.length > 0 ? (
                    activeMember.doneProofs.map((proof) => (
                      <GoalOverviewRow
                        key={proof.id}
                        icon={proof.goalIcon}
                        title={proof.goalTitle}
                        meta={formatShortTime(proof.submitted_at)}
                        openAgeLabel={getProofLateLabel(
                          proof.goalCreatedAt,
                          proof.submitted_at,
                        )}
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
                      {activeMember.activeGoals.length}
                    </Text>
                  </View>
                  {activeMember.activeGoals.length > 0 ? (
                    activeMember.activeGoals.map((goal) => (
                      <GoalOverviewRow
                        key={goal.id}
                        icon={goal.icon}
                        title={goal.title}
                        meta={goal.duration}
                        openAgeLabel={getGoalOpenAgeLabel(
                          goal.created_at,
                          nowMs,
                        )}
                      />
                    ))
                  ) : (
                    <EmptyRow text="No active tasks left." />
                  )}
                </View>

                <View style={styles.overviewSection}>
                  <View style={styles.sectionTitleRow}>
                    <Text style={styles.overviewSectionTitle}>
                      Unlock reasons
                    </Text>
                    <Text style={styles.overviewSectionMeta}>
                      {activeMember.sessions.length}
                    </Text>
                  </View>
                  {activeMember.sessions.length > 0 ? (
                    activeMember.sessions.map((session) => (
                      <ReasonRow key={session.id} session={session} />
                    ))
                  ) : (
                    <EmptyRow text="No app unlocks today." />
                  )}
                </View>

                <View style={styles.overviewSection}>
                  <View style={styles.sectionTitleRow}>
                    <Text style={styles.overviewSectionTitle}>
                      Deleted last 24h
                    </Text>
                    <Text style={styles.overviewSectionMeta}>
                      {activeMember.deletedGoals.length}
                    </Text>
                  </View>
                  {activeMember.deletedGoals.length > 0 ? (
                    activeMember.deletedGoals.map((goal) => (
                      <GoalOverviewRow
                        key={goal.id}
                        icon={goal.icon}
                        title={goal.title}
                        meta={`Deleted ${formatShortTime(goal.deleted_at)}`}
                        deleted
                      />
                    ))
                  ) : (
                    <EmptyRow text="No deleted goals in the last 24h." />
                  )}
                </View>
              </ScrollView>
            ) : null}
          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>

      {storyData ? (
        <StoryViewer
          visible={storiesVisible && storyData.stories.length > 0}
          memberName={storyData.displayName}
          memberAvatarUrl={storyData.avatarUrl}
          memberColour={storyData.colour}
          stories={storyData.stories}
          initialIndex={0}
          onClose={closeStories}
          onComplete={closeStories}
          onProofViewed={handleProofViewed}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  overviewProvider: {
    flex: 1,
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
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  overviewContent: {
    paddingHorizontal: 19,
    paddingBottom: 36,
    gap: 14,
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
  profileSummaryRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 14,
  },
  profileHero: {
    width: 112,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  profileRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  profileRingMuted: {
    borderColor: "transparent",
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
    fontSize: 18,
    marginTop: 8,
    textAlign: "center",
    width: "100%",
  },
  profileHeroStats: {
    flex: 1,
    minWidth: 0,
    backgroundColor: Colours.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#222222",
    paddingHorizontal: 16,
    paddingVertical: 15,
    justifyContent: "center",
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
  goalRowTitleDeleted: {
    color: Colours.secondaryText,
    textDecorationLine: "line-through",
  },
  goalRowMeta: {
    flexShrink: 1,
    minWidth: 0,
    color: Colours.secondaryText,
    fontFamily: Fonts.regular,
    fontSize: 11,
  },
  goalRowMetaLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 1,
  },
  goalRowOpenAgePill: {
    flexShrink: 0,
    minHeight: 18,
    paddingHorizontal: 6,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "rgba(255, 106, 0, 0.32)",
    backgroundColor: "rgba(255, 106, 0, 0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  goalRowOpenAge: {
    color: Colours.brand,
    fontFamily: Fonts.medium,
    fontSize: 10,
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
