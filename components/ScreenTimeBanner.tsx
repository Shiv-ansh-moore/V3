import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colours } from "../constants/Colours";
import { Fonts } from "../constants/Fonts";

export default function ScreenTimeBanner() {
  return (
    <View style={styles.banner}>
      <View style={styles.dot} />
      <Text style={styles.text}>All apps locked · 0m today</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 4,
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
