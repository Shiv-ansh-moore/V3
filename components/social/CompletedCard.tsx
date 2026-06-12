import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import React from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import { Colours } from "../../constants/Colours";
import { Fonts } from "../../constants/Fonts";
import ReactionRow from "./ReactionRow";
import { Reaction } from "../../testData/mockSocial";

interface CompletedCardProps {
  name: string;
  nameColour: string;
  goalTitle: string;
  photoUri: string | null;
  caption?: string | null;
  lateLabel?: string | null;
  timestamp: string;
  reactions?: Reaction[];
  currentUserId?: string;
  onPress?: () => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
  onNamePress?: () => void;
}

export default function CompletedCard({
  name,
  nameColour,
  goalTitle,
  photoUri,
  caption,
  lateLabel,
  timestamp,
  reactions,
  currentUserId,
  onPress,
  onDoubleTap,
  onLongPress,
  onNamePress,
}: CompletedCardProps) {
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
        <View style={styles.container}>
          <View style={styles.nameRow}>
            <Text
              style={[styles.name, { color: nameColour }]}
              onPress={onNamePress}
            >
              {name}
            </Text>
            <Text style={styles.timestamp}>{timestamp}</Text>
          </View>
          <Text style={styles.completed}>Completed</Text>
          <View style={styles.imageWrapper}>
            {photoUri ? (
              <Image
                source={{ uri: photoUri }}
                cachePolicy="memory-disk"
                contentFit="cover"
                style={styles.image}
              />
            ) : (
              <View style={styles.placeholder} />
            )}
            {photoUri && lateLabel ? (
              <View style={styles.lateWatermark}>
                <Text style={styles.lateLabel} numberOfLines={1}>
                  {lateLabel}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.goalTitle}>{goalTitle}</Text>
          {caption ? <Text style={styles.caption}>{caption}</Text> : null}
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
    alignSelf: "flex-start",
    marginTop: 8,
  },
  container: {
    backgroundColor: Colours.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#000000",
    overflow: "hidden",
    padding: 9,
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
  lateWatermark: {
    position: "absolute",
    right: 9,
    bottom: 9,
    minHeight: 17,
    minWidth: 32,
    paddingHorizontal: 5,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "rgba(255, 106, 0, 0.3)",
    backgroundColor: "rgba(255, 106, 0, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.45,
    shadowRadius: 5,
    elevation: 3,
  },
  lateLabel: {
    color: Colours.brand,
    fontFamily: Fonts.medium,
    fontSize: 9,
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.72)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  timestamp: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colours.secondaryText,
  },
  completed: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colours.text,
  },
  imageWrapper: {
    marginTop: 8,
    borderRadius: 15,
    overflow: "hidden",
    width: 184,
    height: 245,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    width: "100%",
    height: "100%",
    backgroundColor: Colours.cardHighlight,
  },
  goalTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    color: Colours.text,
    marginTop: 6,
  },
  caption: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colours.secondaryText,
    marginTop: 1,
    width: 184,
  },
});
