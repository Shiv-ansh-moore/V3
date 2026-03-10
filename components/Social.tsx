import { StyleSheet, View, Platform, TextInput } from "react-native";
import React, { useMemo, useCallback, useState, useRef, useEffect } from "react";
import AvatarRow from "./social/AvatarRow";
import ChatBubble, { BubblePosition } from "./social/ChatBubble";
import CompletedCard from "./social/CompletedCard";
import ScreenTimeLog from "./social/ScreenTimeLog";
import LongPressSheet from "./social/LongPressSheet";
import MessageInput, { ReplyInfo } from "./social/MessageInput";
import { FlatList } from "react-native-gesture-handler";
import { Colours } from "../constants/Colours";
import {
  ChatMessage,
  FeedItem,
  socialFeed,
  socialUsers,
} from "../testData/mockSocial";
import { ReplyQuoteProps } from "./social/ReplyQuote";
import {
  KeyboardAvoidingView,
  KeyboardGestureArea,
} from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function getUserName(userId: string): string {
  return socialUsers.find((u) => u.id === userId)?.name ?? "Unknown";
}

function getUserColour(userId: string): string {
  return (
    socialUsers.find((u) => u.id === userId)?.color ?? Colours.secondaryText
  );
}

function getMessagePosition(feed: FeedItem[], index: number): BubblePosition {
  const current = feed[index];
  if (current.kind !== "message") return "standalone";

  if (current.replyToId) return "standalone";

  const prev = feed[index - 1];
  const next = feed[index + 1];

  const sameAsPrev =
    prev?.kind === "message" &&
    !prev.replyToId &&
    prev.userId === current.userId;
  const sameAsNext =
    next?.kind === "message" &&
    !next.replyToId &&
    next.userId === current.userId;

  if (sameAsPrev && sameAsNext) return "middle";
  if (sameAsPrev) return "last";
  if (sameAsNext) return "first";
  return "standalone";
}

function buildReplyTo(item: ChatMessage): ReplyQuoteProps | undefined {
  if (!item.replyToId) return undefined;

  const ref = socialFeed.find((i) => i.id === item.replyToId);
  if (!ref) return undefined;

  let text: string;
  if (ref.kind === "message") {
    text = ref.text;
  } else if (ref.kind === "completed") {
    text = `Completed ${ref.goalTitle} ✅`;
  } else {
    text =
      ref.type === "unlock"
        ? `unlocked ${ref.app} for ${ref.duration}`
        : `locked ${ref.app} after ${ref.duration}`;
  }

  return {
    userName: getUserName(ref.userId),
    userColour: getUserColour(ref.userId),
    text,
    timestamp: ref.kind !== "activity" ? ref.timestamp : undefined,
    photoUri: ref.kind === "completed" ? ref.photoUri : undefined,
    activityType: ref.kind === "activity" ? ref.type : undefined,
  };
}

function buildReplyInfo(item: FeedItem): ReplyInfo {
  const userName = getUserName(item.userId);
  const userColour = getUserColour(item.userId);

  let text: string;
  if (item.kind === "message") {
    text = item.text;
  } else if (item.kind === "completed") {
    text = `Completed ${item.goalTitle} ✅`;
  } else {
    text =
      item.type === "unlock"
        ? `unlocked ${item.app} for ${item.duration}`
        : `locked ${item.app} after ${item.duration}`;
  }

  return { userName, userColour, text };
}

export default function Social() {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const [replyingTo, setReplyingTo] = useState<ReplyInfo | null>(null);
  const [sheetItem, setSheetItem] = useState<FeedItem | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  const reversedFeed = useMemo(() => [...socialFeed].reverse(), []);

  const handleReply = useCallback((item: FeedItem) => {
    setReplyingTo(buildReplyInfo(item));
  }, []);

  const clearReply = useCallback(() => {
    setReplyingTo(null);
  }, []);

  const handleLongPress = useCallback((item: FeedItem) => {
    setSheetItem(item);
    setSheetVisible(true);
  }, []);

  const closeSheet = useCallback(() => {
    setSheetVisible(false);
    setSheetItem(null);
  }, []);

  const handleSheetReact = useCallback((_emoji: string) => {
    // Reaction handling — would add to item.reactions in a real app
  }, []);

  const handleSheetReply = useCallback(() => {
    if (sheetItem) {
      setReplyingTo(buildReplyInfo(sheetItem));
    }
  }, [sheetItem]);

  useEffect(() => {
    if (replyingTo) {
      inputRef.current?.focus();
    }
  }, [replyingTo]);

  const renderItem = useCallback(
    ({ item, index }: { item: FeedItem; index: number }) => {
      const originalIndex = socialFeed.length - 1 - index;

      if (item.kind === "activity") {
        return (
          <ScreenTimeLog
            type={item.type}
            name={getUserName(item.userId)}
            nameColour={getUserColour(item.userId)}
            app={item.app}
            duration={item.duration}
            reason={item.reason}
            totalTime={item.totalTime}
            reactions={item.reactions}
            onDoubleTap={() => handleReply(item)}
            onLongPress={() => handleLongPress(item)}
          />
        );
      }

      if (item.kind === "message") {
        const prev = socialFeed[originalIndex - 1];
        return (
          <ChatBubble
            name={getUserName(item.userId)}
            nameColour={getUserColour(item.userId)}
            text={item.text}
            timestamp={item.timestamp}
            position={getMessagePosition(socialFeed, originalIndex)}
            afterActivity={prev?.kind === "activity"}
            replyTo={buildReplyTo(item)}
            reactions={item.reactions}
            onDoubleTap={() => handleReply(item)}
            onLongPress={() => handleLongPress(item)}
          />
        );
      }

      if (item.kind === "completed") {
        return (
          <CompletedCard
            name={getUserName(item.userId)}
            nameColour={getUserColour(item.userId)}
            goalTitle={item.goalTitle}
            photoUri={item.photoUri}
            timestamp={item.timestamp}
            reactions={item.reactions}
            onDoubleTap={() => handleReply(item)}
            onLongPress={() => handleLongPress(item)}
          />
        );
      }

      return null;
    },
    [handleReply, handleLongPress]
  );

  return (
    <>
    <KeyboardAvoidingView
      style={[
        styles.container,
        { paddingLeft: insets.left, paddingRight: insets.right },
      ]}
      behavior={"padding"}
      keyboardVerticalOffset={
        Platform.OS === "ios" ? insets.top : insets.top + 15
      }
    >
      <AvatarRow />
      <KeyboardGestureArea interpolator="ios" style={styles.messagesArea}>
        <FlatList
          data={reversedFeed}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          inverted
          style={styles.messagesArea}
          contentContainerStyle={styles.feed}
        />
      </KeyboardGestureArea>
      <View style={{ paddingBottom: insets.bottom }}>
        <MessageInput
          replyingTo={replyingTo}
          onClearReply={clearReply}
          inputRef={inputRef}
        />
      </View>
    </KeyboardAvoidingView>
    <LongPressSheet
      visible={sheetVisible}
      item={sheetItem}
      userName={sheetItem ? getUserName(sheetItem.userId) : ""}
      userColour={sheetItem ? getUserColour(sheetItem.userId) : ""}
      onClose={closeSheet}
      onReact={handleSheetReact}
      onReply={handleSheetReply}
    />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colours.background,
  },
  messagesArea: {
    flex: 1,
  },
  feed: {
    paddingHorizontal: 19,
  },
});
