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
        <GoalIcon name={icon} />
        <Text style={styles.testColour}>done Goal</Text>
      </View>
    );
  }
  return (
    <View>
      <GoalIcon name={icon} />
      <Text style={styles.testColour}>{title}</Text>
      {duration && <Text style={styles.testColour}>{duration}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({ testColour: { color: Colours.text } });
