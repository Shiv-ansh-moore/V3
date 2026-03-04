import { StyleSheet, Text, View } from "react-native";
import React from "react";
import { LockSimpleIcon, LockSimpleOpenIcon } from "phosphor-react-native";
import { Fonts } from "../../constants/Fonts";
import { Colours } from "../../constants/Colours";

interface ScreenTimeLogProps {
  type: "unlock" | "lock";
  name: string;
  nameColour: string;
  app: string;
  duration: string;
  reason?: string;
  totalTime?: string;
}

export default function ScreenTimeLog({
  type,
  name,
  nameColour,
  app,
  duration,
  reason,
  totalTime,
}: ScreenTimeLogProps) {
  const isUnlock = type === "unlock";
  const label = isUnlock
    ? `${app} for ${duration}`
    : `${app} after ${duration}`;
  const subtitle = isUnlock && reason ? `"${reason}"` : totalTime;

  return (
    <View style={styles.container}>
      {isUnlock ? (
        <LockSimpleOpenIcon
          size={20}
          color={Colours.secondaryText}
          weight="fill"
        />
      ) : (
        <LockSimpleIcon size={20} color={Colours.secondaryText} weight="fill" />
      )}
      <Text style={styles.text}>
        <Text style={[styles.name, { color: nameColour }]}>{name}</Text>
        <Text style={styles.desc}>
          {isUnlock ? " unlocked " : " locked "}
          {label}
        </Text>
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "center",
    alignItems: "center",
    marginTop: 2,
    marginBottom: 2,
  },
  text: {
    textAlign: "center",
    fontSize: 12,
    marginTop: 4,
  },
  name: {
    fontFamily: Fonts.medium,
    fontSize: 12,
  },
  desc: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colours.secondaryText,
  },
  subtitle: {
    fontFamily: Fonts.medium,
    fontSize: 10,
    color: Colours.secondaryText,
    marginTop: 2,
    textAlign: "center",
  },
});
