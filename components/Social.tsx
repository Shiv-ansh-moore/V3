import { StyleSheet, View } from "react-native";
import React from "react";
import AvatarRow from "./AvatarRow";
import ChatBubble, { BubblePosition } from "./ChatBubble";
import ScreenTimeLog from "./ScreenTimeLog";
import MessageInput from "./MessageInput";
import { ScrollView } from "react-native-gesture-handler";
import { Colours } from "../constants/Colours";
import { FeedItem, socialFeed, socialUsers } from "../testData/mockSocial";

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

  const prev = feed[index - 1];
  const next = feed[index + 1];

  const sameAsPrev =
    prev?.kind === "message" && prev.userId === current.userId;
  const sameAsNext =
    next?.kind === "message" && next.userId === current.userId;

  if (sameAsPrev && sameAsNext) return "middle";
  if (sameAsPrev) return "last";
  if (sameAsNext) return "first";
  return "standalone";
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
                  position={getMessagePosition(socialFeed, index)}
                  afterActivity={prev?.kind === "activity"}
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
