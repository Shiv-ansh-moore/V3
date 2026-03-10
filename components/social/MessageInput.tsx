import { StyleSheet, TextInput, View, Pressable } from "react-native";
import React from "react";
import { PaperPlaneTiltIcon, PlusIcon } from "phosphor-react-native";
import { Colours } from "../../constants/Colours";
import { Fonts } from "../../constants/Fonts";
import ReplyBar from "./ReplyBar";

export interface ReplyInfo {
  userName: string;
  userColour: string;
  text: string;
}

interface MessageInputProps {
  replyingTo?: ReplyInfo | null;
  onClearReply?: () => void;
  inputRef?: React.RefObject<TextInput | null>;
}

export default function MessageInput({
  replyingTo,
  onClearReply,
  inputRef,
}: MessageInputProps) {
  const [text, setText] = React.useState("");

  return (
    <View>
      {replyingTo && onClearReply && (
        <ReplyBar
          userName={replyingTo.userName}
          userColour={replyingTo.userColour}
          text={replyingTo.text}
          onDismiss={onClearReply}
        />
      )}
      <View style={styles.container}>
        <Pressable style={styles.plusButton}>
          <PlusIcon size={22} color={Colours.text} weight="bold" />
        </Pressable>

        <TextInput
          ref={inputRef}
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
