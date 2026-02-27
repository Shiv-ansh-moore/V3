import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { Colours } from "../constants/Colours";
import { Fonts } from "../constants/Fonts";

const SCREEN_WIDTH = Dimensions.get("window").width;
const GRID_PADDING = 19;
const GRID_GAP = 12;
const CONTENT_WIDTH = SCREEN_WIDTH - GRID_PADDING * 2;
const HALF_WIDTH = (CONTENT_WIDTH - GRID_GAP) / 2;

interface GoalTileProps {
  icon: string;
  title: string;
  duration?: string;
  status: "active" | "done";
  size: "small" | "large";
}

export default function GoalTile({ icon, title, duration, status, size }: GoalTileProps) {
  if (status === "done") {
    return (
      <View style={styles.doneTile}>
        <View style={styles.doneIconContainer}>
          <Text style={styles.doneIconText}>{icon}</Text>
        </View>
        <Text style={styles.doneTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.checkmarkOuter}>
          <View style={styles.checkmarkCircle}>
            <Text style={styles.checkmarkIcon}>✓</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.tile, size === "large" ? styles.large : styles.small]}>
      <View style={styles.topRow}>
        <View style={styles.iconContainer}>
          <Text style={styles.iconText}>{icon}</Text>
        </View>
        <View style={styles.checkboxOuter}>
          <View style={styles.checkboxCircle} />
        </View>
      </View>
      <View>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {duration && <Text style={styles.duration}>{duration}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: Colours.card,
    borderRadius: 20,
    padding: 16,
    height: 120,
    justifyContent: "space-between",
  },
  small: {
    width: HALF_WIDTH,
  },
  large: {
    width: CONTENT_WIDTH,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  iconContainer: {
    width: 45,
    height: 45,
    backgroundColor: Colours.cardHighlight,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    fontSize: 28,
  },
  checkboxOuter: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colours.cardHighlight,
  },
  title: {
    color: Colours.text,
    fontFamily: Fonts.medium,
    fontSize: 14,
  },
  duration: {
    color: Colours.secondaryText,
    fontFamily: Fonts.regular,
    fontSize: 10,
    marginTop: 2,
  },
  doneTile: {
    backgroundColor: Colours.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 22,
    width: HALF_WIDTH,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },
  doneIconContainer: {
    width: 35,
    height: 35,
    backgroundColor: Colours.cardHighlight,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  doneIconText: {
    fontSize: 20,
  },
  doneTitle: {
    flex: 1,
    color: Colours.secondaryText,
    fontFamily: Fonts.regular,
    fontSize: 12,
  },
  checkmarkOuter: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  checkmarkCircle: {
    width: 18.3,
    height: 18.3,
    borderRadius: 9.15,
    borderWidth: 2,
    borderColor: Colours.fadedBrand,
    alignItems: "center",
    justifyContent: "center",
  },
  checkmarkIcon: {
    color: Colours.fadedBrand,
    fontSize: 10,
    fontFamily: Fonts.bold,
  },
});
