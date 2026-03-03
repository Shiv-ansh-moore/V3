import { Image, StyleSheet, Text, View } from "react-native";
import React from "react";
import { Colours } from "../constants/Colours";
import { Fonts } from "../constants/Fonts";

interface CompletedCardProps {
  name: string;
  nameColour: string;
  goalTitle: string;
  photoUri: string | null;
}

export default function CompletedCard({
  name,
  nameColour,
  goalTitle,
  photoUri,
}: CompletedCardProps) {
  return (
    <View style={styles.container}>
      <Text style={[styles.name, { color: nameColour }]}>{name}</Text>
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
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colours.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#000000",
    overflow: "hidden",
    padding: 9,
    alignSelf: "flex-start",
    marginTop: 12,
  },
  name: {
    fontFamily: Fonts.medium,
    fontSize: 13,
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
