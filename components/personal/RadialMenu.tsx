import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  StyleSheet,
  Text,
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
  {
    key: "history",
    label: "History",
    Icon: ClockCounterClockwiseIcon,
    angle: 180,
  },
].map((item) => ({
  ...item,
  translateX: RADIUS * Math.cos((item.angle * Math.PI) / 180),
  translateY: -RADIUS * Math.sin((item.angle * Math.PI) / 180),
}));

interface RadialMenuProps {
  onNewPress?: () => void;
  onDecksPress?: () => void;
}

export interface RadialMenuHandle {
  open: () => void;
}

function RadialMenu(
  { onNewPress, onDecksPress }: RadialMenuProps,
  ref: React.ForwardedRef<RadialMenuHandle>,
) {
  const [open, setOpen] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;

  const animateTo = useCallback(
    (toValue: number) => {
      Animated.spring(animation, {
        toValue,
        friction: 6,
        tension: 80,
        useNativeDriver: false,
      }).start();
    },
    [animation],
  );

  const openMenu = useCallback(() => {
    setOpen(true);
    animateTo(1);
  }, [animateTo]);

  const closeMenu = useCallback(() => {
    setOpen(false);
    animateTo(0);
  }, [animateTo]);

  useImperativeHandle(
    ref,
    () => ({
      open: openMenu,
    }),
    [openMenu],
  );

  const toggleMenu = () => {
    if (open) {
      closeMenu();
      return;
    }

    openMenu();
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
        <Pressable style={StyleSheet.absoluteFill} onPress={closeMenu}>
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
                  closeMenu();
                  onNewPress();
                } else if (item.key === "decks" && onDecksPress) {
                  closeMenu();
                  onDecksPress();
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

export default forwardRef<RadialMenuHandle, RadialMenuProps>(RadialMenu);

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
