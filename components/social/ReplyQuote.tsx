import { Image, StyleSheet, Text, View } from "react-native";
import React from "react";
import { LockSimpleIcon, LockSimpleOpenIcon } from "phosphor-react-native";
import { Fonts } from "../../constants/Fonts";
import { Colours } from "../../constants/Colours";

export interface ReplyQuoteProps {
  userName: string;
  userColour: string;
  text: string;
  timestamp?: string;
  photoUri?: string | null;
  activityType?: "lock" | "unlock";
}

function TextQuote({ userName, userColour, text, timestamp }: ReplyQuoteProps) {
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

function PhotoQuote({
  userName,
  userColour,
  text,
  timestamp,
  photoUri,
}: ReplyQuoteProps) {
  return (
    <View style={styles.photoContainer}>
      <View style={styles.photoCard}>
        <View style={styles.header}>
          <Text style={[styles.name, { color: userColour }]}>{userName}</Text>
          {timestamp && <Text style={styles.timestamp}>{timestamp}</Text>}
        </View>
        <Text style={styles.goalLabel}>{text}</Text>
        <View style={styles.imageWrapper}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.image} />
          ) : (
            <View style={[styles.image, styles.placeholder]} />
          )}
        </View>
      </View>
    </View>
  );
}

function ActivityQuote({
  userName,
  userColour,
  text,
  activityType,
}: ReplyQuoteProps) {
  return (
    <View style={styles.container}>
      <View style={styles.activityIcon}>
        {activityType === "lock" ? (
          <LockSimpleIcon size={16} color={Colours.secondaryText} weight="fill" />
        ) : (
          <LockSimpleOpenIcon size={16} color={Colours.secondaryText} weight="fill" />
        )}
      </View>
      <Text style={styles.activityLine} numberOfLines={1}>
        <Text style={[styles.name, { color: userColour }]}>{userName} </Text>
        <Text style={styles.text}>{text}</Text>
      </Text>
    </View>
  );
}

export default function ReplyQuote(props: ReplyQuoteProps) {
  if (props.activityType) {
    return <ActivityQuote {...props} />;
  }
  if (props.photoUri !== undefined) {
    return <PhotoQuote {...props} />;
  }
  return <TextQuote {...props} />;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colours.cardHighlight,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 4,
  },
  photoContainer: {
    marginBottom: 4,
  },
  photoCard: {
    backgroundColor: Colours.cardHighlight,
    borderRadius: 12,
    padding: 8,
    overflow: "hidden",
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
  activityIcon: {
    alignSelf: "center",
    marginBottom: 2,
  },
  activityLine: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colours.secondaryText,
  },
  goalLabel: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colours.secondaryText,
    marginTop: 2,
  },
  imageWrapper: {
    marginTop: 6,
    borderRadius: 10,
    overflow: "hidden",
    width: 110,
    height: 146,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    backgroundColor: Colours.card,
  },
});
