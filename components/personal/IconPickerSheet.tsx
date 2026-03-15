import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Modal,
  Pressable,
  TextInput,
  FlatList,
} from "react-native";
import { Colours } from "../../constants/Colours";
import { Fonts } from "../../constants/Fonts";
import GoalIcon, { iconMap } from "./GoalIcon";

const iconNames = Object.keys(iconMap);

interface IconPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (iconName: string) => void;
}

export default function IconPickerSheet({
  visible,
  onClose,
  onSelect,
}: IconPickerSheetProps) {
  const [search, setSearch] = useState("");

  const filtered = iconNames.filter((name) =>
    name.toLowerCase().includes(search.toLowerCase())
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
    <Modal visible={visible} transparent animationType="none">
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.sheet}>
          <Text style={styles.title}>Choose Icon</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Search icons..."
              placeholderTextColor={Colours.secondaryText}
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <FlatList
            data={filtered}
            numColumns={4}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.grid}
            columnWrapperStyle={styles.gridRow}
            renderItem={({ item }) => (
              <Pressable
                style={styles.iconCell}
                onPress={() => handleSelect(item)}
              >
                <View style={styles.iconBox}>
                  <GoalIcon name={item} size={28} />
                </View>
                <Text style={styles.iconLabel} numberOfLines={1}>
                  {item.replace("Icon", "").replace("Logo", "")}
                </Text>
              </Pressable>
            )}
          />
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
    maxHeight: "60%",
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
