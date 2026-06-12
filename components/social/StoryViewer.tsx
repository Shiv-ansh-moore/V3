import {
  ActivityIndicator,
  Animated,
  AppState,
  Easing,
  Keyboard,
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
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Image } from "expo-image";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { PaperPlaneTiltIcon, XIcon } from "phosphor-react-native";
import * as Haptics from "expo-haptics";
import { Colours } from "../../constants/Colours";
import { Fonts } from "../../constants/Fonts";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/AuthContext";

const STORY_DURATION_MS = 5000;
const STORY_TAP_MAX_MS = 300;
const KEYBOARD_DISMISS_ACTION_GUARD_MS = 350;
const STORY_VIEWER_EDGE_PADDING = 12;
const PROOF_IMAGE_URL_TTL_SECONDS = 60 * 60;
const PROOF_EMOJIS = ["🔥", "💪", "👏", "🫡", "❤️", "😝"];

type StoryImageStatus = "idle" | "loading" | "ready" | "error";

export interface StoryProof {
  proofId: string;
  userId: string;
  messageId: string | null;
  goalId: string;
  goalTitle: string;
  caption: string | null;
  imagePath: string;
  imageUrl: string | null;
  submittedAt: string;
  lateLabel?: string | null;
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
  onMemberPress?: () => void;
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

function clampStoryIndex(index: number, storyCount: number): number {
  if (storyCount <= 0) return 0;

  return Math.min(Math.max(index, 0), storyCount - 1);
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
  onMemberPress,
}: StoryViewerProps) {
  const insets = useSafeAreaInsets();
  const { group, user } = useAuth();
  const [index, setIndex] = useState(initialIndex);
  const [imageStatus, setImageStatus] = useState<StoryImageStatus>("idle");
  const [imageUrlOverrides, setImageUrlOverrides] = useState<
    Record<string, string>
  >({});
  const [activeStorySetKey, setActiveStorySetKey] = useState("");
  const [retryAttemptsByProofId, setRetryAttemptsByProofId] = useState<
    Record<string, number>
  >({});
  const [retryingProofId, setRetryingProofId] = useState<string | null>(null);
  const [messageIdsByProofId, setMessageIdsByProofId] = useState<
    Record<string, string>
  >({});
  const [activeReactionsByMessageId, setActiveReactionsByMessageId] = useState<
    Record<string, string[]>
  >({});
  const [reactingEmoji, setReactingEmoji] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const replyInputRef = useRef<TextInput>(null);
  const progressValueRef = useRef(0);
  const imageStatusRef = useRef<StoryImageStatus>("idle");
  const isPausedRef = useRef(false);
  const isAppActiveRef = useRef(true);
  const animationRunRef = useRef(0);
  const onCompleteRef = useRef(onComplete);
  const goNextRef = useRef<() => void>(() => {});
  const tapPressStartedAtRef = useRef<number | null>(null);
  const consumeNextTapZonePressRef = useRef(false);
  const isReplyInputFocusedRef = useRef(false);
  const replyInputBlurredAtRef = useRef(0);
  const viewedProofIdsRef = useRef(new Set<string>());
  const currentImageKeyRef = useRef<string | null>(null);
  const currentProofIdRef = useRef<string | null>(null);
  const imageResetKeyRef = useRef<string | null>(null);

  const storySetKey = useMemo(
    () => stories.map((story) => story.proofId).join("\n"),
    [stories],
  );
  const activeIndex =
    activeStorySetKey === storySetKey
      ? clampStoryIndex(index, stories.length)
      : clampStoryIndex(initialIndex, stories.length);
  const current = stories[activeIndex] ?? null;
  const currentProofId = current?.proofId ?? null;
  const currentMessageId = current
    ? (current.messageId ?? messageIdsByProofId[current.proofId] ?? null)
    : null;
  const currentImageUrl = current
    ? (imageUrlOverrides[current.proofId] ?? current.imageUrl)
    : null;
  const currentRetryAttempt = current
    ? (retryAttemptsByProofId[current.proofId] ?? 0)
    : 0;
  const currentImageKey = current
    ? `${current.proofId}:${currentRetryAttempt}`
    : null;
  const isRetryingCurrent = current
    ? retryingProofId === current.proofId
    : false;
  const currentActiveReactionEmojis = useMemo(
    () =>
      currentMessageId
        ? (activeReactionsByMessageId[currentMessageId] ?? [])
        : [],
    [activeReactionsByMessageId, currentMessageId],
  );
  const canMutateCurrentProof = Boolean(user && group && currentMessageId);
  const canSendReply =
    canMutateCurrentProof && replyText.trim().length > 0 && !sendingReply;
  const bottomControlPadding = keyboardVisible
    ? STORY_VIEWER_EDGE_PADDING
    : Math.max(insets.bottom, STORY_VIEWER_EDGE_PADDING);

  currentImageKeyRef.current = currentImageKey;
  currentProofIdRef.current = currentProofId;

  const storyImageUrlKey = useMemo(() => {
    const urls = stories
      .map((story) => imageUrlOverrides[story.proofId] ?? story.imageUrl)
      .filter((url): url is string => Boolean(url));

    return Array.from(new Set(urls)).join("\n");
  }, [imageUrlOverrides, stories]);
  const setImageStatusValue = useCallback((nextStatus: StoryImageStatus) => {
    imageStatusRef.current = nextStatus;
    setImageStatus(nextStatus);
  }, []);

  const stopProgressAtCurrentValue = useCallback(() => {
    animationRunRef.current += 1;
    progressAnimation.stopAnimation((value) => {
      progressValueRef.current = Math.min(Math.max(value, 0), 1);
    });
  }, [progressAnimation]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const subscriptions = [
      Keyboard.addListener("keyboardWillShow", () => setKeyboardVisible(true)),
      Keyboard.addListener("keyboardDidShow", () => setKeyboardVisible(true)),
      Keyboard.addListener("keyboardWillHide", () => setKeyboardVisible(false)),
      Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false)),
    ];

    return () => {
      subscriptions.forEach((subscription) => subscription.remove());
    };
  }, []);

  useLayoutEffect(() => {
    if (!visible) return;
    animationRunRef.current += 1;
    isPausedRef.current = false;
    progressValueRef.current = 0;
    progressAnimation.stopAnimation();
    progressAnimation.setValue(0);
    setImageStatusValue("idle");
    imageResetKeyRef.current = null;
    setActiveStorySetKey(storySetKey);
    setIndex(clampStoryIndex(initialIndex, stories.length));
  }, [
    initialIndex,
    progressAnimation,
    setImageStatusValue,
    stories.length,
    storySetKey,
    visible,
  ]);

  useLayoutEffect(() => {
    if (!visible || !currentProofId || !currentImageKey) return;

    if (imageResetKeyRef.current === currentImageKey) {
      if (currentImageUrl && imageStatusRef.current === "error") {
        setImageStatusValue("loading");
      }
      return;
    }

    imageResetKeyRef.current = currentImageKey;
    animationRunRef.current += 1;
    isPausedRef.current = false;
    progressValueRef.current = 0;
    progressAnimation.stopAnimation();
    progressAnimation.setValue(0);
    setImageStatusValue(currentImageUrl ? "loading" : "error");
  }, [
    currentProofId,
    currentImageKey,
    currentImageUrl,
    progressAnimation,
    setImageStatusValue,
    visible,
  ]);

  useEffect(() => {
    if (
      !visible ||
      imageStatus !== "ready" ||
      !current ||
      !user ||
      current.viewedByMe
    ) {
      return;
    }

    if (viewedProofIdsRef.current.has(current.proofId)) return;

    const proofId = current.proofId;
    viewedProofIdsRef.current.add(proofId);
    onProofViewed(proofId);

    supabase
      .from("proof_views")
      .upsert(
        { proof_id: proofId, viewer_id: user.id },
        { ignoreDuplicates: true, onConflict: "viewer_id,proof_id" },
      )
      .then(({ error }) => {
        if (error) {
          console.log("[stories] mark viewed error:", error.message);
        }
      });
  }, [current, imageStatus, onProofViewed, user, visible]);

  useEffect(() => {
    if (!visible || !current || !group || currentMessageId) return;

    let isCancelled = false;
    const proofId = current.proofId;

    supabase
      .from("messages")
      .select("id")
      .eq("group_id", group.id)
      .eq("proof_id", proofId)
      .eq("kind", "proof")
      .maybeSingle()
      .then(({ data, error }) => {
        if (isCancelled) return;

        if (error) {
          console.log("[stories] proof message lookup error:", error.message);
          return;
        }

        if (!data?.id) return;

        setMessageIdsByProofId((currentMessageIds) => ({
          ...currentMessageIds,
          [proofId]: data.id,
        }));
      });

    return () => {
      isCancelled = true;
    };
  }, [current, currentMessageId, group, visible]);

  useEffect(() => {
    if (!visible || !currentMessageId || !group || !user) return;

    let isCancelled = false;
    const messageId = currentMessageId;

    supabase
      .from("reactions")
      .select("emoji")
      .eq("message_id", messageId)
      .eq("group_id", group.id)
      .eq("user_id", user.id)
      .then(({ data, error }) => {
        if (isCancelled) return;

        if (error) {
          console.log("[stories] reaction fetch error:", error.message);
          return;
        }

        setActiveReactionsByMessageId((currentReactions) => ({
          ...currentReactions,
          [messageId]: (data ?? []).map((reaction) => reaction.emoji),
        }));
      });

    return () => {
      isCancelled = true;
    };
  }, [currentMessageId, group, user, visible]);

  useEffect(() => {
    setReplyText("");
  }, [currentProofId, visible]);

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
    if (activeIndex >= stories.length - 1) {
      requestAnimationFrame(() => onCompleteRef.current());
      return;
    }
    setIndex(activeIndex + 1);
  }, [activeIndex, resetProgress, stories.length]);

  useEffect(() => {
    goNextRef.current = goNext;
  }, [goNext]);

  const startProgressAnimation = useCallback(
    (fromValue = progressValueRef.current) => {
      if (
        !visible ||
        stories.length === 0 ||
        isPausedRef.current ||
        !isAppActiveRef.current ||
        imageStatusRef.current !== "ready"
      ) {
        return;
      }

      const normalizedValue = Math.min(Math.max(fromValue, 0), 1);
      const runId = animationRunRef.current + 1;
      const duration = Math.max(0, (1 - normalizedValue) * STORY_DURATION_MS);

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
    if (activeIndex === 0) {
      requestAnimationFrame(() => startProgressAnimation(0));
      return;
    }
    setIndex(activeIndex - 1);
  }, [activeIndex, resetProgress, startProgressAnimation]);

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

  const dismissReplyKeyboard = useCallback((consumeTapZonePress = false) => {
    const recentlyBlurred =
      Date.now() - replyInputBlurredAtRef.current <
      KEYBOARD_DISMISS_ACTION_GUARD_MS;

    if (!isReplyInputFocusedRef.current && !recentlyBlurred) return false;

    consumeNextTapZonePressRef.current = consumeTapZonePress;
    tapPressStartedAtRef.current = null;

    if (isReplyInputFocusedRef.current) {
      Keyboard.dismiss();
      replyInputRef.current?.blur();
    }

    return true;
  }, []);

  const handleReplyInputFocus = useCallback(() => {
    isReplyInputFocusedRef.current = true;
    replyInputBlurredAtRef.current = 0;
    pauseProgress();
  }, [pauseProgress]);

  const handleReplyInputBlur = useCallback(() => {
    isReplyInputFocusedRef.current = false;
    replyInputBlurredAtRef.current = Date.now();
    resumeProgress();
  }, [resumeProgress]);

  const runViewerAction = useCallback(
    (action: () => void | Promise<void>) => {
      if (dismissReplyKeyboard()) return;

      void action();
    },
    [dismissReplyKeyboard],
  );

  const handleTapZonePressIn = useCallback(() => {
    if (dismissReplyKeyboard(true)) return;

    tapPressStartedAtRef.current = Date.now();
    pauseProgress();
  }, [dismissReplyKeyboard, pauseProgress]);

  const handleTapZonePressOut = useCallback(() => {
    if (consumeNextTapZonePressRef.current) {
      requestAnimationFrame(() => {
        consumeNextTapZonePressRef.current = false;
      });
      return;
    }

    resumeProgress();
  }, [resumeProgress]);

  const handleTapZonePress = useCallback((action: () => void) => {
    if (consumeNextTapZonePressRef.current) {
      consumeNextTapZonePressRef.current = false;
      tapPressStartedAtRef.current = null;
      return;
    }

    const startedAt = tapPressStartedAtRef.current;
    tapPressStartedAtRef.current = null;

    if (startedAt !== null && Date.now() - startedAt > STORY_TAP_MAX_MS) {
      return;
    }

    action();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const isActive = nextState === "active";
      isAppActiveRef.current = isActive;

      if (!isActive) {
        stopProgressAtCurrentValue();
        return;
      }

      if (!isPausedRef.current && imageStatusRef.current === "ready") {
        startProgressAnimation(progressValueRef.current);
      }
    });

    return () => subscription.remove();
  }, [startProgressAnimation, stopProgressAtCurrentValue]);

  useEffect(() => {
    if (!visible || stories.length === 0) return;

    if (imageStatus !== "ready") {
      stopProgressAtCurrentValue();
      return;
    }

    startProgressAnimation(progressValueRef.current);

    return () => {
      animationRunRef.current += 1;
      progressAnimation.stopAnimation();
    };
  }, [
    currentImageKey,
    imageStatus,
    progressAnimation,
    startProgressAnimation,
    stopProgressAtCurrentValue,
    stories.length,
    visible,
  ]);

  const markImageReady = useCallback(
    (imageKey: string | null) => {
      if (!imageKey || currentImageKeyRef.current !== imageKey) return;

      setImageStatusValue("ready");
    },
    [setImageStatusValue],
  );

  const handleImageLoadStart = useCallback(
    (imageKey: string | null) => {
      if (!imageKey || currentImageKeyRef.current !== imageKey) return;
      if (imageStatusRef.current === "ready") return;

      setImageStatusValue("loading");
      stopProgressAtCurrentValue();
    },
    [setImageStatusValue, stopProgressAtCurrentValue],
  );

  const handleImageLoad = useCallback(
    (imageKey: string | null) => {
      requestAnimationFrame(() => markImageReady(imageKey));
    },
    [markImageReady],
  );

  const handleImageLoadEnd = useCallback(
    (imageKey: string | null) => {
      if (imageStatusRef.current === "error") return;

      requestAnimationFrame(() => markImageReady(imageKey));
    },
    [markImageReady],
  );

  const handleImageError = useCallback(
    (imageKey: string | null) => {
      if (!imageKey || currentImageKeyRef.current !== imageKey) return;

      setImageStatusValue("error");
      stopProgressAtCurrentValue();
    },
    [setImageStatusValue, stopProgressAtCurrentValue],
  );

  useEffect(() => {
    if (!visible || !currentImageKey || !currentImageUrl) return;

    let isCancelled = false;
    const imageKey = currentImageKey;

    Image.prefetch(currentImageUrl, "memory-disk")
      .then((prefetched) => {
        if (
          isCancelled ||
          !prefetched ||
          currentImageKeyRef.current !== imageKey ||
          imageStatusRef.current === "ready"
        ) {
          return;
        }

        markImageReady(imageKey);
      })
      .catch((error: unknown) => {
        console.log(
          "[stories] current image prefetch error:",
          error instanceof Error ? error.message : String(error),
        );
      });

    return () => {
      isCancelled = true;
    };
  }, [currentImageKey, currentImageUrl, markImageReady, visible]);

  const retryCurrentImage = useCallback(async () => {
    if (!current || retryingProofId === current.proofId) return;

    const proofId = current.proofId;
    setRetryingProofId(proofId);
    setImageStatusValue("loading");
    stopProgressAtCurrentValue();

    try {
      const { data: signedImage, error: signedImageError } =
        await supabase.storage
          .from("proofs")
          .createSignedUrl(current.imagePath, PROOF_IMAGE_URL_TTL_SECONDS);

      if (signedImageError) throw signedImageError;
      if (!signedImage?.signedUrl) {
        throw new Error("No signed proof image URL returned.");
      }

      setImageUrlOverrides((currentOverrides) => ({
        ...currentOverrides,
        [proofId]: signedImage.signedUrl,
      }));
      setRetryAttemptsByProofId((currentAttempts) => ({
        ...currentAttempts,
        [proofId]: (currentAttempts[proofId] ?? 0) + 1,
      }));
    } catch (error) {
      console.log(
        "[stories] proof image retry error:",
        error instanceof Error ? error.message : String(error),
      );

      if (currentProofIdRef.current === proofId) {
        setImageStatusValue("error");
      }
    } finally {
      setRetryingProofId((currentRetryingProofId) =>
        currentRetryingProofId === proofId ? null : currentRetryingProofId,
      );
    }
  }, [
    current,
    retryingProofId,
    setImageStatusValue,
    stopProgressAtCurrentValue,
  ]);

  const handleStoryReact = useCallback(
    async (emoji: string) => {
      if (!user || !group || !currentMessageId || reactingEmoji) return;

      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setReactingEmoji(emoji);

      const hasReaction = currentActiveReactionEmojis.includes(emoji);
      const mutation = hasReaction
        ? supabase
            .from("reactions")
            .delete()
            .eq("message_id", currentMessageId)
            .eq("group_id", group.id)
            .eq("user_id", user.id)
            .eq("emoji", emoji)
        : supabase.from("reactions").insert({
            message_id: currentMessageId,
            group_id: group.id,
            user_id: user.id,
            emoji,
          });

      const { error } = await mutation;

      if (error) {
        console.log("[stories] reaction error:", error.message);
        setReactingEmoji(null);
        return;
      }

      setActiveReactionsByMessageId((currentReactions) => {
        const currentEmojis = currentReactions[currentMessageId] ?? [];
        const nextEmojis = hasReaction
          ? currentEmojis.filter((currentEmoji) => currentEmoji !== emoji)
          : [...currentEmojis, emoji];

        return {
          ...currentReactions,
          [currentMessageId]: nextEmojis,
        };
      });

      setReactingEmoji(null);
    },
    [currentActiveReactionEmojis, currentMessageId, group, reactingEmoji, user],
  );

  const handleSendReply = useCallback(async () => {
    const body = replyText.trim();
    if (!body || !user || !group || !currentMessageId || sendingReply) return;

    setSendingReply(true);

    const { error } = await supabase.from("messages").insert({
      group_id: group.id,
      sender_id: user.id,
      kind: "text",
      body,
      reply_to_id: currentMessageId,
    });

    if (error) {
      console.log("[stories] reply send error:", error.message);
      setSendingReply(false);
      return;
    }

    setReplyText("");
    replyInputRef.current?.blur();
    setSendingReply(false);
  }, [currentMessageId, group, replyText, sendingReply, user]);

  const progressSegments = useMemo(
    () =>
      stories.map((story, storyIndex) => {
        const fill =
          storyIndex < activeIndex ? (
            <View style={[styles.progressFill, styles.progressFillComplete]} />
          ) : storyIndex === activeIndex ? (
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
    [activeIndex, progressAnimation, stories],
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
        <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
          <View style={styles.flex}>
            <View style={styles.imageWrapper}>
              {currentImageUrl ? (
                <Image
                  key={currentImageKey}
                  source={{ uri: currentImageUrl }}
                  cachePolicy="memory-disk"
                  contentFit="cover"
                  onDisplay={() => markImageReady(currentImageKey)}
                  onError={() => handleImageError(currentImageKey)}
                  onLoad={() => handleImageLoad(currentImageKey)}
                  onLoadEnd={() => handleImageLoadEnd(currentImageKey)}
                  onLoadStart={() => handleImageLoadStart(currentImageKey)}
                  priority="high"
                  recyclingKey={currentImageKey}
                  style={styles.imagePlaceholder}
                />
              ) : (
                <View style={styles.imagePlaceholder} />
              )}

              {imageStatus === "loading" ? (
                <View style={styles.statusOverlay} pointerEvents="none">
                  <ActivityIndicator color={Colours.text} />
                  <Text style={styles.statusText}>Loading proof...</Text>
                </View>
              ) : null}

              {imageStatus === "error" ? (
                <View style={styles.errorOverlay}>
                  <Text style={styles.errorTitle}>
                    Proof image did not load
                  </Text>
                  <Text style={styles.errorText}>
                    Retry the image or skip this proof.
                  </Text>
                  <View style={styles.errorActionRow}>
                    <TouchableOpacity
                      style={[styles.errorButton, styles.retryButton]}
                      onPress={retryCurrentImage}
                      disabled={isRetryingCurrent}
                    >
                      <Text style={styles.retryButtonText}>
                        {isRetryingCurrent ? "Retrying..." : "Retry"}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.errorButton}
                      onPress={goNext}
                    >
                      <Text style={styles.errorButtonText}>Skip</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}

              {imageStatus === "ready" && current.lateLabel ? (
                <View style={styles.lateWatermark} pointerEvents="none">
                  <Text style={styles.lateLabel} numberOfLines={1}>
                    {current.lateLabel}
                  </Text>
                </View>
              ) : null}

              <View style={styles.topOverlay} pointerEvents="box-none">
                <View style={styles.progressRow}>{progressSegments}</View>
                <View style={styles.header}>
                  <Pressable
                    style={styles.headerIdentity}
                    onPress={
                      onMemberPress
                        ? () => runViewerAction(onMemberPress)
                        : undefined
                    }
                    disabled={!onMemberPress}
                  >
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
                  </Pressable>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => runViewerAction(onClose)}
                  >
                    <XIcon size={20} color={Colours.text} weight="bold" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.tapZones} pointerEvents="box-none">
                <Pressable
                  style={styles.tapZone}
                  disabled={imageStatus === "error"}
                  onPress={() => handleTapZonePress(goBack)}
                  onPressIn={handleTapZonePressIn}
                  onPressOut={handleTapZonePressOut}
                />
                <Pressable
                  style={styles.tapZone}
                  disabled={imageStatus === "error"}
                  onPress={() => handleTapZonePress(goNext)}
                  onPressIn={handleTapZonePressIn}
                  onPressOut={handleTapZonePressOut}
                />
              </View>
            </View>

            <KeyboardStickyView style={styles.bottomSticky}>
              <View
                style={[
                  styles.bottomSection,
                  { paddingBottom: bottomControlPadding },
                ]}
              >
                {current.caption ? (
                  <Text style={styles.captionText} numberOfLines={2}>
                    {current.caption}
                  </Text>
                ) : null}

                <View style={styles.replyRow}>
                  <TextInput
                    ref={replyInputRef}
                    style={styles.replyInput}
                    placeholder={
                      canMutateCurrentProof
                        ? "Reply to proof..."
                        : "Proof replies unavailable"
                    }
                    placeholderTextColor={Colours.secondaryText}
                    value={replyText}
                    onChangeText={setReplyText}
                    editable={canMutateCurrentProof && !sendingReply}
                    returnKeyType="send"
                    onSubmitEditing={handleSendReply}
                    onFocus={handleReplyInputFocus}
                    onBlur={handleReplyInputBlur}
                  />
                  <TouchableOpacity
                    style={[
                      styles.sendButton,
                      !canSendReply && styles.sendButtonDisabled,
                    ]}
                    disabled={!canSendReply}
                    onPress={handleSendReply}
                  >
                    <PaperPlaneTiltIcon
                      size={18}
                      color={
                        canSendReply ? Colours.text : Colours.secondaryText
                      }
                      weight="fill"
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.reactionRow}>
                  {PROOF_EMOJIS.map((emoji) => {
                    const isActive =
                      currentActiveReactionEmojis.includes(emoji);

                    return (
                      <TouchableOpacity
                        key={emoji}
                        style={[
                          styles.reactionButton,
                          isActive && styles.reactionButtonActive,
                        ]}
                        disabled={
                          !canMutateCurrentProof || reactingEmoji !== null
                        }
                        onPress={() =>
                          runViewerAction(() => handleStoryReact(emoji))
                        }
                      >
                        <Text style={styles.reactionText}>{emoji}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </KeyboardStickyView>
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
    paddingHorizontal: STORY_VIEWER_EDGE_PADDING,
    paddingTop: STORY_VIEWER_EDGE_PADDING,
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
    zIndex: 4,
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
  lateWatermark: {
    position: "absolute",
    right: 18,
    bottom: 18,
    minHeight: 24,
    minWidth: 46,
    paddingHorizontal: 9,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255, 106, 0, 0.32)",
    backgroundColor: "rgba(255, 106, 0, 0.14)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 4,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.45,
    shadowRadius: 5,
    elevation: 3,
  },
  lateLabel: {
    color: Colours.brand,
    fontFamily: Fonts.medium,
    fontSize: 12,
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.72)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
    zIndex: 1,
  },
  tapZone: {
    flex: 1,
  },
  statusOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    backgroundColor: "rgba(10, 10, 10, 0.58)",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    zIndex: 2,
  },
  statusText: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: Colours.text,
  },
  errorOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    backgroundColor: "rgba(10, 10, 10, 0.78)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    zIndex: 3,
  },
  errorTitle: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    color: Colours.text,
    textAlign: "center",
  },
  errorText: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colours.secondaryText,
    textAlign: "center",
    marginTop: 8,
  },
  errorActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  errorButton: {
    minWidth: 92,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colours.cardHighlight,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  retryButton: {
    backgroundColor: Colours.text,
  },
  errorButtonText: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: Colours.text,
  },
  retryButtonText: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: Colours.background,
  },
  bottomSticky: {
    marginHorizontal: -STORY_VIEWER_EDGE_PADDING,
    paddingHorizontal: STORY_VIEWER_EDGE_PADDING,
    backgroundColor: Colours.background,
  },
  bottomSection: {
    paddingTop: 16,
  },
  captionText: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colours.text,
    marginBottom: 10,
  },
  replyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  replyInput: {
    flex: 1,
    height: 40,
    backgroundColor: Colours.cardHighlight,
    borderRadius: 20,
    paddingHorizontal: 14,
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colours.text,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colours.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: Colours.cardHighlight,
  },
  reactionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  reactionButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colours.cardHighlight,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  reactionButtonActive: {
    backgroundColor: "rgba(255, 106, 0, 0.14)",
    borderColor: Colours.brand,
  },
  reactionText: {
    fontSize: 22,
  },
});
