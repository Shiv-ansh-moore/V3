import React from "react";
import {
  StyleSheet,
  Text,
  View,
  Modal,
  Pressable,
  TouchableOpacity,
} from "react-native";
import { AppWindowIcon, CaretRightIcon } from "phosphor-react-native";
import { Colours } from "../../constants/Colours";
import { Fonts } from "../../constants/Fonts";

interface ProfileSheetProps {
  visible: boolean;
  onClose: () => void;
}

export default function ProfileSheet({ visible, onClose }: ProfileSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet}>
          <Text style={styles.title}>Settings</Text>

          <TouchableOpacity style={styles.row} onPress={() => {}}>
            <View style={styles.iconBox}>
              <AppWindowIcon size={20} weight="bold" color={Colours.text} />
            </View>
            <Text style={styles.rowLabel}>Blocked Apps</Text>
            <CaretRightIcon
              size={16}
              weight="bold"
              color={Colours.secondaryText}
            />
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 19,
    paddingVertical: 12,
    gap: 12,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colours.cardHighlight,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: Fonts.medium,
    color: Colours.text,
  },
});
