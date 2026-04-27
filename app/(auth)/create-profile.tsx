import { useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { CameraIcon, ImageIcon } from "phosphor-react-native";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { File } from "expo-file-system";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colours } from "../../constants/Colours";
import { Fonts } from "../../constants/Fonts";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/AuthContext";

const normaliseUsername = (raw: string) =>
  raw.toLowerCase().replace(/\s+/g, "");

const AVATAR_SIZE = 112;

export default function CreateProfile() {
  const { user, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit =
    displayName.trim().length > 0 &&
    username.trim().length > 0 &&
    !loading &&
    !avatarUploading;

  const uploadAvatar = async (uri: string) => {
    if (!user) return;
    setError(null);
    setAvatarUploading(true);
    try {
      const ref = await ImageManipulator.manipulate(uri)
        .resize({ width: 512, height: 512 })
        .renderAsync();
      const resized = await ref.saveAsync({
        compress: 0.85,
        format: SaveFormat.JPEG,
      });
      const arrayBuffer = await new File(resized.uri).arrayBuffer();
      const path = `${user.id}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, arrayBuffer, {
          contentType: "image/jpeg",
          upsert: true,
        });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(`${data.publicUrl}?v=${Date.now()}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not upload photo");
    } finally {
      setAvatarUploading(false);
    }
  };

  const pickFromLibrary = async () => {
    setPickerOpen(false);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError("Photo library access denied");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled) {
      await uploadAvatar(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    setPickerOpen(false);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setError("Camera access denied");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
      cameraType: ImagePicker.CameraType.front,
    });
    if (!result.canceled) {
      await uploadAvatar(result.assets[0].uri);
    }
  };

  const handleAvatarPress = () => {
    if (avatarUploading) return;
    setPickerOpen(true);
  };

  const handleSubmit = async () => {
    if (!user) return;
    setError(null);

    const trimmedDisplay = displayName.trim();
    const normalised = normaliseUsername(username);

    if (normalised.length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        display_name: trimmedDisplay,
        username: normalised,
        ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
      })
      .eq("id", user.id);

    if (updateError) {
      setLoading(false);
      if (updateError.code === "23505") {
        setError("That username is already taken");
      } else {
        setError(updateError.message);
      }
      return;
    }

    await refreshProfile();
    // Gate redirects to (app) once profile.display_name is set.
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Pressable style={styles.flex} onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.content}>
            <Text style={styles.title}>Set up your profile</Text>
            <Text style={styles.subtitle}>
              This is how your friends will see you.
            </Text>

            <View style={styles.avatarWrapper}>
              <TouchableOpacity
                style={styles.avatar}
                onPress={handleAvatarPress}
                activeOpacity={0.8}
              >
                {avatarUrl ? (
                  <Image
                    source={{ uri: avatarUrl }}
                    style={styles.avatarImage}
                    contentFit="cover"
                  />
                ) : (
                  <CameraIcon
                    size={32}
                    color={Colours.secondaryText}
                    weight="regular"
                  />
                )}
                {avatarUploading && (
                  <View style={styles.avatarOverlay}>
                    <ActivityIndicator color={Colours.text} />
                  </View>
                )}
              </TouchableOpacity>
              <Text style={styles.avatarHint}>
                {avatarUrl ? "Tap to change" : "Add a photo"}
              </Text>
            </View>

            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Display name"
                placeholderTextColor={Colours.secondaryText}
                autoCapitalize="words"
                autoCorrect={false}
                value={displayName}
                onChangeText={setDisplayName}
                maxLength={40}
              />
              <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor={Colours.secondaryText}
                autoCapitalize="none"
                autoCorrect={false}
                value={username}
                onChangeText={(v) => setUsername(normaliseUsername(v))}
                maxLength={24}
              />

              {error && <Text style={styles.error}>{error}</Text>}

              <TouchableOpacity
                style={[
                  styles.button,
                  !canSubmit && { backgroundColor: Colours.fadedBrand },
                ]}
                disabled={!canSubmit}
                onPress={handleSubmit}
              >
                <Text style={styles.buttonText}>
                  {loading ? "Saving…" : "Continue"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Pressable>

      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable
          style={styles.sheetOverlay}
          onPress={() => setPickerOpen(false)}
        >
          <Pressable style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Profile picture</Text>

            <TouchableOpacity style={styles.sheetRow} onPress={takePhoto}>
              <View style={styles.sheetIcon}>
                <CameraIcon size={22} color={Colours.brand} weight="regular" />
              </View>
              <Text style={styles.sheetRowText}>Take photo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetRow} onPress={pickFromLibrary}>
              <View style={styles.sheetIcon}>
                <ImageIcon size={22} color={Colours.brand} weight="regular" />
              </View>
              <Text style={styles.sheetRowText}>Choose from library</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetCancel}
              onPress={() => setPickerOpen(false)}
            >
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colours.background,
  },
  flex: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 64,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 28,
    color: Colours.text,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: Colours.secondaryText,
    marginBottom: 32,
  },
  avatarWrapper: {
    alignItems: "center",
    marginBottom: 32,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: Colours.card,
    borderWidth: 1,
    borderColor: "#222",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarHint: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: Colours.secondaryText,
    marginTop: 10,
  },
  form: {
    gap: 12,
  },
  input: {
    backgroundColor: Colours.card,
    borderWidth: 1,
    borderColor: "#222",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: Fonts.regular,
    fontSize: 16,
    color: Colours.text,
  },
  error: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: "#FF5A5A",
    marginTop: 4,
  },
  button: {
    backgroundColor: Colours.brand,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    color: Colours.text,
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colours.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingBottom: 34,
    paddingHorizontal: 12,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colours.cardHighlight,
    marginBottom: 12,
  },
  sheetTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: Colours.secondaryText,
    textAlign: "center",
    marginBottom: 12,
  },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 14,
  },
  sheetIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colours.cardHighlight,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetRowText: {
    fontFamily: Fonts.medium,
    fontSize: 16,
    color: Colours.text,
  },
  sheetCancel: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colours.cardHighlight,
    alignItems: "center",
  },
  sheetCancelText: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    color: Colours.text,
  },
});
