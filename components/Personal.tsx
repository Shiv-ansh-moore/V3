import { StyleSheet, Text, View, ScrollView } from "react-native";
import React from "react";
import { mockGoals } from "../testData/mockGoals";
import { mockLocks } from "../testData/mockLocks";
import GoalTile from "./GoalTile";
import { Colours } from "../constants/Colours";

export default function Personal() {
  const activeGoals = mockGoals.filter((g) => g.status === "active");
  const doneGoals = mockGoals.filter((g) => g.status === "done");
  const locks = mockLocks;

  return (
    <View>
      <ScrollView>
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
        <Text style={styles.testText}>Done Today</Text>
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({ testText: { color: Colours.text } });
