import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colours } from "../../constants/Colours";
import { Fonts } from "../../constants/Fonts";

interface ScreenTimeBannerProps {
  todayUnlockedSeconds: number;
}

function formatTodayMinutes(totalSeconds: number) {
  const minutes = Math.floor(Math.max(0, totalSeconds) / 60);
  return `${minutes}m`;
}

export default function ScreenTimeBanner({
  todayUnlockedSeconds,
}: ScreenTimeBannerProps) {
  return (
    <View>
      <View style={styles.container}>
        <View style={styles.dot} />
        <Text style={styles.text}>
          All apps locked · {formatTodayMinutes(todayUnlockedSeconds)} today
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#34C759",
  },
  text: {
    color: Colours.secondaryText,
    fontFamily: Fonts.medium,
    fontSize: 13,
  },
});
