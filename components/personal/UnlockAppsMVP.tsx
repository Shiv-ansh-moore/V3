import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Colours } from "../../constants/Colours";
import { Fonts } from "../../constants/Fonts";
import { LockSimpleOpenIcon } from "phosphor-react-native";

const UnlockAppsMVP = () => {
  return (
    <TouchableOpacity style={styles.container}>
      <LockSimpleOpenIcon
        size={14}
        color={Colours.secondaryText}
        weight="fill"
      />
      <Text style={styles.text}>Unlock apps now</Text>
    </TouchableOpacity>
  );
};

export default UnlockAppsMVP;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 8,
    marginVertical: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#34C759",
  },
  text: {
    color: Colours.secondaryText,
    fontFamily: Fonts.medium,
    fontSize: 14,
  },
});
