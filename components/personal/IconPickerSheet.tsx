import React, { useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Modal,
  Pressable,
  TextInput,
  FlatList,
  Keyboard,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { Colours } from "../../constants/Colours";
import { Fonts } from "../../constants/Fonts";
import GoalIcon from "./GoalIcon";
import { goalIconCatalog, goalIconMatchesSearch } from "./goalIconCatalog";

interface IconPickerPanelProps {
  onClose: () => void;
  onSelect: (iconName: string) => void;
}

interface IconPickerSheetProps extends IconPickerPanelProps {
  visible: boolean;
}

export function IconPickerPanel({
  onClose,
  onSelect,
}: IconPickerPanelProps) {
  const [search, setSearch] = useState("");
  const inputRef = useRef<TextInput>(null);

  const filtered = goalIconCatalog.filter((entry) =>
    goalIconMatchesSearch(entry, search),
  );

  const handleSelect = (name: string) => {
    onSelect(name);
    setSearch("");
  };

  const handleClose = () => {
    setSearch("");
    onClose();
  };

  return (
    <Pressable
      style={styles.overlay}
      onPress={() => {
        if (inputRef.current?.isFocused()) {
          Keyboard.dismiss();
        } else {
          handleClose();
        }
      }}
    >
      <KeyboardAvoidingView
        behavior="position"
        style={styles.avoidingView}
        contentContainerStyle={styles.avoidingContent}
      >
        <Pressable style={styles.sheet}>
          <Text style={styles.title}>Choose Icon</Text>
          <View style={styles.inputRow}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Search icons..."
              placeholderTextColor={Colours.secondaryText}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
          </View>
          <FlatList
            data={filtered}
            numColumns={4}
            keyExtractor={(item) => item.name}
            contentContainerStyle={styles.grid}
            columnWrapperStyle={styles.gridRow}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                style={styles.iconCell}
                onPress={() => handleSelect(item.name)}
              >
                <View style={styles.iconBox}>
                  <GoalIcon name={item.name} size={28} />
                </View>
                <Text style={styles.iconLabel} numberOfLines={1}>
                  {item.label}
                </Text>
              </Pressable>
            )}
          />
        </Pressable>
      </KeyboardAvoidingView>
    </Pressable>
  );
}

export default function IconPickerSheet({
  visible,
  onClose,
  onSelect,
}: IconPickerSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="none">
      <IconPickerPanel onClose={onClose} onSelect={onSelect} />
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
    maxHeight: "60%",
  },
  avoidingView: {
    flex: 1,
    width: "100%",
  },
  avoidingContent: {
    flex: 1,
    justifyContent: "flex-end",
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
  grid: {
    paddingHorizontal: 19,
    paddingBottom: 16,
  },
  gridRow: {
    gap: 12,
    marginBottom: 12,
  },
  iconCell: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: Colours.cardHighlight,
    alignItems: "center",
    justifyContent: "center",
  },
  iconLabel: {
    fontSize: 10,
    fontFamily: Fonts.regular,
    color: Colours.secondaryText,
    textAlign: "center",
  },
});
