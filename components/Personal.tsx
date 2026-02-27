import React from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { Colours } from "../constants/Colours";
import { Fonts } from "../constants/Fonts";
import GoalTile from "./GoalTile";
import LockCard from "./LockCard";
import ScreenTimeBanner from "./ScreenTimeBanner";
import { mockGoals } from "../data/mockGoals";
import { mockLocks } from "../data/mockLocks";

export default function Personal() {
  const activeGoals = mockGoals.filter((g) => g.status === "active");
  const doneGoals = mockGoals.filter((g) => g.status === "done");
  const hasLocks = mockLocks.length > 0;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {hasLocks ? (
          <View style={styles.lockRow}>
            {mockLocks.map((lock) => (
              <LockCard
                key={lock.id}
                appName={lock.appName}
                appIcon={lock.appIcon}
                timeRemaining={lock.timeRemaining}
                size={lock.size}
              />
            ))}
          </View>
        ) : (
          <ScreenTimeBanner />
        )}

        <View style={styles.grid}>
          {activeGoals.map((goal) => (
            <GoalTile
              key={goal.id}
              icon={goal.icon}
              title={goal.title}
              duration={goal.duration}
              status={goal.status}
              size={goal.size}
            />
          ))}
        </View>

        {doneGoals.length > 0 && (
          <>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>DONE TODAY</Text>
              <View style={styles.dividerLine} />
            </View>
            <View style={styles.grid}>
              {doneGoals.map((goal) => (
                <GoalTile
                  key={goal.id}
                  icon={goal.icon}
                  title={goal.title}
                  duration={goal.duration}
                  status={goal.status}
                  size={goal.size}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <Pressable style={styles.fab}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 80,
  },
  lockRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#333",
  },
  dividerText: {
    color: Colours.secondaryText,
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    letterSpacing: 1.5,
  },
  fab: {
    position: "absolute",
    bottom: 28,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colours.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  fabText: {
    color: Colours.text,
    fontSize: 30,
    fontFamily: Fonts.regular,
    marginTop: -2,
  },
});
