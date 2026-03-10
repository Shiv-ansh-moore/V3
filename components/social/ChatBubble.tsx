import { StyleSheet, Text, View, ViewStyle } from "react-native";
import React from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Fonts } from "../../constants/Fonts";
import { Colours } from "../../constants/Colours";
import ReplyQuote, { ReplyQuoteProps } from "./ReplyQuote";
import ReactionRow from "./ReactionRow";
import { Reaction } from "../../testData/mockSocial";

const RADIUS = 10;

export type BubblePosition = "standalone" | "first" | "middle" | "last";

interface ChatBubbleProps {
  name: string;
  nameColour: string;
  text: string;
  timestamp: string;
  position: BubblePosition;
  afterActivity?: boolean;
  replyTo?: ReplyQuoteProps;
  reactions?: Reaction[];
  onDoubleTap?: () => void;
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
  timestamp,
  position,
  afterActivity,
  replyTo,
  reactions,
  onDoubleTap,
}: ChatBubbleProps) {
  const showName = position === "first" || position === "standalone";
  const isGrouped = position === "middle" || position === "last";

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      onDoubleTap?.();
    })
    .runOnJS(true);

  return (
    <GestureDetector gesture={doubleTap}>
      <View
        style={afterActivity ? null : isGrouped ? styles.groupedGap : styles.normalGap}
      >
        <View
          style={[styles.bubble, getBorderRadius(position)]}
        >
          {showName && (
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: nameColour }]}>{name}</Text>
              <Text style={styles.timestamp}>{timestamp}</Text>
            </View>
          )}
          {replyTo && <ReplyQuote {...replyTo} />}
          <Text style={styles.message}>{text}</Text>
        </View>
        {reactions && <ReactionRow reactions={reactions} />}
      </View>
    </GestureDetector>
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
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  name: {
    fontFamily: Fonts.medium,
    fontSize: 13,
  },
  timestamp: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colours.secondaryText,
  },
  message: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colours.text,
  },
});
