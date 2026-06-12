import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import React from "react";
import { Image } from "expo-image";
import { PaperPlaneTiltIcon, PlusIcon } from "phosphor-react-native";
import { Colours } from "../../constants/Colours";
import { Fonts } from "../../constants/Fonts";
import ReplyBar from "./ReplyBar";
import {
  getMentionTrigger,
  parseMessageMentions,
  type MentionMember,
  type MessageMention,
} from "../../lib/mentions";

export interface ReplyInfo {
  id?: string;
  userId?: string;
  userName: string;
  userColour: string;
  text: string;
  reason?: string;
}

export interface MessageSendPayload {
  text: string;
  mentions: MessageMention[];
  replyToId?: string | null;
}

interface MessageInputProps {
  replyingTo?: ReplyInfo | null;
  onClearReply?: () => void;
  inputRef?: React.RefObject<TextInput | null>;
  onSend?: (message: MessageSendPayload) => Promise<void> | void;
  onQuickProofPress?: () => void;
  onReplyUserPress?: (userId: string) => void;
  mentionMembers?: MentionMember[];
}

type InputSelection = {
  start: number;
  end: number;
};

function getInitial(displayName: string): string {
  return displayName.trim().charAt(0).toUpperCase() || "?";
}

export default function MessageInput({
  replyingTo,
  onClearReply,
  inputRef,
  onSend,
  onQuickProofPress,
  onReplyUserPress,
  mentionMembers = [],
}: MessageInputProps) {
  const [text, setText] = React.useState("");
  const [pendingSendCount, setPendingSendCount] = React.useState(0);
  const [showSendingStatus, setShowSendingStatus] = React.useState(false);
  const [failedMessage, setFailedMessage] =
    React.useState<MessageSendPayload | null>(null);
  const [selection, setSelection] = React.useState<InputSelection>({
    start: 0,
    end: 0,
  });
  const [forcedSelection, setForcedSelection] =
    React.useState<InputSelection>();
  const sendQueueRef = React.useRef<Promise<void>>(Promise.resolve());
  const canSend = text.trim().length > 0;
  const replyUserId = replyingTo?.userId;
  const isSending = pendingSendCount > 0;
  const showStatusRow =
    Boolean(failedMessage) || (isSending && showSendingStatus);

  React.useEffect(() => {
    if (!forcedSelection) return;

    const frame = requestAnimationFrame(() => {
      setForcedSelection(undefined);
    });

    return () => cancelAnimationFrame(frame);
  }, [forcedSelection]);

  React.useEffect(() => {
    if (!isSending) {
      setShowSendingStatus(false);
      return;
    }

    const timeout = setTimeout(() => {
      setShowSendingStatus(true);
    }, 650);

    return () => clearTimeout(timeout);
  }, [isSending]);

  const mentionTrigger = React.useMemo(() => {
    if (selection.start !== selection.end) return null;
    return getMentionTrigger(text, selection.start);
  }, [selection.end, selection.start, text]);
  const mentionCandidates = React.useMemo(() => {
    if (!mentionTrigger) return [];

    const query = mentionTrigger.query.toLowerCase();
    return mentionMembers
      .filter((member) => member.username?.trim())
      .filter((member) => {
        if (!query) return true;

        const username = member.username?.toLowerCase() ?? "";
        const displayName = member.displayName.toLowerCase();
        return username.includes(query) || displayName.includes(query);
      })
      .slice(0, 6);
  }, [mentionMembers, mentionTrigger]);
  const showMentionPicker = mentionCandidates.length > 0;

  const enqueueMessageSend = React.useCallback(
    (message: MessageSendPayload, clearCurrentFailure = false) => {
      setPendingSendCount((count) => count + 1);
      if (clearCurrentFailure) {
        setFailedMessage(null);
      }

      sendQueueRef.current = sendQueueRef.current.then(async () => {
        try {
          await onSend?.(message);
        } catch (error) {
          console.log(
            "[social] send failed:",
            error instanceof Error ? error.message : error,
          );
          setFailedMessage(message);
        } finally {
          setPendingSendCount((count) => Math.max(0, count - 1));
        }
      });
    },
    [onSend],
  );

  const handleSend = () => {
    if (!canSend) return;

    const message = text.trim();
    const mentions = parseMessageMentions(message, mentionMembers);
    const payload: MessageSendPayload = {
      text: message,
      mentions,
      replyToId: replyingTo?.id ?? null,
    };

    setText("");
    setSelection({ start: 0, end: 0 });
    setForcedSelection(undefined);
    onClearReply?.();
    enqueueMessageSend(payload);
    requestAnimationFrame(() => inputRef?.current?.focus());
  };

  const handleRetrySend = () => {
    if (!failedMessage) return;

    enqueueMessageSend(failedMessage, true);
  };

  const insertMention = (member: MentionMember) => {
    if (!mentionTrigger || !member.username) return;

    const cursor = selection.start;
    const nextChar = text[cursor];
    const suffix = !nextChar || !/\s/.test(nextChar) ? " " : "";
    const inserted = `@${member.username}${suffix}`;
    const nextText =
      text.slice(0, mentionTrigger.start) + inserted + text.slice(cursor);
    const nextCursor = mentionTrigger.start + inserted.length;
    const nextSelection = { start: nextCursor, end: nextCursor };

    setText(nextText);
    setSelection(nextSelection);
    setForcedSelection(nextSelection);
    requestAnimationFrame(() => inputRef?.current?.focus());
  };

  const handleSelectionChange = (nextSelection: InputSelection) => {
    setSelection(nextSelection);

    if (
      forcedSelection &&
      forcedSelection.start === nextSelection.start &&
      forcedSelection.end === nextSelection.end
    ) {
      setForcedSelection(undefined);
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
      {showMentionPicker && (
        <View style={styles.mentionMenu}>
          <ScrollView
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={false}
            style={styles.mentionScroll}
          >
            {mentionCandidates.map((member, index) => (
              <Pressable
                key={member.id}
                style={({ pressed }) => [
                  styles.mentionRow,
                  index < mentionCandidates.length - 1 &&
                    styles.mentionRowDivider,
                  pressed && styles.mentionRowPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Tag ${member.displayName}`}
                onPress={() => insertMention(member)}
              >
                <View
                  style={[
                    styles.mentionAvatarRing,
                    member.colour ? { borderColor: member.colour } : null,
                  ]}
                >
                  <View style={styles.mentionAvatar}>
                    {member.avatarUrl ? (
                      <Image
                        source={{ uri: member.avatarUrl }}
                        style={styles.mentionAvatarImage}
                        contentFit="cover"
                      />
                    ) : (
                      <Text
                        style={[
                          styles.mentionAvatarInitial,
                          member.colour ? { color: member.colour } : null,
                        ]}
                      >
                        {getInitial(member.displayName)}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.mentionTextBlock}>
                  <Text style={styles.mentionName} numberOfLines={1}>
                    {member.displayName}
                  </Text>
                  <Text
                    style={[
                      styles.mentionUsername,
                      member.colour ? { color: member.colour } : null,
                    ]}
                    numberOfLines={1}
                  >
                    @{member.username}
                  </Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
      {showStatusRow && (
        <Pressable
          style={styles.statusRow}
          accessibilityRole={failedMessage ? "button" : undefined}
          accessibilityLabel={
            failedMessage ? "Message failed. Tap to retry." : "Sending message."
          }
          onPress={failedMessage ? handleRetrySend : undefined}
          disabled={!failedMessage}
        >
          {isSending && showSendingStatus ? (
            <ActivityIndicator size="small" color={Colours.brand} />
          ) : null}
          <Text
            style={[styles.statusText, failedMessage && styles.failedStatusText]}
          >
            {isSending && showSendingStatus
              ? "Sending..."
              : "Message failed. Tap to retry."}
          </Text>
        </Pressable>
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
          onSubmitEditing={handleSend}
          onSelectionChange={(event) =>
            handleSelectionChange(event.nativeEvent.selection)
          }
          selection={forcedSelection}
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
  mentionMenu: {
    marginHorizontal: 19,
    marginBottom: 6,
    borderRadius: 8,
    backgroundColor: Colours.card,
    borderWidth: 1,
    borderColor: Colours.cardHighlight,
    overflow: "hidden",
  },
  mentionScroll: {
    maxHeight: 236,
  },
  mentionRow: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  mentionRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Colours.cardHighlight,
  },
  mentionRowPressed: {
    backgroundColor: Colours.cardHighlight,
  },
  mentionAvatarRing: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: Colours.cardHighlight,
    alignItems: "center",
    justifyContent: "center",
  },
  mentionAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colours.cardHighlight,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  mentionAvatarImage: {
    width: "100%",
    height: "100%",
  },
  mentionAvatarInitial: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: Colours.text,
  },
  mentionTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  mentionName: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: Colours.text,
  },
  mentionUsername: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colours.secondaryText,
  },
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
  statusRow: {
    minHeight: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 19,
    paddingTop: 6,
    backgroundColor: Colours.background,
  },
  statusText: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colours.secondaryText,
  },
  failedStatusText: {
    color: Colours.brand,
  },
});
