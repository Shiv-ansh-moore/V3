import { StyleSheet, Text, View } from "react-native";
import React from "react";
import { HorseIcon, HeartIcon, CubeIcon } from "phosphor-react-native";

export default function GoalIcon() {
  return (
    <View>
      <HorseIcon color="white" />
      <HeartIcon color="#AE2983" weight="fill" size={32} />
      <CubeIcon color="teal" weight="duotone" />
    </View>
  );
}

const styles = StyleSheet.create({});
