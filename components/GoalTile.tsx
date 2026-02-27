import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colours } from "../constants/Colours";
import { Fonts } from "../constants/Fonts";

interface GoalTileProps {
  icon: string;
  title: string;
  duration?: string;
  status: "active" | "done";
  size: "small" | "large";
}

export default function GoalTile({ icon, title, duration, status, size }: GoalTileProps) {
  const isDone = status === "done";

  return (
    <View
      style={[
        styles.tile,
        size === "large" ? styles.large : styles.small,
        isDone ? styles.doneTile : styles.activeBorder,
      ]}
    >
      <View style={styles.topRow}>
        <Text style={styles.icon}>{icon}</Text>
        <View style={[styles.checkbox, isDone && styles.checkboxDone]}>
          {isDone && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </View>
      <View style={styles.bottomRow}>
        <Text
          style={[styles.title, isDone && styles.titleDone]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {duration && !isDone && (
          <Text style={styles.duration}>{duration}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: Colours.card,
    borderRadius: 16,
    padding: 16,
    justifyContent: "space-between",
  },
  small: {
    width: "48%",
    aspectRatio: 1,
  },
  large: {
    width: "100%",
    aspectRatio: 2.2,
  },
  activeBorder: {
    borderWidth: 1.5,
    borderColor: Colours.brand,
  },
  doneTile: {
    opacity: 0.45,
    borderWidth: 1,
    borderColor: "#222",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  icon: {
    fontSize: 32,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "#444",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxDone: {
    borderColor: Colours.brand,
    backgroundColor: Colours.brand,
  },
  checkmark: {
    color: Colours.text,
    fontSize: 13,
    fontFamily: Fonts.bold,
  },
  bottomRow: {
    marginTop: "auto",
  },
  title: {
    color: Colours.text,
    fontFamily: Fonts.semiBold,
    fontSize: 15,
  },
  titleDone: {
    textDecorationLine: "line-through",
    color: Colours.secondaryText,
  },
  duration: {
    color: Colours.secondaryText,
    fontFamily: Fonts.regular,
    fontSize: 13,
    marginTop: 4,
  },
});
