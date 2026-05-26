import { Pressable, StyleSheet, Text, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { Image } from "expo-image";
import { Fonts } from "../../constants/Fonts";
import React from "react";
import { Colours } from "../../constants/Colours";

const AVATAR_SIZE = 70;
const BORDER_WIDTH = 2;
const INNER_AVATAR_SIZE = AVATAR_SIZE - BORDER_WIDTH * 2 - 4;

export interface AvatarRowMember {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  colour: string;
  storyStatus: "unseen" | "seen" | null;
}

interface AvatarRowProps {
  members: AvatarRowMember[];
  onMemberPress?: (member: AvatarRowMember) => void;
  onMemberNamePress?: (member: AvatarRowMember) => void;
  onMemberLongPress?: (member: AvatarRowMember) => void;
}

function getInitial(displayName: string): string {
  return displayName.trim().charAt(0).toUpperCase() || "?";
}

function getRingColour(member: AvatarRowMember): string {
  if (member.storyStatus === "unseen") return member.colour;
  if (member.storyStatus === "seen") return Colours.cardHighlight;
  return "transparent";
}

export default function AvatarRow({
  members,
  onMemberPress,
  onMemberNamePress,
  onMemberLongPress,
}: AvatarRowProps) {
  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {members.map((member) => (
          <View key={member.id} style={styles.item}>
            <Pressable
              onPress={() => onMemberPress?.(member)}
              onLongPress={() => onMemberLongPress?.(member)}
              style={[
                styles.avatarRing,
                { borderColor: getRingColour(member) },
              ]}
            >
              <View style={styles.avatar}>
                {member.avatarUrl ? (
                  <Image
                    source={{ uri: member.avatarUrl }}
                    style={styles.avatarImage}
                    contentFit="cover"
                  />
                ) : (
                  <Text style={[styles.initial, { color: member.colour }]}>
                    {getInitial(member.displayName)}
                  </Text>
                )}
              </View>
            </Pressable>
            <Pressable onPress={() => onMemberNamePress?.(member)}>
              <Text style={styles.name} numberOfLines={1}>
                {member.displayName}
              </Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
      <View style={styles.divider} />
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 19,
    gap: 12,
  },
  item: {
    alignItems: "center",
    width: AVATAR_SIZE,
  },
  avatarRing: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: BORDER_WIDTH,
    justifyContent: "center",
    alignItems: "center",
  },
  avatar: {
    width: INNER_AVATAR_SIZE,
    height: INNER_AVATAR_SIZE,
    borderRadius: INNER_AVATAR_SIZE / 2,
    backgroundColor: Colours.card,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  initial: {
    fontFamily: Fonts.semiBold,
    fontSize: 22,
    color: Colours.text,
  },
  name: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colours.secondaryText,
    textAlign: "center",
    marginTop: 0,
  },
  divider: {
    height: 2,
    backgroundColor: Colours.cardHighlight,
    marginHorizontal: 19,
    // marginTop: 2,
    marginBottom: 2,
  },
});
