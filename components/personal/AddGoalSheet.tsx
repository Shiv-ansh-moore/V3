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
} from "react-native";
import { PlusIcon } from "phosphor-react-native";
import { Colours } from "../../constants/Colours";
import { Fonts } from "../../constants/Fonts";
import { StarIcon } from "phosphor-react-native";
interface AddGoalSheetProps {
  visible: boolean;
  onClose: () => void;
}

interface PendingGoal {
  id: string;
  title: string;
  icon: string; // Will be set up to auto match the word
}

export default function AddGoalSheet({ visible, onClose }: AddGoalSheetProps) {
  const [text, setText] = useState("");
  const inputRef = useRef<TextInput>(null);
  const [goals, setGoals] = useState<PendingGoal[]>([]);

  const handleAdd = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setGoals((prev) => [
      ...prev,
      { id: Date.now().toString(), title: trimmed, icon: "StarIcon" },
    ]);
    setText("");
  };
  const renderItem = ({ item }: { item: PendingGoal }) => (
    <Text style={styles.title}>{item.title}</Text>
  );

  return (
    <Modal visible={visible} transparent animationType="none">
      <Pressable style={styles.overlay} onPress={onClose}>
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
              returnKeyType="done"
            />
          </View>
          <FlatList
            data={goals}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
          />
          <Pressable
            style={styles.addGoalBtn}
            onPress={() => inputRef.current?.focus()}
          >
            <View style={styles.addGoalCircle}>
              <PlusIcon size={20} weight="bold" color={Colours.fadedBrand} />
            </View>
            {goals.length === 0 && (
              <Text style={styles.emptyText}>Add your goals</Text>
            )}
          </Pressable>

          <TouchableOpacity style={styles.saveButton} onPress={onClose}>
            <Text style={styles.saveButtonText}>Add Goals</Text>
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
});
