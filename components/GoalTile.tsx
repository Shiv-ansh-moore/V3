import { StyleSheet, Text, View } from "react-native";
import React from "react";
import { Colours } from "../constants/Colours";
import GoalIcon from "./GoalIcon";

interface GoalTileProps {
  icon: string;
  title: string;
  duration?: string;
  status: "active" | "done";
  size: "small" | "large";
}

export default function GoalTile({
  icon,
  title,
  duration,
  status,
  size,
}: GoalTileProps) {
  if (status === "done") {
    return (
      <View>
        <Text style={styles.testColour}>done Goal</Text>
        <GoalIcon name={icon} />
      </View>
    );
  }
  return (
    <View>
      <Text style={styles.testColour}>Active Goal</Text>
      <GoalIcon name={icon} />
    </View>
  );
}

const styles = StyleSheet.create({ testColour: { color: Colours.text } });
