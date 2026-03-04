import { StyleSheet, TextInput, View, Pressable } from "react-native";
import React, { useState } from "react";
import { PaperPlaneTiltIcon, PlusIcon } from "phosphor-react-native";
import { Colours } from "../../constants/Colours";
import { Fonts } from "../../constants/Fonts";

export default function MessageInput() {
  const [text, setText] = useState("");

  return (
    <View style={styles.container}>
      <Pressable style={styles.plusButton}>
        <PlusIcon size={22} color={Colours.text} weight="bold" />
      </Pressable>

      <TextInput
        style={styles.input}
        placeholder="Write a message..."
        placeholderTextColor={Colours.secondaryText}
        value={text}
        onChangeText={setText}
        multiline
      />

      <Pressable style={styles.sendButton}>
        <PaperPlaneTiltIcon size={18} color={Colours.text} weight="fill" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 19,
    paddingVertical: 8,
    backgroundColor: Colours.background,
    gap: 8,
  },
  plusButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colours.cardHighlight,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    backgroundColor: Colours.card,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: Colours.text,
    maxHeight: 100,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colours.brand,
    alignItems: "center",
    justifyContent: "center",
  },
});
