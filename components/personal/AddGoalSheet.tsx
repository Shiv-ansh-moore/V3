import { StyleSheet, Text, View, Modal } from "react-native";
import React from "react";
import { Colours } from "../../constants/Colours";
import { Fonts } from "../../constants/Fonts";

interface AddGoalSheetProps {
  visiable: boolean;
  onClose: () => void;
}

export default function AddGoalSheet() {
  return (
    <Modal>
      <View style={styles.overlay}>
        <View>
          <Text style={styles.title}>Test Modal</Text>
        </View>
      </View>
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
  },
  title: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: Colours.text,
    paddingHorizontal: 19,
    paddingTop: 16,
    paddingBottom: 14,
  },
});
