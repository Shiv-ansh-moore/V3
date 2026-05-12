import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import React, { useState, useEffect, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
  unlockForDuration,
  relockNow,
  getActiveUnlock,
} from "../modules/screen-time-locks";

type Goal = Omit<Database["public"]["Tables"]["goals"]["Row"], "status"> & {
  status: "active" | "done" | "deleted";
};
type ScreenSession = Database["public"]["Tables"]["screen_sessions"]["Row"];
type PendingScreenSessionLock = {
  sessionId: string;
  actualSeconds: number;
};
type PendingScreenSessionCompletion = {
  sessionId: string;
};

const ACTIVE_SCREEN_SESSION_KEY = "v3.activeScreenSessionId";
const PENDING_SCREEN_SESSION_LOCK_KEY = "v3.pendingScreenSessionLock";
const PENDING_SCREEN_SESSION_COMPLETION_KEY =
  "v3.pendingScreenSessionCompletion";

function clampActualSeconds(actualSeconds: number, grantedSeconds: number) {
  return Math.max(0, Math.min(actualSeconds, Math.max(0, grantedSeconds - 1)));
}

export default function Personal() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showProofCamera, setShowProofCamera] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);
  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null);
  const [proofGoal, setProofGoal] = useState<Goal | null>(null);
  const [unlockEndTime, setUnlockEndTime] = useState<number | null>(null);
  const [unlockSecondsLeft, setUnlockSecondsLeft] = useState(0);
  const [unlockTotalSeconds, setUnlockTotalSeconds] = useState(0);
  const [unlockSessionId, setUnlockSessionId] = useState<string | null>(null);
  const completingSessionIdsRef = useRef<Set<string>>(new Set());

  const activeGoals = goals.filter((g) => g.status === "active");
  const doneGoals = goals.filter((g) => g.status === "done");

  const refreshGoals = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", user.id)
      .is("archived_at", null)
      .is("deleted_at", null)
      .neq("status", "deleted")
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

  const deleteGoal = useCallback(
    async (goal: Goal) => {
      if (!user) return;

      setDeletingGoalId(goal.id);
      const { error } = await supabase
        .from("goals")
        .update({
          status: "deleted",
          deleted_at: new Date().toISOString(),
        })
        .eq("id", goal.id)
        .eq("user_id", user.id);

      if (error) {
        console.log("[goals] delete error:", error.message);
        setDeletingGoalId(null);
        Alert.alert("Could not delete goal", error.message);
        return;
      }

      setGoals((current) => current.filter((item) => item.id !== goal.id));
      setGoalToDelete(null);
      setDeletingGoalId(null);
    },
    [user],
  );

  const confirmDeleteGoal = useCallback(
    (goal: Goal) => {
      setGoalToDelete(goal);
    },
    [],
  );

  const closeDeleteGoalModal = () => {
    if (deletingGoalId) return;
    setGoalToDelete(null);
  };

  const handleConfirmDeleteGoal = () => {
    if (!goalToDelete || deletingGoalId) return;
    deleteGoal(goalToDelete);
  };

  const logCompletedScreenSession = useCallback(
    async (sessionId: string): Promise<boolean> => {
      if (!user) return false;
      if (completingSessionIdsRef.current.has(sessionId)) return true;

      completingSessionIdsRef.current.add(sessionId);

      try {
        const { error } = await supabase.rpc("complete_screen_session", {
          p_session_id: sessionId,
        });

        if (error) throw error;

        await AsyncStorage.multiRemove([
          ACTIVE_SCREEN_SESSION_KEY,
          PENDING_SCREEN_SESSION_COMPLETION_KEY,
        ]);
        return true;
      } catch (e) {
        const pendingCompletion: PendingScreenSessionCompletion = {
          sessionId,
        };
        await AsyncStorage.setItem(
          PENDING_SCREEN_SESSION_COMPLETION_KEY,
          JSON.stringify(pendingCompletion),
        );
        await AsyncStorage.removeItem(ACTIVE_SCREEN_SESSION_KEY);
        console.log("[screen session] timer completion logging failed:", e);
        return false;
      } finally {
        completingSessionIdsRef.current.delete(sessionId);
      }
    },
    [user],
  );

  const flushPendingScreenSessionLock = useCallback(async () => {
    if (!user) return false;

    const pendingJson = await AsyncStorage.getItem(
      PENDING_SCREEN_SESSION_LOCK_KEY,
    );
    if (pendingJson) {
      let pending: PendingScreenSessionLock;
      try {
        pending = JSON.parse(pendingJson) as PendingScreenSessionLock;
      } catch {
        await AsyncStorage.removeItem(PENDING_SCREEN_SESSION_LOCK_KEY);
        return true;
      }

      if (!pending.sessionId || pending.actualSeconds < 0) {
        await AsyncStorage.removeItem(PENDING_SCREEN_SESSION_LOCK_KEY);
        return true;
      }

      const { error } = await supabase.rpc("finish_screen_session", {
        p_session_id: pending.sessionId,
        p_actual_seconds: pending.actualSeconds,
      });

      if (error) {
        console.log("[screen session] pending lock retry failed:", error.message);
        return false;
      }

      await AsyncStorage.multiRemove([
        ACTIVE_SCREEN_SESSION_KEY,
        PENDING_SCREEN_SESSION_LOCK_KEY,
        PENDING_SCREEN_SESSION_COMPLETION_KEY,
      ]);
      setUnlockSessionId((current) =>
        current === pending.sessionId ? null : current,
      );
    }

    const pendingCompletionJson = await AsyncStorage.getItem(
      PENDING_SCREEN_SESSION_COMPLETION_KEY,
    );
    if (!pendingCompletionJson) return true;

    let pendingCompletion: PendingScreenSessionCompletion;
    try {
      pendingCompletion = JSON.parse(
        pendingCompletionJson,
      ) as PendingScreenSessionCompletion;
    } catch {
      await AsyncStorage.removeItem(PENDING_SCREEN_SESSION_COMPLETION_KEY);
      return true;
    }

    if (!pendingCompletion.sessionId) {
      await AsyncStorage.removeItem(PENDING_SCREEN_SESSION_COMPLETION_KEY);
      return true;
    }

    return logCompletedScreenSession(pendingCompletion.sessionId);
  }, [logCompletedScreenSession, user]);

  useEffect(() => {
    let cancelled = false;

    const hydrateActiveUnlock = async () => {
      const pendingFlushComplete = await flushPendingScreenSessionLock();

      const active = getActiveUnlock();
      const storedSessionId = await AsyncStorage.getItem(
        ACTIVE_SCREEN_SESSION_KEY,
      );

      if (cancelled) return;

      if (active) {
        setUnlockEndTime(active.endTime * 1000);
        setUnlockSecondsLeft(
          Math.max(0, Math.ceil(active.endTime - Date.now() / 1000)),
        );
        setUnlockTotalSeconds(active.totalDuration);
        setUnlockSessionId(storedSessionId);
        return;
      }

      if (storedSessionId && pendingFlushComplete) {
        await logCompletedScreenSession(storedSessionId);
        if (cancelled) return;
      } else {
        await AsyncStorage.removeItem(ACTIVE_SCREEN_SESSION_KEY);
      }

      if (cancelled) return;
      setUnlockSessionId(null);
    };

    hydrateActiveUnlock();

    return () => {
      cancelled = true;
    };
  }, [flushPendingScreenSessionLock, logCompletedScreenSession]);

  const handleUnlock = async (minutes: number, reason: string) => {
    if (!user) {
      throw new Error("Cannot unlock apps without an authenticated user.");
    }

    const totalSecs = minutes * 60;
    let nativeUnlocked = false;
    let sessionCreated = false;

    try {
      await unlockForDuration(minutes, reason);
      nativeUnlocked = true;

      const { data, error } = await supabase.rpc("start_screen_session", {
        p_granted_seconds: totalSecs,
        p_reason: reason,
        p_app_name: "Apps",
        p_app_icon: null,
      });

      if (error) throw error;

      const session = data as ScreenSession | null;
      if (!session?.id) {
        throw new Error("Screen session was not created.");
      }

      sessionCreated = true;
      const active = getActiveUnlock();
      try {
        await AsyncStorage.setItem(ACTIVE_SCREEN_SESSION_KEY, session.id);
        await AsyncStorage.multiRemove([
          PENDING_SCREEN_SESSION_LOCK_KEY,
          PENDING_SCREEN_SESSION_COMPLETION_KEY,
        ]);
      } catch (storageError) {
        console.log(
          "[screen session] active session persistence failed:",
          storageError,
        );
      }
      setUnlockSessionId(session.id);
      setUnlockEndTime(
        active ? active.endTime * 1000 : Date.now() + totalSecs * 1000,
      );
      setUnlockSecondsLeft(active?.totalDuration ?? totalSecs);
      setUnlockTotalSeconds(active?.totalDuration ?? totalSecs);
    } catch (e) {
      if (nativeUnlocked && !sessionCreated) {
        try {
          await relockNow();
        } catch (relockError) {
          console.log("[screen session] rollback relock failed:", relockError);
        }
      }

      await AsyncStorage.removeItem(ACTIVE_SCREEN_SESSION_KEY);
      setUnlockSessionId(null);
      setUnlockEndTime(null);
      setUnlockSecondsLeft(0);
      setUnlockTotalSeconds(0);
      console.log("[screen session] unlock logging failed:", e);
      throw e;
    }
  };

  const handleLockNow = async () => {
    const active = getActiveUnlock();
    const storedSessionId =
      unlockSessionId ??
      (await AsyncStorage.getItem(ACTIVE_SCREEN_SESSION_KEY));
    const grantedSeconds = active?.totalDuration ?? unlockTotalSeconds;
    const rawActualSeconds = active
      ? Math.floor(Date.now() / 1000 - active.startTime)
      : unlockTotalSeconds - unlockSecondsLeft;
    const actualSeconds = clampActualSeconds(rawActualSeconds, grantedSeconds);

    try {
      await relockNow();
    } catch (e) {
      console.log("Relock failed:", e);
      return;
    }

    if (active) {
      const mins = Math.floor(actualSeconds / 60);
      const secs = actualSeconds % 60;
      console.log(
        `Apps were unlocked for ${mins}m ${secs}s (reason: ${active.reason})`,
      );
    }

    setUnlockEndTime(null);
    setUnlockSecondsLeft(0);
    setUnlockTotalSeconds(0);
    setUnlockSessionId(null);

    if (!storedSessionId) {
      await AsyncStorage.removeItem(ACTIVE_SCREEN_SESSION_KEY);
      console.log("[screen session] no active session id to finish");
      return;
    }

    const pendingLock: PendingScreenSessionLock = {
      sessionId: storedSessionId,
      actualSeconds,
    };

    try {
      const { error } = await supabase.rpc("finish_screen_session", {
        p_session_id: storedSessionId,
        p_actual_seconds: actualSeconds,
      });

      if (error) throw error;

      await AsyncStorage.multiRemove([
        ACTIVE_SCREEN_SESSION_KEY,
        PENDING_SCREEN_SESSION_LOCK_KEY,
        PENDING_SCREEN_SESSION_COMPLETION_KEY,
      ]);
    } catch (e) {
      await AsyncStorage.removeItem(PENDING_SCREEN_SESSION_COMPLETION_KEY);
      await AsyncStorage.setItem(
        PENDING_SCREEN_SESSION_LOCK_KEY,
        JSON.stringify(pendingLock),
      );
      console.log("[screen session] lock logging failed:", e);
    }
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
        const logExpiredSession = async () => {
          const sessionId =
            unlockSessionId ??
            (await AsyncStorage.getItem(ACTIVE_SCREEN_SESSION_KEY));

          if (!sessionId) {
            await AsyncStorage.removeItem(ACTIVE_SCREEN_SESSION_KEY);
            return;
          }

          await logCompletedScreenSession(sessionId);
        };

        logExpiredSession().catch((error) => {
          console.log("[screen session] timer completion failed:", error);
        });
        setUnlockSessionId(null);
        setUnlockEndTime(null);
        setUnlockTotalSeconds(0);
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [
    logCompletedScreenSession,
    unlockEndTime,
    unlockSessionId,
    unlockTotalSeconds,
  ]);

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
              onLongPress={() => confirmDeleteGoal(item.goal)}
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
              onLongPress={() => confirmDeleteGoal(item.goal)}
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
                onLongPress={() => confirmDeleteGoal(next.goal)}
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
            onLongPress={() => confirmDeleteGoal(first)}
          />
          {second && (
            <GoalTile
              icon={second.icon}
              title={second.title}
              duration={second.duration ?? undefined}
              status={second.status}
              onLongPress={() => confirmDeleteGoal(second)}
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
        goalId={proofGoal?.id ?? null}
        goalName={proofGoal?.title ?? ""}
        goalIcon={proofGoal?.icon ?? ""}
        onClose={() => setShowProofCamera(false)}
        onProofSubmitted={refreshGoals}
      />
      <ProfileSheet
        visible={showProfile}
        onClose={() => setShowProfile(false)}
      />

      <Modal
        visible={goalToDelete !== null}
        transparent
        animationType="slide"
        onRequestClose={closeDeleteGoalModal}
      >
        <Pressable
          style={styles.deleteOverlay}
          onPress={closeDeleteGoalModal}
        >
          <Pressable style={styles.deleteSheet}>
            <Text style={styles.deleteTitle}>Delete goal?</Text>
            <Text style={styles.deleteBody}>
              {goalToDelete
                ? `This removes "${goalToDelete.title}" from your goals.`
                : "This removes the goal from your goals."}
            </Text>
            <View style={styles.deleteActions}>
              <TouchableOpacity
                style={styles.cancelDeleteButton}
                activeOpacity={0.8}
                onPress={closeDeleteGoalModal}
                disabled={!!deletingGoalId}
              >
                <Text style={styles.cancelDeleteText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmDeleteButton,
                  deletingGoalId && styles.deleteButtonDisabled,
                ]}
                activeOpacity={0.8}
                onPress={handleConfirmDeleteGoal}
                disabled={!!deletingGoalId}
              >
                <Text style={styles.confirmDeleteText}>
                  {deletingGoalId ? "Deleting..." : "Delete goal"}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  deleteOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  deleteSheet: {
    backgroundColor: Colours.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 19,
    paddingTop: 18,
    paddingBottom: 34,
  },
  deleteTitle: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: Colours.text,
    marginBottom: 8,
  },
  deleteBody: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: Colours.secondaryText,
    marginBottom: 18,
  },
  deleteActions: {
    flexDirection: "row",
    gap: 10,
  },
  cancelDeleteButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: Colours.cardHighlight,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmDeleteButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: "rgba(255,90,90,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,90,90,0.38)",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  cancelDeleteText: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: Colours.text,
  },
  confirmDeleteText: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: "#FF5A5A",
  },
});
