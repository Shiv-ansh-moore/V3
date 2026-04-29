import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { Colours } from "../../constants/Colours";
import { Fonts } from "../../constants/Fonts";
import { LockSimpleOpenIcon } from "phosphor-react-native";
import UnlockSheet from "./UnlockSheet";

interface UnlockAppsMVPProps {
  onUnlock: (minutes: number, reason: string) => void;
}

export default function UnlockAppsMVP({ onUnlock }: UnlockAppsMVPProps) {
  const [showSheet, setShowSheet] = useState(false);

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.7}
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
        onUnlock={onUnlock}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colours.cardHighlight,
  },
  text: {
    color: Colours.secondaryText,
    fontFamily: Fonts.medium,
    fontSize: 13,
  },
});
