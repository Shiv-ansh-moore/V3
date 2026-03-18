import { Modal, StyleSheet, Text, View } from "react-native";
import React from "react";
import { Colours } from "../../constants/Colours";
import { Fonts } from "../../constants/Fonts";

interface ProofCameraProps {
  visible: boolean;
  onClose: () => void;
}

export default function ProofCamera({ visible, onClose }: ProofCameraProps) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Proof Camera</Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colours.background,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 24,
    color: Colours.text,
  },
});
