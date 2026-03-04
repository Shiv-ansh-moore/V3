import { StyleSheet, Text, View } from "react-native";
import React from "react";
import { Fonts } from "../../constants/Fonts";
import { Colours } from "../../constants/Colours";

export interface ReplyQuoteProps {
  userName: string;
  userColour: string;
  text: string;
  timestamp?: string;
}

export default function ReplyQuote({
  userName,
  userColour,
  text,
  timestamp,
}: ReplyQuoteProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.name, { color: userColour }]}>{userName}</Text>
        {timestamp && <Text style={styles.timestamp}>{timestamp}</Text>}
      </View>
      <Text style={styles.text} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colours.cardHighlight,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  name: {
    fontFamily: Fonts.medium,
    fontSize: 12,
  },
  timestamp: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colours.secondaryText,
  },
  text: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colours.secondaryText,
  },
});
