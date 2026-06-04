import { StyleSheet, TextInput, View, Pressable } from "react-native";
import React from "react";
import { PaperPlaneTiltIcon, PlusIcon } from "phosphor-react-native";
import { Colours } from "../../constants/Colours";
import { Fonts } from "../../constants/Fonts";
import ReplyBar from "./ReplyBar";

export interface ReplyInfo {
  id?: string;
  userId?: string;
  userName: string;
  userColour: string;
  text: string;
  reason?: string;
}

interface MessageInputProps {
  replyingTo?: ReplyInfo | null;
  onClearReply?: () => void;
  inputRef?: React.RefObject<TextInput | null>;
  onSend?: (text: string) => Promise<void> | void;
  onQuickProofPress?: () => void;
  onReplyUserPress?: (userId: string) => void;
}

export default function MessageInput({
  replyingTo,
  onClearReply,
  inputRef,
  onSend,
  onQuickProofPress,
  onReplyUserPress,
}: MessageInputProps) {
  const [text, setText] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const canSend = text.trim().length > 0 && !sending;
  const replyUserId = replyingTo?.userId;

  const handleSend = async () => {
    if (!canSend) return;

    const message = text.trim();
    setSending(true);
    try {
      await onSend?.(message);
      setText("");
    } catch (error) {
      console.log(
        "[social] send failed:",
        error instanceof Error ? error.message : error,
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <View>
      {replyingTo && onClearReply && (
        <ReplyBar
          userName={replyingTo.userName}
          userColour={replyingTo.userColour}
          text={replyingTo.text}
          reason={replyingTo.reason}
          onDismiss={onClearReply}
          onNamePress={
            replyUserId ? () => onReplyUserPress?.(replyUserId) : undefined
          }
        />
      )}
      <View style={styles.container}>
        <Pressable
          style={styles.plusButton}
          accessibilityRole="button"
          accessibilityLabel="Start quick proof"
          onPress={onQuickProofPress}
        >
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
          editable={!sending}
          onSubmitEditing={handleSend}
        />

        <Pressable
          style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!canSend}
        >
          <PaperPlaneTiltIcon
            size={18}
            color={canSend ? Colours.text : Colours.secondaryText}
            weight="fill"
          />
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
  sendButtonDisabled: {
    backgroundColor: Colours.cardHighlight,
  },
});
