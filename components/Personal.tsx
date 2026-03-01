import { StyleSheet, Text, View, ScrollView } from "react-native";
import React from "react";
import { mockGoals, Goal } from "../testData/mockGoals";
import GoalTile from "./GoalTile";
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

  return (
    <ScrollView>
      {activeGoals.map((goal) => (
        <GoalTile
          key={goal.id}
          icon={goal.icon}
          title={goal.title}
          duration={goal.duration}
          status={goal.status}
        />
      ))}
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>DONE TODAY</Text>
        <View style={styles.dividerLine} />
      </View>

      <View>
        {doneGoals.map((goal) => (
          <GoalTile
            key={goal.id}
            icon={goal.icon}
            title={goal.title}
            duration={goal.duration}
            status={goal.status}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
