import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Image } from "expo-image";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { XIcon } from "phosphor-react-native";
import { Colours } from "../../constants/Colours";
import { Fonts } from "../../constants/Fonts";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/AuthContext";

const STORY_DURATION_MS = 5000;
const PROOF_EMOJIS = ["🔥", "💪", "👏", "🫡", "❤️"];

export interface StoryProof {
  proofId: string;
  userId: string;
  messageId: string | null;
  goalId: string;
  goalTitle: string;
  caption: string | null;
  imageUrl: string | null;
  submittedAt: string;
  viewedByMe: boolean;
}

interface StoryViewerProps {
  visible: boolean;
  memberName: string;
  memberAvatarUrl: string | null;
  memberColour: string;
  stories: StoryProof[];
  initialIndex: number;
  onClose: () => void;
  onComplete: () => void;
  onProofViewed: (proofId: string) => void;
}

function formatStoryTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getInitial(displayName: string): string {
  return displayName.trim().charAt(0).toUpperCase() || "?";
}

export default function StoryViewer({
  visible,
  memberName,
  memberAvatarUrl,
  memberColour,
  stories,
  initialIndex,
  onClose,
  onComplete,
  onProofViewed,
}: StoryViewerProps) {
  const { user } = useAuth();
  const [index, setIndex] = useState(initialIndex);
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const progressValueRef = useRef(0);
  const isPausedRef = useRef(false);
  const animationRunRef = useRef(0);
  const onCompleteRef = useRef(onComplete);
  const goNextRef = useRef<() => void>(() => {});

  const current = stories[index] ?? null;
  const storyImageUrlKey = useMemo(
    () =>
      stories
        .map((story) => story.imageUrl)
        .filter((url): url is string => Boolean(url))
        .join("\n"),
    [stories],
  );

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!visible) return;
    animationRunRef.current += 1;
    isPausedRef.current = false;
    progressValueRef.current = 0;
    progressAnimation.stopAnimation();
    progressAnimation.setValue(0);
    setIndex(initialIndex);
  }, [initialIndex, progressAnimation, visible]);

  useEffect(() => {
    if (!visible || !current || !user || current.viewedByMe) return;

    supabase
      .from("proof_views")
      .upsert(
        { proof_id: current.proofId, viewer_id: user.id },
        { ignoreDuplicates: true, onConflict: "viewer_id,proof_id" },
      )
      .then(({ error }) => {
        if (error) {
          console.log("[stories] mark viewed error:", error.message);
          return;
        }
        onProofViewed(current.proofId);
      });
  }, [current, onProofViewed, user, visible]);

  useEffect(() => {
    if (!visible || !storyImageUrlKey) return;

    void Image.prefetch(storyImageUrlKey.split("\n"), "memory-disk").catch(
      (error: unknown) => {
        console.log(
          "[stories] image prefetch error:",
          error instanceof Error ? error.message : String(error),
        );
      },
    );
  }, [storyImageUrlKey, visible]);

  const resetProgress = useCallback(() => {
    animationRunRef.current += 1;
    isPausedRef.current = false;
    progressValueRef.current = 0;
    progressAnimation.stopAnimation();
    progressAnimation.setValue(0);
  }, [progressAnimation]);

  const goNext = useCallback(() => {
    resetProgress();
    if (index >= stories.length - 1) {
      requestAnimationFrame(() => onCompleteRef.current());
      return;
    }
    setIndex(index + 1);
  }, [index, resetProgress, stories.length]);

  useEffect(() => {
    goNextRef.current = goNext;
  }, [goNext]);

  const startProgressAnimation = useCallback(
    (fromValue = progressValueRef.current) => {
      if (!visible || stories.length === 0 || isPausedRef.current) return;

      const normalizedValue = Math.min(Math.max(fromValue, 0), 1);
      const runId = animationRunRef.current + 1;
      const duration = Math.max(
        0,
        (1 - normalizedValue) * STORY_DURATION_MS,
      );

      animationRunRef.current = runId;
      progressValueRef.current = normalizedValue;
      progressAnimation.setValue(normalizedValue);

      Animated.timing(progressAnimation, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (
          finished &&
          animationRunRef.current === runId &&
          !isPausedRef.current
        ) {
          progressValueRef.current = 1;
          requestAnimationFrame(() => goNextRef.current());
        }
      });
    },
    [progressAnimation, stories.length, visible],
  );

  const goBack = useCallback(() => {
    resetProgress();
    if (index === 0) {
      requestAnimationFrame(() => startProgressAnimation(0));
      return;
    }
    setIndex(index - 1);
  }, [index, resetProgress, startProgressAnimation]);

  const pauseProgress = useCallback(() => {
    if (!visible || stories.length === 0 || isPausedRef.current) return;

    animationRunRef.current += 1;
    isPausedRef.current = true;
    progressAnimation.stopAnimation((value) => {
      progressValueRef.current = Math.min(Math.max(value, 0), 1);
    });
  }, [progressAnimation, stories.length, visible]);

  const resumeProgress = useCallback(() => {
    if (!isPausedRef.current) return;

    isPausedRef.current = false;
    startProgressAnimation(progressValueRef.current);
  }, [startProgressAnimation]);

  useEffect(() => {
    if (!visible || stories.length === 0) return;

    isPausedRef.current = false;
    progressValueRef.current = 0;
    progressAnimation.setValue(0);
    startProgressAnimation(0);

    return () => {
      animationRunRef.current += 1;
      progressAnimation.stopAnimation();
    };
  }, [
    index,
    progressAnimation,
    startProgressAnimation,
    stories.length,
    visible,
  ]);

  const progressSegments = useMemo(
    () =>
      stories.map((story, storyIndex) => {
        const fill =
          storyIndex < index ? (
            <View style={[styles.progressFill, styles.progressFillComplete]} />
          ) : storyIndex === index ? (
            <Animated.View
              style={[
                styles.progressFill,
                styles.progressFillActive,
                { transform: [{ scaleX: progressAnimation }] },
              ]}
            />
          ) : (
            <View style={[styles.progressFill, styles.progressFillEmpty]} />
          );

        return (
          <View key={story.proofId} style={styles.progressTrack}>
            {fill}
          </View>
        );
      }),
    [index, progressAnimation, stories],
  );

  if (!current) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaProvider style={styles.absolute}>
        <SafeAreaView style={styles.container}>
          <View style={styles.flex}>
            <View style={styles.imageWrapper}>
              {current.imageUrl ? (
                <Image
                  source={{ uri: current.imageUrl }}
                  cachePolicy="memory-disk"
                  contentFit="cover"
                  priority="high"
                  style={styles.imagePlaceholder}
                />
              ) : (
                <View style={styles.imagePlaceholder} />
              )}

              <View style={styles.topOverlay} pointerEvents="box-none">
                <View style={styles.progressRow}>{progressSegments}</View>
                <View style={styles.header}>
                  <View style={styles.headerIdentity}>
                    <View
                      style={[
                        styles.headerAvatar,
                        { borderColor: memberColour },
                      ]}
                    >
                      {memberAvatarUrl ? (
                        <Image
                          source={{ uri: memberAvatarUrl }}
                          contentFit="cover"
                          style={styles.headerAvatarImage}
                        />
                      ) : (
                        <Text
                          style={[
                            styles.headerAvatarInitial,
                            { color: memberColour },
                          ]}
                        >
                          {getInitial(memberName)}
                        </Text>
                      )}
                    </View>
                    <View style={styles.headerTextWrap}>
                      <Text style={styles.headerName} numberOfLines={1}>
                        {memberName}
                      </Text>
                      <Text style={styles.headerGoalTitle} numberOfLines={1}>
                        {current.goalTitle}
                      </Text>
                      <Text style={styles.headerMeta} numberOfLines={1}>
                        {formatStoryTime(current.submittedAt)}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                    <XIcon size={20} color={Colours.text} weight="bold" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.tapZones} pointerEvents="box-none">
                <Pressable
                  style={styles.tapZone}
                  onPress={goBack}
                  onPressIn={pauseProgress}
                  onPressOut={resumeProgress}
                />
                <Pressable
                  style={styles.tapZone}
                  onPress={goNext}
                  onPressIn={pauseProgress}
                  onPressOut={resumeProgress}
                />
              </View>
            </View>

            <View style={styles.bottomSection}>
              {current.caption ? (
                <Text style={styles.captionText} numberOfLines={2}>
                  {current.caption}
                </Text>
              ) : null}

              <TextInput
                style={styles.captionInput}
                placeholder="Reply to proof..."
                placeholderTextColor={Colours.secondaryText}
                editable={false}
              />

              <View style={styles.reactionRow}>
                {PROOF_EMOJIS.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={styles.reactionButton}
                    disabled
                  >
                    <Text style={styles.reactionText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  absolute: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  container: {
    flex: 1,
    backgroundColor: Colours.background,
    padding: 12,
  },
  flex: {
    flex: 1,
  },
  imageWrapper: {
    flex: 1,
  },
  imagePlaceholder: {
    flex: 1,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: Colours.background,
  },
  topOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  progressRow: {
    flexDirection: "row",
    gap: 4,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.28)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colours.text,
  },
  progressFillComplete: {
    width: "100%",
  },
  progressFillActive: {
    width: "100%",
    transformOrigin: "left center",
  },
  progressFillEmpty: {
    width: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
  },
  headerIdentity: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    backgroundColor: Colours.card,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  headerAvatarImage: {
    width: "100%",
    height: "100%",
  },
  headerAvatarInitial: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
  },
  headerTextWrap: {
    flex: 1,
    marginLeft: 8,
    minWidth: 0,
  },
  headerName: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    color: Colours.text,
    opacity: 0.82,
  },
  headerGoalTitle: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    color: Colours.text,
  },
  headerMeta: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colours.text,
    opacity: 0.8,
    marginTop: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(26, 26, 26, 0.76)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  tapZones: {
    position: "absolute",
    top: 70,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
  },
  tapZone: {
    flex: 1,
  },
  bottomSection: {
    paddingTop: 16,
    paddingBottom: 12,
  },
  captionText: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colours.text,
    marginBottom: 10,
  },
  captionInput: {
    height: 40,
    backgroundColor: Colours.cardHighlight,
    borderRadius: 20,
    paddingHorizontal: 14,
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colours.text,
  },
  reactionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  reactionButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colours.cardHighlight,
    justifyContent: "center",
    alignItems: "center",
  },
  reactionText: {
    fontSize: 22,
  },
});
