import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colours } from "../constants/Colours";
import { Fonts } from "../constants/Fonts";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { GROUP_USER_COLOURS } from "../lib/groupColours";
import type { Database } from "../lib/database.types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type GroupMemberRow = Database["public"]["Tables"]["group_members"]["Row"] & {
  profile: ProfileRow | ProfileRow[] | null;
};
type GoalRow = Database["public"]["Tables"]["goals"]["Row"];
type ProofRow = Database["public"]["Tables"]["proofs"]["Row"];
type ScreenSessionRow =
  Database["public"]["Tables"]["screen_sessions"]["Row"];

type DashboardProofRow = Pick<ProofRow, "id" | "user_id" | "submitted_at"> & {
  goal:
    | Pick<GoalRow, "id" | "user_id" | "status" | "archived_at" | "deleted_at">
    | Pick<
        GoalRow,
        "id" | "user_id" | "status" | "archived_at" | "deleted_at"
      >[]
    | null;
};

type DashboardMember = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  colour: string;
  todaySeconds: number;
  doneCount: number;
  leftCount: number;
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

function MemberCard({ member }: { member: DashboardMember }) {
  return (
    <View style={styles.memberCard}>
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
    </View>
  );
}

export default function Dashboard({ active = true }: DashboardProps) {
  const { group } = useAuth();
  const [members, setMembers] = useState<DashboardMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      const [goalsResult, proofsResult, sessionsResult] = await Promise.all([
        supabase
          .from("goals")
          .select("id, user_id")
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
            goal:goals!inner(
              id,
              user_id,
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
          .select("id, user_id, started_at, actual_seconds, granted_seconds")
          .in("user_id", memberIds)
          .gte("started_at", start.toISOString())
          .lt("started_at", end.toISOString()),
      ]);

      if (goalsResult.error) throw goalsResult.error;
      if (proofsResult.error) throw proofsResult.error;
      if (sessionsResult.error) throw sessionsResult.error;

      const leftByUser = countByUser(goalsResult.data ?? []);
      const doneByUser = countByUser(
        ((proofsResult.data ?? []) as DashboardProofRow[]).filter((proof) => {
          const goal = firstRelation(proof.goal);
          return (
            goal?.status === "done" &&
            goal.archived_at === null &&
            goal.deleted_at === null
          );
        }),
      );
      const nowMs = Date.now();
      const secondsByUser = (
        (sessionsResult.data ?? []) as Pick<
          ScreenSessionRow,
          "user_id" | "started_at" | "actual_seconds" | "granted_seconds"
        >[]
      ).reduce<Record<string, number>>((result, session) => {
        result[session.user_id] =
          (result[session.user_id] ?? 0) +
          getScreenSessionSeconds(session, nowMs);
        return result;
      }, {});

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
            <MemberCard key={member.id} member={member} />
          ))}
        </View>
      </ScrollView>
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
});
