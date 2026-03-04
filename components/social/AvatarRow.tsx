import { StyleSheet, Text, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { Fonts } from "../../constants/Fonts";
import { socialUsers } from "../../testData/mockSocial";
import React from "react";
import { Colours } from "../../constants/Colours";

const AVATAR_SIZE = 64;
const BORDER_WIDTH = 2;

export default function AvatarRow() {
  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {socialUsers.map((user) => (
          <View key={user.id} style={styles.item}>
            <View
              style={[
                styles.avatarRing,
                user.hasNewContent
                  ? { borderColor: user.color }
                  : { borderColor: "transparent" },
              ]}
            >
              <View style={styles.avatar}>
                <Text style={styles.initial}>
                  {user.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={styles.name} numberOfLines={1}>
              {user.name}
            </Text>
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
    padding: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  avatar: {
    width: AVATAR_SIZE - BORDER_WIDTH * 2 - 4,
    height: AVATAR_SIZE - BORDER_WIDTH * 2 - 4,
    borderRadius: (AVATAR_SIZE - BORDER_WIDTH * 2 - 4) / 2,
    backgroundColor: Colours.card,
    justifyContent: "center",
    alignItems: "center",
  },
  initial: {
    fontFamily: Fonts.semiBold,
    fontSize: 22,
    color: Colours.text,
  },
  name: {
    fontFamily: Fonts.regular,
    fontSize: 10,
    color: Colours.secondaryText,
    textAlign: "center",
    marginTop: 2,
  },
  divider: {
    height: 2,
    backgroundColor: Colours.cardHighlight,
    marginHorizontal: 19,
    marginTop: 8,
  },
});
