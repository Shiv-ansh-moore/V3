import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { Colours } from "../../constants/Colours";
import { Fonts } from "../../constants/Fonts";
import { LockSimpleOpenIcon } from "phosphor-react-native";
import UnlockSheet from "./UnlockSheet";

export default function UnlockAppsMVP() {
  const [showSheet, setShowSheet] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={styles.container}
        onPress={() => setShowSheet(true)}
      >
        <LockSimpleOpenIcon
          size={14}
          color={Colours.secondaryText}
          weight="fill"
        />
        <Text style={styles.text}>Unlock apps now</Text>
      </TouchableOpacity>

      <UnlockSheet
        visible={showSheet}
        onClose={() => setShowSheet(false)}
        onUnlock={(minutes, reason) => {
          console.log(`Unlocked for ${minutes}m — reason: ${reason}`);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 8,
    marginVertical: 12,
  },
  text: {
    color: Colours.secondaryText,
    fontFamily: Fonts.medium,
    fontSize: 14,
  },
});
