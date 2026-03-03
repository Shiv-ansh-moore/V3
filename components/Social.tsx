import { StyleSheet, View } from "react-native";
import React from "react";
import AvatarRow from "./AvatarRow";
import ChatBubbles from "./ChatBubbles";
import MessageInput from "./MessageInput";
import { ScrollView } from "react-native-gesture-handler";
import { Colours } from "../constants/Colours";

export default function Social() {
  return (
    <View style={styles.container}>
      <AvatarRow />
      <ScrollView contentContainerStyle={styles.content}>
        <ChatBubbles />
      </ScrollView>
      <MessageInput />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colours.background,
  },
  content: {
    paddingBottom: 40,
  },
});
