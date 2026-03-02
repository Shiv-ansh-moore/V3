import { StyleSheet, Text, View } from "react-native";
import React from "react";
import { Colours } from "../constants/Colours";
import { Fonts } from "../constants/Fonts";
import GoalIcon from "./GoalIcon";

interface LockCardProps {
  appName: string;
  appIcon: string;
  timeLimit: number;
  timeUsed: number;
}

function formatTime(minutes: number): string {
  const clamped = Math.max(0, minutes);
  const mins = Math.floor(clamped);
  const secs = Math.round((clamped - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function LockCard({
  appName,
  appIcon,
  timeLimit,
  timeUsed,
}: LockCardProps) {
  const progress = Math.min(1, Math.max(0, timeUsed / timeLimit));
  const remaining = timeLimit - timeUsed;
  const timeDisplay = formatTime(remaining);

  return (
    <View style={styles.container}>
      <View style={styles.iconBox}>
        <GoalIcon name={appIcon} size={35} />
      </View>
      <Text style={styles.appName}>{appName}</Text>
      <Text style={styles.time}>{timeDisplay}</Text>
      <Text style={styles.remaining}>Remaining</Text>
      <View style={styles.progressTrack}>
        <View
          style={[styles.progressFill, { width: `${(1 - progress) * 100}%` }]}
        />
      </View>
      <View style={styles.button}>
        <Text style={styles.buttonText}>LOCK NOW</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colours.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 6,
    marginTop: 8,
  },
  iconBox: {
    width: 40,
    height: 40,
    backgroundColor: Colours.cardHighlight,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  appName: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colours.secondaryText,
  },
  time: {
    fontFamily: Fonts.semiBold,
    fontSize: 32,
    color: Colours.text,
  },
  remaining: {
    fontFamily: Fonts.extraLight,
    fontSize: 10,
    color: Colours.secondaryText,
  },
  progressTrack: {
    height: 5,
    borderRadius: 20,
    backgroundColor: Colours.cardHighlight,
  },
  progressFill: {
    height: 5,
    borderRadius: 20,
    backgroundColor: Colours.brand,
  },
  button: {
    height: 36,
    borderRadius: 10,
    backgroundColor: Colours.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: Colours.text,
  },
});
