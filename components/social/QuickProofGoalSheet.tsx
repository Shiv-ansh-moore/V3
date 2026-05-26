import React, { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { CameraIcon } from "phosphor-react-native";
import { Colours } from "../../constants/Colours";
import { Fonts } from "../../constants/Fonts";
import GoalIcon from "../personal/GoalIcon";
import { getGoalIconForTitle } from "../personal/goalIconCatalog";

export interface QuickProofGoalDraft {
  title: string;
  icon: string;
}

interface QuickProofGoalSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (draft: QuickProofGoalDraft) => void;
}

export default function QuickProofGoalSheet({
  visible,
  onClose,
  onSubmit,
}: QuickProofGoalSheetProps) {
  const [text, setText] = useState("");
  const inputRef = useRef<TextInput>(null);
  const title = text.trim();
  const icon = getGoalIconForTitle(title);
  const canContinue = title.length > 0;

  useEffect(() => {
    if (!visible) {
      setText("");
      return;
    }

    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    return () => cancelAnimationFrame(frame);
  }, [visible]);

  const handleSubmit = () => {
    if (!canContinue) return;

    onSubmit({ title, icon });
    setText("");
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.overlay}
        onPress={() => {
          if (inputRef.current?.isFocused()) {
            Keyboard.dismiss();
          } else {
            onClose();
          }
        }}
      >
        <KeyboardAvoidingView behavior="padding">
          <Pressable style={styles.sheet}>
            <Text style={styles.title}>Quick Proof</Text>
            <View style={styles.inputRow}>
              <View style={styles.iconBox}>
                <GoalIcon name={icon} size={22} />
              </View>
              <TextInput
                ref={inputRef}
                style={styles.input}
                placeholder="What did you do?"
                placeholderTextColor={Colours.secondaryText}
                value={text}
                onChangeText={setText}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
            </View>
            <TouchableOpacity
              style={[
                styles.continueButton,
                !canContinue && styles.continueButtonDisabled,
              ]}
              activeOpacity={0.85}
              onPress={handleSubmit}
              disabled={!canContinue}
            >
              <CameraIcon size={20} weight="bold" color={Colours.text} />
              <Text
                style={[
                  styles.continueText,
                  !canContinue && styles.continueTextDisabled,
                ]}
              >
                Take Proof
              </Text>
            </TouchableOpacity>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colours.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  title: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: Colours.text,
    paddingHorizontal: 19,
    paddingTop: 16,
    paddingBottom: 14,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 19,
    paddingBottom: 16,
    gap: 10,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colours.cardHighlight,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    height: 44,
    backgroundColor: Colours.cardHighlight,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Colours.text,
  },
  continueButton: {
    marginHorizontal: 19,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colours.brand,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  continueButtonDisabled: {
    backgroundColor: Colours.cardHighlight,
  },
  continueText: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
    color: Colours.text,
  },
  continueTextDisabled: {
    color: Colours.secondaryText,
  },
});
