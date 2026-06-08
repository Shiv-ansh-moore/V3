import { Pressable, StyleSheet, Text, View } from "react-native";
import React, { useRef } from "react";
import * as Haptics from "expo-haptics";
import { CheckCircleIcon } from "phosphor-react-native";
import { Colours } from "../../constants/Colours";
import { Fonts } from "../../constants/Fonts";
import GoalIcon from "./GoalIcon";

interface GoalTileProps {
  icon: string;
  title: string;
  duration?: string;
  openAgeLabel?: string | null;
  status: "active" | "done" | "deleted";
  onPress?: () => void;
  onLongPress?: () => void;
}

export default function GoalTile({
  icon,
  title,
  duration,
  openAgeLabel,
  status,
  onPress,
  onLongPress,
}: GoalTileProps) {
  const longPressTriggeredRef = useRef(false);

  const handleLongPress = () => {
    if (!onLongPress) return;

    longPressTriggeredRef.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onLongPress();
  };

  const handlePress = () => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress?.();
  };

  if (status === "deleted") {
    return null;
  }

  if (status === "done") {
    return (
      <Pressable
        onPressIn={() => {
          longPressTriggeredRef.current = false;
        }}
        onLongPress={handleLongPress}
        style={({ pressed }) => [
          styles.doneTile,
          pressed && styles.tilePressed,
        ]}
      >
        <View style={styles.doneIconContainer}>
          <GoalIcon name={icon} size={30} />
        </View>
        <Text style={styles.doneTitle}>{title}</Text>
        <CheckCircleIcon size={20} color="#22C55E" weight="fill" />
      </Pressable>
    );
  }

  return (
    <Pressable
      onPressIn={() => {
        longPressTriggeredRef.current = false;
      }}
      onPress={handlePress}
      onLongPress={handleLongPress}
      style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
    >
      <View style={styles.iconContainer}>
        <GoalIcon name={icon} size={40} />
      </View>
      <View style={styles.cameraStack}>
        <View style={styles.cameraCircle} />
        {openAgeLabel ? (
          <View style={styles.openAgePill}>
            <Text
              style={styles.openAgeLabel}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {openAgeLabel}
            </Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.title}>{title}</Text>
      {duration && <Text style={styles.duration}>{duration}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    height: 120,
    backgroundColor: Colours.card,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "transparent",
    overflow: "hidden",
  },
  iconContainer: {
    position: "absolute",
    top: 16,
    left: 16,
    width: 45,
    height: 45,
    backgroundColor: Colours.cardHighlight,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cameraStack: {
    position: "absolute",
    top: 16,
    right: 7,
    width: 42,
    alignItems: "center",
  },
  cameraCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colours.secondaryText,
  },
  openAgePill: {
    marginTop: 4,
    minHeight: 17,
    minWidth: 32,
    paddingHorizontal: 5,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "rgba(255, 106, 0, 0.32)",
    backgroundColor: "rgba(255, 106, 0, 0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  openAgeLabel: {
    color: Colours.brand,
    fontFamily: Fonts.medium,
    fontSize: 9,
    textAlign: "center",
  },
  title: {
    position: "absolute",
    top: 69,
    left: 16,
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: Colours.text,
  },
  duration: {
    position: "absolute",
    top: 89,
    left: 16,
    fontFamily: Fonts.regular,
    fontSize: 10,
    color: Colours.secondaryText,
  },
  doneTile: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colours.card,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "transparent",
    paddingVertical: 22,
    paddingHorizontal: 16,
    gap: 13,
  },
  doneIconContainer: {
    width: 35,
    height: 35,
    backgroundColor: Colours.cardHighlight,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tilePressed: {
    borderColor: Colours.fadedBrand,
  },
  doneTitle: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colours.secondaryText,
    textDecorationLine: "line-through",
  },
});
