import { Image, StyleSheet, Text, View } from "react-native";
import React from "react";
import { Colours } from "../../constants/Colours";
import { Fonts } from "../../constants/Fonts";
import ReactionRow from "./ReactionRow";
import { Reaction } from "../../testData/mockSocial";

interface CompletedCardProps {
  name: string;
  nameColour: string;
  goalTitle: string;
  photoUri: string | null;
  timestamp: string;
  reactions?: Reaction[];
}

export default function CompletedCard({
  name,
  nameColour,
  goalTitle,
  photoUri,
  timestamp,
  reactions,
}: CompletedCardProps) {
  return (
    <View style={styles.outer}>
      <View style={styles.container}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: nameColour }]}>{name}</Text>
          <Text style={styles.timestamp}>{timestamp}</Text>
        </View>
        <Text style={styles.completed}>Completed</Text>
        <View style={styles.imageWrapper}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.image} />
          ) : (
            <View style={styles.placeholder} />
          )}
        </View>
        <Text style={styles.goalTitle}>{goalTitle}</Text>
      </View>
      {reactions && <ReactionRow reactions={reactions} />}
    </View>
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
});
