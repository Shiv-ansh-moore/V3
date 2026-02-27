import React from "react";
import { View, Text, Pressable, StyleSheet, Dimensions } from "react-native";
import { Colours } from "../constants/Colours";
import { Fonts } from "../constants/Fonts";

const SCREEN_WIDTH = Dimensions.get("window").width;
const GRID_PADDING = 19;
const GRID_GAP = 12;
const CONTENT_WIDTH = SCREEN_WIDTH - GRID_PADDING * 2;
const HALF_WIDTH = (CONTENT_WIDTH - GRID_GAP) / 2;

interface LockCardProps {
  appName: string;
  appIcon: string;
  timeRemaining: string;
  size: "small" | "large";
}

export default function LockCard({ appName, appIcon, timeRemaining, size }: LockCardProps) {
  return (
    <View style={[styles.card, size === "large" ? styles.large : styles.small]}>
      <View style={styles.header}>
        <View style={styles.appIconContainer}>
          <Text style={styles.appIconEmoji}>{appIcon}</Text>
        </View>
        <Text style={styles.appName}>{appName}</Text>
      </View>
      <Text style={styles.timer}>{timeRemaining}</Text>
      <Text style={styles.remaining}>Remaining</Text>
      <View style={styles.progressTrack}>
        <View style={styles.progressFill} />
      </View>
      <Pressable style={styles.lockButton}>
        <Text style={styles.lockButtonText}>LOCK NOW</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colours.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    height: 205,
    gap: 6,
  },
  small: {
    width: HALF_WIDTH,
  },
  large: {
    width: CONTENT_WIDTH,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  appIconContainer: {
    width: 40,
    height: 40,
    backgroundColor: Colours.cardHighlight,
    borderRadius: 10,
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  appIconEmoji: {
    fontSize: 22,
  },
  appName: {
    color: Colours.secondaryText,
    fontFamily: Fonts.regular,
    fontSize: 12,
  },
  timer: {
    color: Colours.text,
    fontFamily: Fonts.semiBold,
    fontSize: 32,
  },
  remaining: {
    color: Colours.secondaryText,
    fontFamily: Fonts.extraLight,
    fontSize: 10,
  },
  progressTrack: {
    height: 5,
    backgroundColor: Colours.cardHighlight,
    borderRadius: 20,
    overflow: "hidden",
  },
  progressFill: {
    width: "60%",
    height: "100%",
    backgroundColor: Colours.brand,
    borderRadius: 20,
  },
  lockButton: {
    backgroundColor: Colours.brand,
    borderRadius: 10,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginTop: "auto",
  },
  lockButtonText: {
    color: Colours.text,
    fontFamily: Fonts.bold,
    fontSize: 14,
  },
});
