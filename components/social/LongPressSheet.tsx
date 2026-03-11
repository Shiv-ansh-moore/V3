import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  Image,
} from "react-native";
import React, { useEffect, useRef } from "react";
import { Colours } from "../../constants/Colours";
import { Fonts } from "../../constants/Fonts";
import { FeedItem } from "../../testData/mockSocial";
import {
  ArrowBendUpLeftIcon,
  LockSimpleIcon,
  LockSimpleOpenIcon,
} from "phosphor-react-native";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const SHEET_MAX = SCREEN_HEIGHT * 0.55;

const MESSAGE_EMOJIS = ["😂", "❤️", "🔥", "💀", "👍"];
const COMPLETED_EMOJIS = ["🔥", "💪", "👏", "🫡", "❤️"];
const ACTIVITY_EMOJIS = ["😂", "💀", "🫡", "👏", "🔥"];

interface LongPressSheetProps {
  visible: boolean;
  item: FeedItem | null;
  userName: string;
  userColour: string;
  onClose: () => void;
  onReact: (emoji: string) => void;
  onReply: () => void;
}

export default function LongPressSheet({
  visible,
  item,
  userName,
  userColour,
  onClose,
  onReact,
  onReply,
}: LongPressSheetProps) {
  const translateY = useRef(new Animated.Value(SHEET_MAX)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 200,
      }).start();
    } else {
      translateY.setValue(SHEET_MAX);
    }
  }, [visible]);

  const dismiss = () => {
    onClose();
  };

  const handleReact = (emoji: string) => {
    onReact(emoji);
    dismiss();
  };

  const handleReply = () => {
    onClose();
    setTimeout(() => onReply(), 50);
  };

  if (!item) return null;

  const emojis =
    item.kind === "completed"
      ? COMPLETED_EMOJIS
      : item.kind === "activity"
        ? ACTIVITY_EMOJIS
        : MESSAGE_EMOJIS;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={dismiss}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={dismiss}>
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY }] }]}
          onStartShouldSetResponder={() => true}
        >
          {/* Handle */}
          <View style={styles.handleArea}>
            <View style={styles.handle} />
          </View>

          {/* Preview — styled like ReplyQuote with accent bar */}
          {item.kind === "message" && (
            <View style={styles.previewWrap}>
              <View style={styles.quoteBox}>
                <View
                  style={[styles.accentBar, { backgroundColor: userColour }]}
                />
                <View style={styles.quoteContent}>
                  <View style={styles.quoteHeader}>
                    <Text style={[styles.quoteName, { color: userColour }]}>
                      {userName}
                    </Text>
                    <Text style={styles.quoteTimestamp}>{item.timestamp}</Text>
                  </View>
                  <Text style={styles.quoteText}>{item.text}</Text>
                </View>
              </View>
            </View>
          )}

          {item.kind === "completed" && (
            <View style={styles.previewWrap}>
              <View style={styles.quotePhotoBox}>
                <View
                  style={[styles.accentBar, { backgroundColor: userColour }]}
                />
                <View style={styles.quoteContent}>
                  <View style={styles.quoteHeader}>
                    <Text style={[styles.quoteName, { color: userColour }]}>
                      {userName}
                    </Text>
                    <Text style={styles.quoteTimestamp}>{item.timestamp}</Text>
                  </View>
                  <Text style={styles.quoteGoalLabel}>
                    Completed {item.goalTitle} ✅
                  </Text>
                  <View style={styles.quoteImageWrap}>
                    {item.photoUri ? (
                      <Image
                        source={{ uri: item.photoUri }}
                        style={styles.quoteImage}
                      />
                    ) : (
                      <View
                        style={[
                          styles.quoteImage,
                          styles.quoteImagePlaceholder,
                        ]}
                      />
                    )}
                  </View>
                </View>
              </View>
            </View>
          )}

          {item.kind === "activity" && (
            <View style={styles.previewWrap}>
              <View style={styles.quoteBox}>
                <View
                  style={[styles.accentBar, { backgroundColor: userColour }]}
                />
                <View style={styles.quoteContent}>
                  <View style={styles.quoteActivityIcon}>
                    {item.type === "unlock" ? (
                      <LockSimpleOpenIcon
                        size={16}
                        color={Colours.secondaryText}
                        weight="fill"
                      />
                    ) : (
                      <LockSimpleIcon
                        size={16}
                        color={Colours.secondaryText}
                        weight="fill"
                      />
                    )}
                  </View>
                  <Text style={styles.quoteActivityLine} numberOfLines={1}>
                    <Text style={[styles.quoteName, { color: userColour }]}>
                      {userName}{" "}
                    </Text>
                    <Text style={styles.quoteText}>
                      {item.type === "unlock"
                        ? `unlocked ${item.app} for ${item.duration}`
                        : `locked ${item.app} after ${item.duration}`}
                    </Text>
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Emoji row */}
          <View style={styles.emojiRow}>
            {emojis.map((e) => (
              <Pressable
                key={e}
                style={styles.emojiBtn}
                onPress={() => handleReact(e)}
              >
                <Text style={styles.emojiBtnText}>{e}</Text>
              </Pressable>
            ))}
            <View style={styles.emojiPlus}>
              <Text style={styles.emojiPlusText}>＋</Text>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable style={styles.action} onPress={handleReply}>
              <View style={styles.actionIcon}>
                <ArrowBendUpLeftIcon
                  size={15}
                  color={Colours.text}
                  weight="bold"
                />
              </View>
              <Text style={styles.actionLabel}>Reply</Text>
            </Pressable>
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colours.card,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    paddingBottom: 20,
  },
  handleArea: {
    paddingTop: 8,
    paddingBottom: 4,
    alignItems: "center",
  },
  handle: {
    width: 32,
    height: 3.5,
    backgroundColor: "#333",
    borderRadius: 2,
  },

  // Preview — matches ReplyQuote styling
  previewWrap: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
  },
  quoteBox: {
    flexDirection: "row",
    backgroundColor: Colours.cardHighlight,
    borderRadius: 8,
    overflow: "hidden",
  },
  quotePhotoBox: {
    flexDirection: "row",
    backgroundColor: Colours.cardHighlight,
    borderRadius: 12,
    overflow: "hidden",
  },
  accentBar: {
    width: 4,
    alignSelf: "stretch",
  },
  quoteContent: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  quoteHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  quoteName: {
    fontFamily: Fonts.medium,
    fontSize: 12,
  },
  quoteTimestamp: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colours.secondaryText,
  },
  quoteText: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colours.secondaryText,
  },
  quoteGoalLabel: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colours.secondaryText,
    marginTop: 2,
  },
  quoteImageWrap: {
    marginTop: 6,
    borderRadius: 10,
    overflow: "hidden",
    width: 110,
    height: 146,
  },
  quoteImage: {
    width: "100%",
    height: "100%",
  },
  quoteImagePlaceholder: {
    backgroundColor: Colours.card,
  },
  quoteActivityIcon: {
    alignSelf: "center",
    marginBottom: 2,
  },
  quoteActivityLine: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colours.secondaryText,
  },

  // Emoji row
  emojiRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  emojiBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiBtnText: {
    fontSize: 22,
  },
  emojiPlus: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#333",
    alignItems: "center",
    justifyContent: "center",
  },
  emojiPlusText: {
    fontSize: 16,
    color: Colours.secondaryText,
  },

  // Divider
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colours.cardHighlight,
    marginHorizontal: 16,
  },

  // Actions
  actions: {
    paddingHorizontal: 16,
    paddingTop: 2,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  actionIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colours.cardHighlight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  actionLabel: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: Colours.text,
  },
});
