import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Colours } from "../constants/Colours";
import { Fonts } from "../constants/Fonts";

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
        <Text style={styles.appIcon}>{appIcon}</Text>
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
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#222",
    justifyContent: "space-between",
  },
  small: {
    width: "48%",
  },
  large: {
    width: "100%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  appIcon: {
    fontSize: 20,
  },
  appName: {
    color: Colours.secondaryText,
    fontFamily: Fonts.medium,
    fontSize: 13,
  },
  timer: {
    color: Colours.text,
    fontFamily: Fonts.bold,
    fontSize: 36,
    marginTop: 8,
  },
  remaining: {
    color: Colours.secondaryText,
    fontFamily: Fonts.regular,
    fontSize: 11,
    marginTop: 2,
  },
  progressTrack: {
    height: 6,
    backgroundColor: "#333",
    borderRadius: 3,
    marginTop: 10,
    overflow: "hidden",
  },
  progressFill: {
    width: "60%",
    height: "100%",
    backgroundColor: Colours.brand,
    borderRadius: 3,
  },
  lockButton: {
    backgroundColor: Colours.brand,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 12,
  },
  lockButtonText: {
    color: Colours.text,
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    letterSpacing: 1,
  },
});
