import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Modal,
  Pressable,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { Colours } from "../../constants/Colours";
import { Fonts } from "../../constants/Fonts";
import { unlockForDuration } from "../../modules/screen-time-locks";

const DURATIONS = [15, 30];

interface UnlockSheetProps {
  visible: boolean;
  onClose: () => void;
  onUnlock: (minutes: number, reason: string) => void;
}

export default function UnlockSheet({
  visible,
  onClose,
  onUnlock,
}: UnlockSheetProps) {
  const [reason, setReason] = useState("");
  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUnlock = async () => {
    if (!selectedMinutes) return;
    setLoading(true);
    try {
      await unlockForDuration(selectedMinutes);
      onUnlock(selectedMinutes, reason);
      setReason("");
      setSelectedMinutes(null);
      onClose();
    } catch (e) {
      console.log("Unlock failed:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet}>
          <Text style={styles.title}>Unlock apps</Text>
          <Text style={styles.subtitle}>Why do you need to unlock?</Text>

          <TextInput
            style={styles.input}
            placeholder="Checking bank app..."
            placeholderTextColor={Colours.secondaryText}
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
                  {mins}m
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[
              styles.confirmButton,
              (!selectedMinutes || loading) && styles.confirmButtonDisabled,
            ]}
            onPress={handleUnlock}
            disabled={!selectedMinutes || loading}
          >
            <Text style={styles.confirmText}>
              {loading ? "Unlocking..." : "Unlock"}
            </Text>
          </TouchableOpacity>
        </Pressable>
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
