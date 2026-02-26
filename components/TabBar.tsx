import React, { useState } from "react";
import { Animated, Pressable, View, StyleSheet, LayoutChangeEvent } from "react-native";
import { Colours } from "../constants/Colours";
import { Fonts } from "../constants/Fonts";

interface TabLayout {
  x: number;
  width: number;
}

export default function TabBar({
  scrollPosition,
  onTabPress,
}: {
  scrollPosition: Animated.Value;
  onTabPress: (index: number) => void;
}) {
  const [tabLayouts, setTabLayouts] = useState<(TabLayout | null)[]>([
    null,
    null,
  ]);

  const onTabLayout = (index: number) => (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    setTabLayouts((prev) => {
      const next = [...prev];
      next[index] = { x, width };
      return next;
    });
  };

  const measured = tabLayouts[0] !== null && tabLayouts[1] !== null;
  const INDICATOR_PADDING = 4;

  return (
    <View style={styles.container}>
      <View style={styles.tabsRow}>
        <Pressable onPress={() => onTabPress(0)} onLayout={onTabLayout(0)}>
          <Animated.Text
            style={[
              styles.tabText,
              {
                color: scrollPosition.interpolate({
                  inputRange: [0, 1],
                  outputRange: [Colours.text, Colours.secondaryText],
                }),
              },
            ]}
          >
            Personal
          </Animated.Text>
        </Pressable>
        <Pressable onPress={() => onTabPress(1)} onLayout={onTabLayout(1)}>
          <Animated.Text
            style={[
              styles.tabText,
              {
                color: scrollPosition.interpolate({
                  inputRange: [0, 1],
                  outputRange: [Colours.secondaryText, Colours.text],
                }),
              },
            ]}
          >
            Social
          </Animated.Text>
        </Pressable>
        {measured && (
          <Animated.View
            style={[
              styles.indicator,
              {
                left: scrollPosition.interpolate({
                  inputRange: [0, 1],
                  outputRange: [
                    tabLayouts[0]!.x - INDICATOR_PADDING,
                    tabLayouts[1]!.x - INDICATOR_PADDING,
                  ],
                }),
                width: scrollPosition.interpolate({
                  inputRange: [0, 1],
                  outputRange: [
                    tabLayouts[0]!.width + INDICATOR_PADDING * 2,
                    tabLayouts[1]!.width + INDICATOR_PADDING * 2,
                  ],
                }),
              },
            ]}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 0,
  },
  tabsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 36,
    paddingBottom: 7,
  },
  indicator: {
    position: "absolute",
    bottom: 0,
    height: 3,
    backgroundColor: Colours.brand,
    borderRadius: 1.5,
  },
  tabText: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
  },
});
