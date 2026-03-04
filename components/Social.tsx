import { StyleSheet, View } from "react-native";
import React from "react";
import AvatarRow from "./social/AvatarRow";
import ChatBubble, { BubblePosition } from "./social/ChatBubble";
import CompletedCard from "./social/CompletedCard";
import ScreenTimeLog from "./social/ScreenTimeLog";
import MessageInput from "./social/MessageInput";
import { ScrollView } from "react-native-gesture-handler";
import { Colours } from "../constants/Colours";
import {
  ChatMessage,
  FeedItem,
  socialFeed,
  socialUsers,
} from "../testData/mockSocial";
import { ReplyQuoteProps } from "./social/ReplyQuote";

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

  // Reply messages always break the grouping chain
  if (current.replyToId) return "standalone";

  const prev = feed[index - 1];
  const next = feed[index + 1];

  const sameAsPrev =
    prev?.kind === "message" && !prev.replyToId && prev.userId === current.userId;
  const sameAsNext =
    next?.kind === "message" && !next.replyToId && next.userId === current.userId;

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
    text = ref.type === "unlock"
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

export default function Social() {
  return (
    <View style={styles.container}>
      <AvatarRow />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.feed}>
          {socialFeed.map((item, index) => {
            if (item.kind === "activity") {
              return (
                <ScreenTimeLog
                  key={item.id}
                  type={item.type}
                  name={getUserName(item.userId)}
                  nameColour={getUserColour(item.userId)}
                  app={item.app}
                  duration={item.duration}
                  reason={item.reason}
                  totalTime={item.totalTime}
                />
              );
            }

            if (item.kind === "message") {
              const prev = socialFeed[index - 1];
              return (
                <ChatBubble
                  key={item.id}
                  name={getUserName(item.userId)}
                  nameColour={getUserColour(item.userId)}
                  text={item.text}
                  timestamp={item.timestamp}
                  position={getMessagePosition(socialFeed, index)}
                  afterActivity={prev?.kind === "activity"}
                  replyTo={buildReplyTo(item)}
                />
              );
            }

            if (item.kind === "completed") {
              return (
                <CompletedCard
                  key={item.id}
                  name={getUserName(item.userId)}
                  nameColour={getUserColour(item.userId)}
                  goalTitle={item.goalTitle}
                  photoUri={item.photoUri}
                  timestamp={item.timestamp}
                />
              );
            }

            return null;
          })}
        </View>
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
  feed: {
    paddingHorizontal: 19,
  },
});
