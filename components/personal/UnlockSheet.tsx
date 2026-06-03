import React, { useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Alert,
  Modal,
  Pressable,
  TouchableOpacity,
  TextInput,
  Keyboard,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { Colours } from "../../constants/Colours";
import { Fonts } from "../../constants/Fonts";

const DURATIONS = [2, 5, 15, 30];

interface UnlockSheetProps {
  visible: boolean;
  onClose: () => void;
  onUnlock: (minutes: number, reason: string) => Promise<void> | void;
}

export default function UnlockSheet({
  visible,
  onClose,
  onUnlock,
}: UnlockSheetProps) {
  const [reason, setReason] = useState("");
  const inputRef = useRef<TextInput>(null);
  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const trimmedReason = reason.trim();
  const canUnlock =
    selectedMinutes !== null && trimmedReason.length > 0 && !loading;

  const handleUnlock = async () => {
    if (selectedMinutes === null || !trimmedReason) return;
    setLoading(true);
    try {
      await onUnlock(selectedMinutes, trimmedReason);
      setReason("");
      setSelectedMinutes(null);
      onClose();
    } catch (e) {
      console.log("Unlock failed:", e);
      Alert.alert(
        "Unlock failed",
        e instanceof Error ? e.message : "Could not unlock apps.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
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
        <KeyboardAvoidingView behavior={"padding"}>
          <Pressable style={styles.sheet}>
            <Text style={styles.title}>Unlock apps</Text>
            <Text style={styles.subtitle}>
              Why do you need to unlock? (required)
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Checking bank app..."
              placeholderTextColor={Colours.secondaryText}
              ref={inputRef}
              value={reason}
              onChangeText={setReason}
              maxLength={100}
            />

            <Text style={styles.subtitle}>For how long?</Text>
            <View style={styles.durationRow}>
              {DURATIONS.map((mins) => (
                <TouchableOpacity
                  key={mins}
                  style={[
                    styles.durationButton,
                    selectedMinutes === mins && styles.durationButtonActive,
                  ]}
                  onPress={() => setSelectedMinutes(mins)}
                >
                  <Text
                    style={[
                      styles.durationText,
                      selectedMinutes === mins && styles.durationTextActive,
                    ]}
                  >
                    {mins} min
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.confirmButton,
                !canUnlock && styles.confirmButtonDisabled,
              ]}
              onPress={handleUnlock}
              disabled={!canUnlock}
            >
              <Text style={styles.confirmText}>
                {loading ? "Unlocking..." : "Unlock"}
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
    paddingHorizontal: 19,
    paddingBottom: 34,
  },
  title: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: Colours.text,
    paddingTop: 16,
    paddingBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: Colours.secondaryText,
    marginTop: 12,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colours.cardHighlight,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Colours.text,
  },
  durationRow: {
    flexDirection: "row",
    gap: 10,
  },
  durationButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colours.cardHighlight,
    alignItems: "center",
    justifyContent: "center",
  },
  durationButtonActive: {
    backgroundColor: Colours.brand,
  },
  durationText: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
    color: Colours.secondaryText,
  },
  durationTextActive: {
    color: Colours.text,
  },
  confirmButton: {
    height: 48,
    borderRadius: 14,
    backgroundColor: Colours.brand,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  confirmButtonDisabled: {
    opacity: 0.4,
  },
  confirmText: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: Colours.text,
  },
});
