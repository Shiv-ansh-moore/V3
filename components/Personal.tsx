import { StyleSheet, Text, View, ScrollView } from "react-native";
import React from "react";
import { mockGoals, Goal } from "../testData/mockGoals";
import { mockLocks } from "../testData/mockLocks";
import GoalTile from "./GoalTile";
import LockCard from "./LockCard";
import ScreenTimeBanner from "./ScreenTimeBanner";
import { Colours } from "../constants/Colours";
import { Fonts } from "../constants/Fonts";

export default function Personal() {
  const activeGoals = mockGoals.filter((g) => g.status === "active");
  const doneGoals = mockGoals.filter((g) => g.status === "done");

  const buildRows = () => {
    const result: { goal: Goal; size: "small" | "large" }[] = [];
    const length = activeGoals.length;

    if (length % 3 === 0) {
      for (let i = 0; i < activeGoals.length; i++) {
        if ((i + 1) % 3 === 0) {
          result.push({ goal: activeGoals[i], size: "large" });
        } else {
          result.push({ goal: activeGoals[i], size: "small" });
        }
      }
    } else {
      const remainder = length % 3;
      const mainLength = length - 2;

      for (let i = 0; i < mainLength; i++) {
        if ((i + 1) % 3 === 0) {
          result.push({ goal: activeGoals[i], size: "large" });
        } else {
          result.push({ goal: activeGoals[i], size: "small" });
        }
      }
      if (remainder) {
        result.push({ goal: activeGoals[length - 1], size: "small" });
        result.push({ goal: activeGoals[length - 2], size: "small" });
      }
    }
    return result;
  };

  const renderActiveGoals = () => {
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
              duration={item.goal.duration}
              status={item.goal.status}
            />
          </View>
        );
        i++;
      } else {
        const next = items[i + 1];
        elements.push(
          <View key={item.goal.id} style={styles.row}>
            <GoalTile
              icon={item.goal.icon}
              title={item.goal.title}
              duration={item.goal.duration}
              status={item.goal.status}
            />
            {next && (
              <GoalTile
                icon={next.goal.icon}
                title={next.goal.title}
                duration={next.goal.duration}
                status={next.goal.status}
              />
            )}
          </View>
        );
        i += 2;
      }
    }
    return elements;
  };

  const renderLocks = () => {
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
        </View>
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
            duration={first.duration}
            status={first.status}
          />
          {second && (
            <GoalTile
              icon={second.icon}
              title={second.title}
              duration={second.duration}
              status={second.status}
            />
          )}
        </View>
      );
    }
    return elements;
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {renderLocks()}

      <View style={styles.grid}>
        {renderActiveGoals()}
      </View>

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>DONE TODAY</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.grid}>
        {renderDoneGoals()}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 19,
    paddingBottom: 100,
  },
  lockSection: {
    gap: 12,
    marginBottom: 12,
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
    marginVertical: 12,
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
});
