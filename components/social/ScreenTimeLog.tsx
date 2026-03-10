import { StyleSheet, Text, View } from "react-native";
import React from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import { LockSimpleIcon, LockSimpleOpenIcon } from "phosphor-react-native";
import { Fonts } from "../../constants/Fonts";
import { Colours } from "../../constants/Colours";
import ReactionRow from "./ReactionRow";
import { Reaction } from "../../testData/mockSocial";

interface ScreenTimeLogProps {
  type: "unlock" | "lock";
  name: string;
  nameColour: string;
  app: string;
  duration: string;
  reason?: string;
  totalTime?: string;
  reactions?: Reaction[];
  onDoubleTap?: () => void;
  onLongPress?: () => void;
}

export default function ScreenTimeLog({
  type,
  name,
  nameColour,
  app,
  duration,
  reason,
  totalTime,
  reactions,
  onDoubleTap,
  onLongPress,
}: ScreenTimeLogProps) {
  const isUnlock = type === "unlock";
  const label = isUnlock
    ? `${app} for ${duration}`
    : `${app} after ${duration}`;
  const subtitle = isUnlock && reason ? `"${reason}"` : totalTime;

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
    })
    .runOnJS(true);

  return (
    <GestureDetector gesture={Gesture.Race(longPress, doubleTap)}>
    <View style={styles.container}>
      {isUnlock ? (
        <LockSimpleOpenIcon
          size={20}
          color={Colours.secondaryText}
          weight="fill"
        />
      ) : (
        <LockSimpleIcon size={20} color={Colours.secondaryText} weight="fill" />
      )}
      <Text style={styles.text}>
        <Text style={[styles.name, { color: nameColour }]}>{name}</Text>
        <Text style={styles.desc}>
          {isUnlock ? " unlocked " : " locked "}
          {label}
        </Text>
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {reactions && <ReactionRow reactions={reactions} centred />}
    </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "center",
    alignItems: "center",
    marginTop: 2,
    marginBottom: 2,
  },
  text: {
    textAlign: "center",
    fontSize: 12,
    marginTop: 4,
  },
  name: {
    fontFamily: Fonts.medium,
    fontSize: 12,
  },
  desc: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colours.secondaryText,
  },
  subtitle: {
    fontFamily: Fonts.medium,
    fontSize: 10,
    color: Colours.secondaryText,
    marginTop: 2,
    textAlign: "center",
  },
});
