import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React, { useRef, useState } from "react";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { LightningIcon, XIcon, CameraRotateIcon } from "phosphor-react-native";
import { CameraView, useCameraPermissions, CameraType, FlashMode } from "expo-camera";
import { Colours } from "../../constants/Colours";
import { Fonts } from "../../constants/Fonts";
import GoalIcon from "./GoalIcon";
import ProofPreview from "./ProofPreview";

interface ProofCameraProps {
  visible: boolean;
  goalName: string;
  goalIcon: string;
  onClose: () => void;
}

export default function ProofCamera({
  visible,
  goalName,
  goalIcon,
  onClose,
}: ProofCameraProps) {
  const cameraRef = useRef<CameraView>(null);
  const [animType, setAnimType] = useState<"fade" | "none">("fade");
  const [facing, setFacing] = useState<CameraType>("back");
  const [flash, setFlash] = useState<FlashMode>("off");
  const [showPreview, setShowPreview] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const handleClose = () => {
    setAnimType("none");
    requestAnimationFrame(() => {
      onClose();
      requestAnimationFrame(() => {
        setShowPreview(false);
        setPhotoUri(null);
        setAnimType("fade");
      });
    });
  };

  if (!permission) {
    return (
      <Modal
        visible={visible}
        animationType={animType}
        presentationStyle="fullScreen"
        onRequestClose={handleClose}
        onShow={() => setAnimType("fade")}
      >
        <View style={styles.permissionContainer} />
      </Modal>
    );
  }

  if (!permission.granted) {
    return (
      <Modal
        visible={visible}
        animationType={animType}
        presentationStyle="fullScreen"
        onRequestClose={handleClose}
        onShow={() => setAnimType("fade")}
      >
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>
            Camera access is needed to submit proof
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType={animType}
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
      onShow={() => setAnimType("fade")}
    >
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          {/* Viewfinder with header overlaid */}
          <View style={styles.viewfinderWrapper}>
            <CameraView ref={cameraRef} facing={facing} flash={flash} mirror style={styles.viewfinder} />
            <View style={styles.headerOverlay} pointerEvents="box-none">
              <View style={styles.header}>
                <View style={styles.headerSide} />
                <View style={styles.headerPill}>
                  <GoalIcon
                    name={goalIcon}
                    size={20}
                    color={Colours.brand}
                    weight="bold"
                  />
                  <Text style={styles.headerTitle}>{goalName}</Text>
                </View>
                <View style={styles.headerSide}>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={handleClose}
                  >
                    <XIcon size={20} color={Colours.text} weight="bold" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* Bottom controls */}
          <View style={styles.controls}>
            <TouchableOpacity
              style={styles.sideButton}
              onPress={() => setFlash((f) => (f === "off" ? "on" : "off"))}
            >
              <LightningIcon
                size={24}
                color={flash === "on" ? Colours.brand : Colours.text}
                weight={flash === "on" ? "fill" : "light"}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.captureOuter}
              onPress={async () => {
                const photo = await cameraRef.current?.takePictureAsync({
                  quality: 0.8,
                });
                if (photo) {
                  setPhotoUri(photo.uri);
                  setShowPreview(true);
                }
              }}
            >
              <View style={styles.captureInner} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sideButton}
              onPress={() => setFacing((f) => (f === "back" ? "front" : "back"))}
            >
              <CameraRotateIcon size={24} color={Colours.text} />
            </TouchableOpacity>
          </View>

          {showPreview && (
            <ProofPreview
              photoUri={photoUri!}
              onRetake={() => {
                setShowPreview(false);
                setPhotoUri(null);
              }}
            />
          )}
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const CAPTURE_OUTER = 80;
const CAPTURE_INNER = 64;
const SIDE_BUTTON = 48;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colours.background,
    padding: 12,
  },
  viewfinderWrapper: {
    flex: 1,
  },
  headerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  headerSide: {
    width: 36,
    alignItems: "flex-end",
  },
  headerPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colours.card,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    opacity: 0.85,
  },
  headerTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    color: Colours.text,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colours.card,
    justifyContent: "center",
    alignItems: "center",
    opacity: 0.85,
  },
  viewfinder: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
  },
  controls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 24,
    gap: 36,
  },
  sideButton: {
    width: SIDE_BUTTON,
    height: SIDE_BUTTON,
    borderRadius: SIDE_BUTTON / 2,
    backgroundColor: Colours.cardHighlight,
    justifyContent: "center",
    alignItems: "center",
  },
  captureOuter: {
    width: CAPTURE_OUTER,
    height: CAPTURE_OUTER,
    borderRadius: CAPTURE_OUTER / 2,
    borderWidth: 4,
    borderColor: Colours.text,
    justifyContent: "center",
    alignItems: "center",
  },
  captureInner: {
    width: CAPTURE_INNER,
    height: CAPTURE_INNER,
    borderRadius: CAPTURE_INNER / 2,
    backgroundColor: Colours.text,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: Colours.background,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  permissionText: {
    fontFamily: Fonts.medium,
    fontSize: 16,
    color: Colours.text,
    textAlign: "center",
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: Colours.brand,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  permissionButtonText: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    color: Colours.text,
  },
});
