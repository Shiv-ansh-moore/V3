import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import React, { useState, useEffect, useCallback } from "react";
import { mockLocks } from "../testData/mockLocks";
import GoalTile from "./personal/GoalTile";
import LockCard from "./personal/LockCard";
import ScreenTimeBanner from "./personal/ScreenTimeBanner";
import { Colours } from "../constants/Colours";
import { Fonts } from "../constants/Fonts";
import { SafeAreaView } from "react-native-safe-area-context";
import { UserIcon, PlusIcon } from "phosphor-react-native";
import RadialMenu from "./personal/RadialMenu";
import AddGoalSheet from "./personal/AddGoalSheet";
import ProofCamera from "./personal/ProofCamera";
import ProfileSheet from "./personal/ProfileSheet";
import UnlockAppsMVP from "./personal/UnlockAppsMVP";
import UnlockTimerCard from "./personal/UnlockTimerCard";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import type { Database } from "../lib/database.types";
import {
  relockNow,
  getActiveUnlock,
  blockApps,
  removeBlockedApp,
} from "../modules/screen-time-locks";

type Goal = Omit<Database["public"]["Tables"]["goals"]["Row"], "status"> & {
  status: "active" | "done";
};

export default function Personal() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showProofCamera, setShowProofCamera] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [proofGoal, setProofGoal] = useState<Goal | null>(null);
  const [unlockEndTime, setUnlockEndTime] = useState<number | null>(null);
  const [unlockSecondsLeft, setUnlockSecondsLeft] = useState(0);
  const [unlockTotalSeconds, setUnlockTotalSeconds] = useState(0);

  const activeGoals = goals.filter((g) => g.status === "active");
  const doneGoals = goals.filter((g) => g.status === "done");

  const refreshGoals = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", user.id)
      .is("archived_at", null)
      .order("created_at", { ascending: true });
    if (error) {
      console.log("[goals] fetch error:", error.message);
      return;
    }
    setGoals((data ?? []) as Goal[]);
  }, [user]);

  useEffect(() => {
    refreshGoals();
  }, [refreshGoals]);

  useEffect(() => {
    // Test: block Instagram and Snapchat
    blockApps(["com.instagram.android", "com.snapchat.android"]);
    removeBlockedApp("com.snapchat.android");
  }, []);

  useEffect(() => {
    const active = getActiveUnlock();
    if (active) {
      setUnlockEndTime(active.endTime * 1000);
      setUnlockTotalSeconds(active.totalDuration);
    }
  }, []);

  const handleUnlock = (minutes: number, _reason: string) => {
    const totalSecs = minutes * 60;
    setUnlockEndTime(Date.now() + totalSecs * 1000);
    setUnlockSecondsLeft(totalSecs);
    setUnlockTotalSeconds(totalSecs);
  };

  const handleLockNow = async () => {
    const active = getActiveUnlock();
    try {
      await relockNow();
    } catch (e) {
      console.log("Relock failed:", e);
    }
    if (active) {
      const actualSeconds = Math.round(Date.now() / 1000 - active.startTime);
      const mins = Math.floor(actualSeconds / 60);
      const secs = actualSeconds % 60;
      console.log(
        `Apps were unlocked for ${mins}m ${secs}s (reason: ${active.reason})`,
      );
    }
    setUnlockEndTime(null);
    setUnlockSecondsLeft(0);
  };

  useEffect(() => {
    if (!unlockEndTime) return;

    const tick = () => {
      const remaining = Math.max(
        0,
        Math.ceil((unlockEndTime - Date.now()) / 1000),
      );
      setUnlockSecondsLeft(remaining);
      if (remaining <= 0) {
        console.log(
          `Unlock timer expired (full duration: ${unlockTotalSeconds / 60}m)`,
        );
        setUnlockEndTime(null);
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [unlockEndTime]);

  const buildRows = () => {
    const result: { goal: Goal; size: "small" | "large" }[] = [];
    const length = activeGoals.length;

    if (length === 1) {
      result.push({ goal: activeGoals[0], size: "large" });
    } else if (length === 4) {
      result.push({ goal: activeGoals[0], size: "large" });
      result.push({ goal: activeGoals[1], size: "small" });
      result.push({ goal: activeGoals[2], size: "small" });
      result.push({ goal: activeGoals[3], size: "large" });
    } else if (length % 3 === 0) {
      for (let i = 0; i < activeGoals.length; i++) {
        if ((i + 1) % 3 === 0) {
          result.push({ goal: activeGoals[i], size: "large" });
        } else {
          result.push({ goal: activeGoals[i], size: "small" });
        }
      }
    } else {
      const mainLength = length - 2;

      for (let i = 0; i < mainLength; i++) {
        if ((i + 1) % 3 === 0) {
          result.push({ goal: activeGoals[i], size: "large" });
        } else {
          result.push({ goal: activeGoals[i], size: "small" });
        }
      }
      result.push({ goal: activeGoals[length - 2], size: "small" });
      result.push({ goal: activeGoals[length - 1], size: "small" });
    }
    return result;
  };

  const renderActiveGoals = () => {
    if (activeGoals.length === 0) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyCircle}>
            <PlusIcon size={20} weight="bold" color={Colours.fadedBrand} />
          </View>
          <Text style={styles.emptyTitle}>No goals yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap + to add your first goal
          </Text>
        </View>
      );
    }
    const items = buildRows();
    const elements: React.ReactNode[] = [];
    let i = 0;

    while (i < items.length) {
      const item = items[i];
      if (item.size === "large") {
        elements.push(
          <View key={item.goal.id} style={styles.row}>
            <GoalTile
              icon={item.goal.icon}
              title={item.goal.title}
              duration={item.goal.duration ?? undefined}
              status={item.goal.status}
              onPress={() => {
                setProofGoal(item.goal);
                setShowProofCamera(true);
              }}
            />
          </View>,
        );
        i++;
      } else {
        const next = items[i + 1];
        elements.push(
          <View key={item.goal.id} style={styles.row}>
            <GoalTile
              icon={item.goal.icon}
              title={item.goal.title}
              duration={item.goal.duration ?? undefined}
              status={item.goal.status}
              onPress={() => {
                setProofGoal(item.goal);
                setShowProofCamera(true);
              }}
            />
            {next && (
              <GoalTile
                icon={next.goal.icon}
                title={next.goal.title}
                duration={next.goal.duration ?? undefined}
                status={next.goal.status}
                onPress={() => {
                  setProofGoal(next.goal);
                  setShowProofCamera(true);
                }}
              />
            )}
          </View>,
        );
        i += 2;
      }
    }
    return elements;
  };

  const renderLocks = () => {
    if (unlockEndTime) {
      return (
        <View style={styles.lockSection}>
          <View style={styles.row}>
            <UnlockTimerCard
              secondsLeft={unlockSecondsLeft}
              totalSeconds={unlockTotalSeconds}
              onLockNow={handleLockNow}
            />
          </View>
        </View>
      );
    }

    if (mockLocks.length === 0) {
      return <ScreenTimeBanner />;
    }

    const elements: React.ReactNode[] = [];
    for (let i = 0; i < mockLocks.length; i += 2) {
      const first = mockLocks[i];
      const second = mockLocks[i + 1];
      elements.push(
        <View key={first.id} style={styles.row}>
          <LockCard
            appName={first.appName}
            appIcon={first.appIcon}
            timeLimit={first.timeLimit}
            timeUsed={first.timeUsed}
          />
          {second && (
            <LockCard
              appName={second.appName}
              appIcon={second.appIcon}
              timeLimit={second.timeLimit}
              timeUsed={second.timeUsed}
            />
          )}
        </View>,
      );
    }
    return <View style={styles.lockSection}>{elements}</View>;
  };

  const renderDoneGoals = () => {
    const elements: React.ReactNode[] = [];
    for (let i = 0; i < doneGoals.length; i += 2) {
      const first = doneGoals[i];
      const second = doneGoals[i + 1];
      elements.push(
        <View key={first.id} style={styles.row}>
          <GoalTile
            icon={first.icon}
            title={first.title}
            duration={first.duration ?? undefined}
            status={first.status}
          />
          {second && (
            <GoalTile
              icon={second.icon}
              title={second.title}
              duration={second.duration ?? undefined}
              status={second.status}
            />
          )}
        </View>,
      );
    }
    return elements;
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {renderLocks()}
        <View style={styles.grid}>{renderActiveGoals()}</View>
        {doneGoals.length > 0 && (
          <>
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>DONE TODAY</Text>
              <View style={styles.dividerLine} />
            </View>
            <View style={styles.grid}>{renderDoneGoals()}</View>
          </>
        )}
        {!unlockEndTime && (
          <View style={styles.unlockSection}>
            <UnlockAppsMVP onUnlock={handleUnlock} />
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.profileButton}
        activeOpacity={0.7}
        onPress={() => setShowProfile(true)}
      >
        <UserIcon size={20} weight="bold" color={Colours.secondaryText} />
      </TouchableOpacity>

      <RadialMenu onNewPress={() => setShowAddGoal(true)} />
      <AddGoalSheet
        visible={showAddGoal}
        onClose={() => setShowAddGoal(false)}
        onGoalCreated={refreshGoals}
      />
      <ProofCamera
        visible={showProofCamera}
        goalName={proofGoal?.title ?? ""}
        goalIcon={proofGoal?.icon ?? ""}
        onClose={() => setShowProofCamera(false)}
      />
      <ProfileSheet
        visible={showProfile}
        onClose={() => setShowProfile(false)}
      />
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
  },
  lockSection: {
    gap: 12,
    marginBottom: 20,
  },
  grid: {
    gap: 12,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginVertical: 24,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 36,
    gap: 6,
  },
  emptyCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: Colours.fadedBrand,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: Colours.text,
  },
  emptySubtitle: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colours.secondaryText,
  },
  unlockSection: {
    marginTop: 24,
  },
  dividerLine: {
    flex: 1,
    height: 2,
    backgroundColor: Colours.card,
  },
  dividerText: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: Colours.secondaryText,
  },
  profileButton: {
    position: "absolute",
    bottom: 46,
    left: 19,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colours.cardHighlight,
    alignItems: "center",
    justifyContent: "center",
  },
});
