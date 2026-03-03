import { StyleSheet, Text, View, ScrollView } from "react-native";
import React from "react";

interface AvatarRowProps {
  setIsPagerScrollEnabled: (enabled: boolean) => void;
}

export default function AvatarRow({ setIsPagerScrollEnabled }: AvatarRowProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      directionalLockEnabled
      onTouchStart={() => setIsPagerScrollEnabled(false)}
      onTouchEnd={() => setIsPagerScrollEnabled(true)}
      onTouchCancel={() => setIsPagerScrollEnabled(true)}
      onMomentumScrollEnd={() => setIsPagerScrollEnabled(true)}
      onScrollEndDrag={() => setIsPagerScrollEnabled(true)}
    >
      <View>
        <View style={styles.avatarRing}></View>
      </View>
      <View>
        <View style={styles.avatarRing}></View>
      </View>
      <View>
        <View style={styles.avatarRing}></View>
      </View>
      <View>
        <View style={styles.avatarRing}></View>
      </View>
      <View>
        <View style={styles.avatarRing}></View>
      </View>
      <View>
        <View style={styles.avatarRing}></View>
      </View>
      <View>
        <View style={styles.avatarRing}></View>
      </View>
      <View>
        <View style={styles.avatarRing}></View>
      </View>
      <View>
        <View style={styles.avatarRing}></View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  avatarRing: {
    width: 64,
    height: 65,
    borderRadius: 64,
    borderWidth: 2,
    borderColor: "#34D399",
  },
});
