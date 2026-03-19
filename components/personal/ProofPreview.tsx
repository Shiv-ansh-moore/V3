import {
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import React from "react";
import { Image } from "expo-image";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { ArrowCounterClockwiseIcon, CheckIcon } from "phosphor-react-native";
import { Colours } from "../../constants/Colours";
import { Fonts } from "../../constants/Fonts";

interface ProofPreviewProps {
  photoUri: string;
  onRetake: () => void;
}

export default function ProofPreview({
  photoUri,
  onRetake,
}: ProofPreviewProps) {
  return (
    <SafeAreaProvider style={styles.absolute}>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView behavior="padding" style={styles.flex}>
          <Pressable style={styles.imageWrapper} onPress={Keyboard.dismiss}>
            <Image
              source={{ uri: photoUri }}
              contentFit="cover"
              style={styles.imagePlaceholder}
            />
          </Pressable>

          <View style={styles.bottomSection}>
            <TextInput
              style={styles.captionInput}
              placeholder="Add a caption..."
              placeholderTextColor={Colours.secondaryText}
            />

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.retakeButton} onPress={onRetake}>
                <ArrowCounterClockwiseIcon size={20} color={Colours.text} />
                <Text style={styles.buttonText}>Retake</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.sendButton}>
                <CheckIcon size={20} color={Colours.text} weight="bold" />
                <Text style={styles.buttonText}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  absolute: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  container: {
    flex: 1,
    backgroundColor: Colours.background,
    padding: 12,
  },
  flex: {
    flex: 1,
  },
  imageWrapper: {
    flex: 1,
  },
  imagePlaceholder: {
    flex: 1,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: Colours.background,
  },
  bottomSection: {
    paddingTop: 16,
    paddingBottom: 12,
  },
  captionInput: {
    height: 40,
    backgroundColor: Colours.cardHighlight,
    borderRadius: 20,
    paddingHorizontal: 14,
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colours.text,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  retakeButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colours.cardHighlight,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  sendButton: {
    flex: 2,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colours.brand,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  buttonText: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    color: Colours.text,
  },
});
