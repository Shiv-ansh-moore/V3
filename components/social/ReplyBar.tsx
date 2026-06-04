import { StyleSheet, Text, View, Pressable } from "react-native";
import React from "react";
import { XIcon } from "phosphor-react-native";
import { Fonts } from "../../constants/Fonts";
import { Colours } from "../../constants/Colours";

interface ReplyBarProps {
  userName: string;
  userColour: string;
  text: string;
  reason?: string;
  onDismiss: () => void;
  onNamePress?: () => void;
}

export default function ReplyBar({
  userName,
  userColour,
  text,
  reason,
  onDismiss,
  onNamePress,
}: ReplyBarProps) {
  return (
    <View style={styles.container}>
      <View style={[styles.accentBar, { backgroundColor: userColour }]} />
      <View style={styles.content}>
        <Text style={[styles.name, { color: userColour }]} onPress={onNamePress}>
          {userName}
        </Text>
        <Text style={styles.text} numberOfLines={1}>
          {text}
        </Text>
        {reason ? (
          <Text style={styles.reason} numberOfLines={2}>
            &quot;{reason}&quot;
          </Text>
        ) : null}
      </View>
      <Pressable onPress={onDismiss} hitSlop={8} style={styles.dismissButton}>
        <XIcon size={18} color={Colours.secondaryText} weight="bold" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colours.card,
    borderRadius: 12,
    marginHorizontal: 19,
    marginBottom: 4,
    overflow: "hidden",
  },
  accentBar: {
    width: 4,
    alignSelf: "stretch",
  },
  content: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  name: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
  },
  text: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colours.secondaryText,
    marginTop: 1,
  },
  reason: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: Colours.secondaryText,
    marginTop: 2,
  },
  dismissButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
