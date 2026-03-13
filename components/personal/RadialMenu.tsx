import React, { useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Pressable,
  Animated,
} from "react-native";
import {
  PlusIcon,
  PencilSimpleIcon,
  PackageIcon,
  ClockCounterClockwiseIcon,
} from "phosphor-react-native";
import { Colours } from "../../constants/Colours";
import { Fonts } from "../../constants/Fonts";

const RADIUS = 110;
const MENU_ITEMS = [
  { key: "new", label: "New", Icon: PencilSimpleIcon, angle: 90 },
  { key: "decks", label: "Decks", Icon: PackageIcon, angle: 135 },
  { key: "history", label: "History", Icon: ClockCounterClockwiseIcon, angle: 180 },
].map((item) => ({
  ...item,
  translateX: RADIUS * Math.cos((item.angle * Math.PI) / 180),
  translateY: -RADIUS * Math.sin((item.angle * Math.PI) / 180),
}));

interface RadialMenuProps {
  onNewPress?: () => void;
}

export default function RadialMenu({ onNewPress }: RadialMenuProps) {
  const [open, setOpen] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;

  const toggleMenu = () => {
    const toValue = open ? 0 : 1;
    setOpen(!open);
    Animated.spring(animation, {
      toValue,
      friction: 6,
      tension: 80,
      useNativeDriver: false,
    }).start();
  };

  const close = () => {
    setOpen(false);
    Animated.spring(animation, {
      toValue: 0,
      friction: 6,
      tension: 80,
      useNativeDriver: false,
    }).start();
  };

  const fabRotation = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "45deg"],
  });

  const fabBg = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [Colours.brand, "#CC5500"],
  });

  const overlayOpacity = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <>
      {open && (
        <Pressable style={StyleSheet.absoluteFill} onPress={close}>
          <Animated.View
            style={[styles.overlay, { opacity: overlayOpacity }]}
          />
        </Pressable>
      )}

      {MENU_ITEMS.map((item) => {
        const translateX = animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, item.translateX],
        });
        const translateY = animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, item.translateY],
        });
        const scale = animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 1],
        });
        const opacity = animation.interpolate({
          inputRange: [0, 0.3, 1],
          outputRange: [0, 0, 1],
        });

        return (
          <Animated.View
            key={item.key}
            pointerEvents={open ? "auto" : "none"}
            style={[
              styles.menuItemContainer,
              {
                opacity,
                transform: [{ translateX }, { translateY }, { scale }],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.menuCircle}
              activeOpacity={0.7}
              onPress={() => {
                if (item.key === "new" && onNewPress) {
                  close();
                  onNewPress();
                }
              }}
            >
              <item.Icon
                size={22}
                weight="bold"
                color={Colours.secondaryText}
              />
            </TouchableOpacity>
            <Text style={styles.menuLabel}>{item.label}</Text>
          </Animated.View>
        );
      })}

      <TouchableOpacity
        onPress={toggleMenu}
        activeOpacity={0.7}
        style={styles.fabTouchable}
      >
        <Animated.View
          style={[
            styles.fab,
            {
              backgroundColor: fabBg,
              transform: [{ rotate: fabRotation }],
            },
          ]}
        >
          <PlusIcon size={28} weight="bold" color="#FFFFFF" />
        </Animated.View>
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 10,
  },
  menuItemContainer: {
    position: "absolute",
    bottom: 32,
    right: 19,
    width: 64,
    alignItems: "center",
    zIndex: 11,
  },
  menuCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colours.cardHighlight,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  menuLabel: {
    fontSize: 10,
    color: Colours.secondaryText,
    fontFamily: Fonts.medium,
    marginTop: 4,
  },
  fabTouchable: {
    position: "absolute",
    bottom: 32,
    right: 19,
    zIndex: 12,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colours.brand,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
});
