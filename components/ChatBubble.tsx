import { StyleSheet, Text, View, ViewStyle } from "react-native";
import React from "react";
import { Fonts } from "../constants/Fonts";
import { Colours } from "../constants/Colours";

const RADIUS = 10;

export type BubblePosition = "standalone" | "first" | "middle" | "last";

interface ChatBubbleProps {
  name: string;
  nameColour: string;
  text: string;
  position: BubblePosition;
  afterActivity?: boolean;
}

function getBorderRadius(position: BubblePosition): ViewStyle {
  switch (position) {
    case "first":
      return {
        borderTopLeftRadius: RADIUS,
        borderTopRightRadius: RADIUS,
        borderBottomRightRadius: RADIUS,
        borderBottomLeftRadius: 0,
      };
    case "middle":
      return {
        borderTopLeftRadius: 0,
        borderTopRightRadius: RADIUS,
        borderBottomRightRadius: RADIUS,
        borderBottomLeftRadius: 0,
      };
    case "last":
      return {
        borderTopLeftRadius: 0,
        borderTopRightRadius: RADIUS,
        borderBottomRightRadius: RADIUS,
        borderBottomLeftRadius: RADIUS,
      };
    case "standalone":
      return { borderRadius: RADIUS };
  }
}

export default function ChatBubble({
  name,
  nameColour,
  text,
  position,
  afterActivity,
}: ChatBubbleProps) {
  const showName = position === "first" || position === "standalone";
  const isGrouped = position === "middle" || position === "last";

  return (
    <View
      style={[
        styles.bubble,
        getBorderRadius(position),
        afterActivity ? null : isGrouped ? styles.groupedGap : styles.normalGap,
      ]}
    >
      {showName && (
        <Text style={[styles.name, { color: nameColour }]}>{name}</Text>
      )}
      <Text style={styles.message}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    backgroundColor: Colours.card,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: "flex-start",
    maxWidth: "100%",
  },
  normalGap: {
    marginTop: 8,
  },
  groupedGap: {
    marginTop: 2,
  },
  name: {
    fontFamily: Fonts.medium,
    fontSize: 13,
  },
  message: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colours.text,
  },
});
