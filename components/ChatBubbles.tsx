import { StyleSheet, Text, View } from "react-native";
import React from "react";
import { Fonts } from "../constants/Fonts";
import { Colours } from "../constants/Colours";
import {
  ChatMessage,
  socialFeed,
  socialUsers,
} from "../testData/mockSocial";

const RADIUS = 10;

type Position = "standalone" | "first" | "middle" | "last";

function getPosition(
  messages: ChatMessage[],
  index: number,
): Position {
  const current = messages[index];
  const prev = messages[index - 1];
  const next = messages[index + 1];

  const sameAsPrev = prev?.userId === current.userId;
  const sameAsNext = next?.userId === current.userId;

  if (sameAsPrev && sameAsNext) return "middle";
  if (sameAsPrev) return "last";
  if (sameAsNext) return "first";
  return "standalone";
}

function getBorderRadius(position: Position) {
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

function getUserColour(userId: string): string {
  return (
    socialUsers.find((u) => u.id === userId)?.color ?? Colours.secondaryText
  );
}

const messages = socialFeed.filter(
  (item): item is ChatMessage => item.kind === "message",
);

export default function ChatBubbles() {
  return (
    <View style={styles.container}>
      {messages.map((msg, index) => {
        const position = getPosition(messages, index);
        const showName = position === "first" || position === "standalone";
        const isGrouped = position !== "first" && position !== "standalone";

        return (
          <View
            key={msg.id}
            style={[
              styles.bubble,
              getBorderRadius(position),
              isGrouped ? styles.groupedGap : styles.normalGap,
            ]}
          >
            {showName && (
              <Text style={[styles.name, { color: getUserColour(msg.userId) }]}>
                {socialUsers.find((u) => u.id === msg.userId)?.name}
              </Text>
            )}
            <Text style={styles.message}>{msg.text}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 19,
  },
  bubble: {
    backgroundColor: Colours.card,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: "flex-start",
    maxWidth: "100%",
  },
  normalGap: {
    marginTop: 12,
  },
  groupedGap: {
    marginTop: 4,
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
