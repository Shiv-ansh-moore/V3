import { StyleSheet, View, ScrollView, Platform } from "react-native";
import React from "react";

export default function AvatarRow() {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      nestedScrollEnabled={true}
      directionalLockEnabled={true}
      disableIntervalMomentum={false}
      {...(Platform.OS === "android" ? { overScrollMode: "never" } : {})}
    >
      <View style={styles.row}>
        <View style={styles.avatarItem}>
          <View style={styles.avatarRing} />
        </View>
        <View style={styles.avatarItem}>
          <View style={styles.avatarRing} />
        </View>
        <View style={styles.avatarItem}>
          <View style={styles.avatarRing} />
        </View>
        <View style={styles.avatarItem}>
          <View style={styles.avatarRing} />
        </View>
        <View style={styles.avatarItem}>
          <View style={styles.avatarRing} />
        </View>
        <View style={styles.avatarItem}>
          <View style={styles.avatarRing} />
        </View>
        <View style={styles.avatarItem}>
          <View style={styles.avatarRing} />
        </View>
        <View style={styles.avatarItem}>
          <View style={styles.avatarRing} />
        </View>
        <View style={styles.avatarItem}>
          <View style={styles.avatarRing} />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    paddingHorizontal: 19,
    gap: 16,
    paddingVertical: 12,
  },
  avatarItem: {
    alignItems: "center",
  },
  avatarRing: {
    width: 64,
    height: 65,
    borderRadius: 64,
    borderWidth: 2,
    borderColor: "#34D399",
  },
});
