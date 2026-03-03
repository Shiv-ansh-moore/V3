import { StyleSheet, Text, View, ScrollView } from "react-native";
import React from "react";

export default function AvatarRow() {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
