import React, { useState, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  Modal,
  Pressable,
  TextInput,
  TouchableOpacity,
  FlatList,
  Keyboard,
  Alert,
} from "react-native";
import { PlusIcon, XIcon } from "phosphor-react-native";
import { Colours } from "../../constants/Colours";
import { Fonts } from "../../constants/Fonts";
import GoalIcon from "./GoalIcon";
import IconPickerSheet from "./IconPickerSheet";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/AuthContext";

interface AddGoalSheetProps {
  visible: boolean;
  onClose: () => void;
  onGoalCreated?: () => void;
}

interface PendingGoal {
  id: string;
  title: string;
  icon: string; // Will be set up to auto match the word
}

export default function AddGoalSheet({
  visible,
  onClose,
  onGoalCreated,
}: AddGoalSheetProps) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const inputRef = useRef<TextInput>(null);
  const [goals, setGoals] = useState<PendingGoal[]>([]);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleAdd = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setGoals((prev) => [
      ...prev,
      { id: Date.now().toString(), title: trimmed, icon: "BarbellIcon" },
    ]);
    setText("");
  };
  const handleRemove = (id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  };

  const handleSave = async () => {
    if (goals.length === 0 || !user || saving) return;
    setSaving(true);
    const { error } = await supabase.from("goals").insert(
      goals.map((g) => ({
        user_id: user.id,
        title: g.title,
        icon: g.icon,
        status: "active",
      })),
    );
    setSaving(false);
    if (error) {
      console.log("[goals] insert error:", error.message);
      Alert.alert("Could not save goals", error.message);
      return;
    }
    setGoals([]);
    setText("");
    onGoalCreated?.();
    onClose();
  };

  const renderItem = ({ item }: { item: PendingGoal }) => (
    <View style={styles.pendingRow}>
      <Pressable
        style={styles.pendingIconBox}
        onPress={() => setEditingGoalId(item.id)}
      >
        <GoalIcon name={item.icon} size={24} />
      </Pressable>
      <Text style={styles.pendingTitle}>{item.title}</Text>
      <Pressable onPress={() => handleRemove(item.id)} style={styles.removeBtn}>
        <XIcon size={16} weight="bold" color={Colours.secondaryText} />
      </Pressable>
    </View>
  );

  return (
    <>
      <Modal visible={visible} transparent animationType="none">
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
              <Text style={styles.title}>New Goals</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Gym"
                  placeholderTextColor={Colours.secondaryText}
                  ref={inputRef}
                  value={text}
                  onChangeText={setText}
                  onSubmitEditing={handleAdd}
                  blurOnSubmit={false}
                  returnKeyType="done"
                />
              </View>
              <FlatList
                data={goals}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
              />
              {goals.length === 0 && (
                <Pressable
                  style={styles.addGoalBtn}
                  onPress={() => inputRef.current?.focus()}
                >
                  <View style={styles.addGoalCircle}>
                    <PlusIcon
                      size={20}
                      weight="bold"
                      color={Colours.fadedBrand}
                    />
                  </View>
                  <Text style={styles.emptyText}>Add your goals</Text>
                </Pressable>
              )}
              <TouchableOpacity
                onPress={handleSave}
                disabled={goals.length === 0 || saving}
                style={[
                  styles.saveButton,
                  (goals.length === 0 || saving) && {
                    backgroundColor: Colours.cardHighlight,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.saveButtonText,
                    (goals.length === 0 || saving) && {
                      color: Colours.secondaryText,
                    },
                  ]}
                >
                  {saving
                    ? "Saving…"
                    : goals.length === 0
                      ? "Add Goals"
                      : `Add Goals (${goals.length})`}
                </Text>
              </TouchableOpacity>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
      <IconPickerSheet
        visible={editingGoalId !== null}
        onClose={() => setEditingGoalId(null)}
        onSelect={(iconName) => {
          setGoals((prev) =>
            prev.map((g) =>
              g.id === editingGoalId ? { ...g, icon: iconName } : g,
            ),
          );
          setEditingGoalId(null);
        }}
      />
    </>
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
    paddingHorizontal: 19,
    paddingBottom: 16,
  },
  input: {
    width: "100%",
    height: 44,
    backgroundColor: Colours.cardHighlight,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Colours.text,
  },
  saveButton: {
    marginHorizontal: 19,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colours.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
    color: Colours.text,
  },
  addGoalBtn: {
    paddingVertical: 24,
    alignItems: "center",
    gap: 8,
  },
  addGoalCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: Colours.fadedBrand,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: "#555",
  },
  pendingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 19,
    marginBottom: 14,
    gap: 12,
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colours.cardHighlight,
    alignItems: "center",
    justifyContent: "center",
  },
  pendingTitle: {
    flex: 1,
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: Colours.text,
  },
  pendingIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colours.cardHighlight,
    alignItems: "center",
    justifyContent: "center",
  },
});
