import { StyleSheet, Text, View } from "react-native";
import React from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { CaretRightIcon } from "phosphor-react-native";
import * as Haptics from "expo-haptics";
import { Colours } from "../../constants/Colours";
import { Fonts } from "../../constants/Fonts";
import GoalIcon from "../personal/GoalIcon";
import ReactionRow from "./ReactionRow";
import type { Reaction } from "../../testData/mockSocial";

interface UnviewedProofBarProps {
  name: string;
  nameColour: string;
  goalTitle: string;
  goalIcon: string;
  reactions?: Reaction[];
  currentUserId?: string;
  onPress?: () => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
  onNamePress?: () => void;
}

export default function UnviewedProofBar({
  name,
  nameColour,
  goalTitle,
  goalIcon,
  reactions,
  currentUserId,
  onPress,
  onDoubleTap,
  onLongPress,
  onNamePress,
}: UnviewedProofBarProps) {
  const longPress = Gesture.LongPress()
    .minDuration(400)
    .onStart(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onLongPress?.();
    })
    .runOnJS(true);

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      onDoubleTap?.();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    })
    .runOnJS(true);

  const singleTap = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd(() => {
      onPress?.();
    })
    .runOnJS(true);

  return (
    <GestureDetector
      gesture={Gesture.Race(longPress, Gesture.Exclusive(doubleTap, singleTap))}
    >
      <View style={styles.outer}>
        <View style={styles.bar}>
          <Text
            style={[styles.name, { color: nameColour }]}
            onPress={onNamePress}
            numberOfLines={1}
          >
            {name}
          </Text>
          <View style={styles.contentRow}>
            <View style={styles.iconBox}>
              <GoalIcon
                name={goalIcon}
                size={22}
                color={Colours.brand}
                weight="fill"
              />
            </View>
            <Text style={styles.title} numberOfLines={1}>
              {goalTitle}
            </Text>
          </View>
          <View style={styles.ctaWrap}>
            <Text style={styles.cta}>Tap to view</Text>
            <View style={styles.ctaIcon}>
              <CaretRightIcon size={12} color={Colours.brand} weight="bold" />
            </View>
          </View>
        </View>
        {reactions && (
          <ReactionRow reactions={reactions} currentUserId={currentUserId} />
        )}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  outer: {
    alignSelf: "stretch",
    marginTop: 7,
  },
  bar: {
    backgroundColor: Colours.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 106, 0, 0.26)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    position: "relative",
  },
  name: {
    alignSelf: "flex-start",
    fontFamily: Fonts.medium,
    fontSize: 12,
    marginBottom: 2,
    maxWidth: "100%",
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 82,
  },
  iconBox: {
    width: 22,
    height: 22,
    alignItems: "flex-start",
    justifyContent: "center",
    marginRight: 7,
  },
  title: {
    flex: 1,
    minWidth: 0,
    color: Colours.text,
    fontFamily: Fonts.medium,
    fontSize: 14,
  },
  ctaWrap: {
    position: "absolute",
    top: 0,
    right: 12,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  cta: {
    color: Colours.brand,
    fontFamily: Fonts.medium,
    fontSize: 12,
    lineHeight: 14,
  },
  ctaIcon: {
    height: 14,
    justifyContent: "center",
    marginLeft: 2,
  },
});
