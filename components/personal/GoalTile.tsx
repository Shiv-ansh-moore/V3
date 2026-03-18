import { Pressable, StyleSheet, Text, View } from "react-native";
import React from "react";
import { CheckCircleIcon } from "phosphor-react-native";
import { Colours } from "../../constants/Colours";
import { Fonts } from "../../constants/Fonts";
import GoalIcon from "./GoalIcon";

interface GoalTileProps {
  icon: string;
  title: string;
  duration?: string;
  status: "active" | "done";
  onPress?: () => void;
}

export default function GoalTile({
  icon,
  title,
  duration,
  status,
  onPress,
}: GoalTileProps) {
  if (status === "done") {
    return (
      <View style={styles.doneTile}>
        <View style={styles.doneIconContainer}>
          <GoalIcon name={icon} size={30} />
        </View>
        <Text style={styles.doneTitle}>{title}</Text>
        <CheckCircleIcon size={20} color="#22C55E" weight="fill" />
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
    >
      <View style={styles.iconContainer}>
        <GoalIcon name={icon} size={40} />
      </View>
      <View style={styles.cameraCircle} />
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
  cameraCircle: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colours.secondaryText,
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
