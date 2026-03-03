import { StyleSheet, Text, View } from "react-native";
import React from "react";
import AvatarRow from "./AvatarRow";

interface SocialProps {
  setIsPagerScrollEnabled: (enabled: boolean) => void;
}

export default function Social({ setIsPagerScrollEnabled }: SocialProps) {
  return (
    <View>
      <AvatarRow setIsPagerScrollEnabled={setIsPagerScrollEnabled} />
    </View>
  );
}

const styles = StyleSheet.create({});
