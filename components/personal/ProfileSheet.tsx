import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  TouchableOpacity,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import * as Clipboard from "expo-clipboard";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { File } from "expo-file-system";
import {
  AppWindowIcon,
  CaretRightIcon,
  CameraIcon,
  CopyIcon,
  ImageIcon,
  SignOutIcon,
  UserMinusIcon,
  UserIcon,
  UsersThreeIcon,
} from "phosphor-react-native";
import { Colours } from "../../constants/Colours";
import { Fonts } from "../../constants/Fonts";
import { useAuth } from "../../lib/AuthContext";
import {
  type AndroidAppInfo,
  blockApps,
  getBlockedApps,
  getScreenTimeDiagnostics,
  getInstalledApps,
  manageBlockedApps,
  requestAuthorization,
} from "../../modules/screen-time-locks";
import { supabase } from "../../lib/supabase";

const handleSignOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) console.log("Sign out failed:", error.message);
};

const PICKER_OPEN_HEIGHT = 0.7;
const PICKER_SEARCH_HEIGHT = 0.48;
const PROFILE_AVATAR_SIZE = 96;
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function getInitial(displayName: string | null | undefined) {
  return displayName?.trim().charAt(0).toUpperCase() || "?";
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown error";
}

function formatScreenTimeDiagnostics() {
  const diagnostics = getScreenTimeDiagnostics();
  const savedTokens =
    (diagnostics.savedApplicationTokens ?? 0) +
    (diagnostics.savedCategoryTokens ?? 0) +
    (diagnostics.savedWebDomainTokens ?? 0);

  return [
    `Authorization: ${diagnostics.authorizationStatus}`,
    `App group: ${diagnostics.hasAppGroupDefaults ? "available" : "missing"}`,
    `Saved selections: ${savedTokens}`,
  ].join("\n");
}

interface ProfileSheetProps {
  visible: boolean;
  onClose: () => void;
}

export default function ProfileSheet({ visible, onClose }: ProfileSheetProps) {
  const { group, user, profile, refreshGroup, refreshProfile } = useAuth();
  const { height: windowHeight } = useWindowDimensions();
  const searchInputRef = useRef<TextInput>(null);
  const pickerHeightProgress = useRef(
    new Animated.Value(PICKER_OPEN_HEIGHT),
  ).current;
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);
  const [showGroupOptions, setShowGroupOptions] = useState(false);
  const [showPersonalSettings, setShowPersonalSettings] = useState(false);
  const [androidApps, setAndroidApps] = useState<AndroidAppInfo[]>([]);
  const [selectedPackages, setSelectedPackages] = useState<Set<string>>(
    new Set(),
  );
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerSaving, setPickerSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [copiedInviteCode, setCopiedInviteCode] = useState(false);
  const [leavingGroup, setLeavingGroup] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    profile?.avatar_url ?? null,
  );
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const filteredAndroidApps = androidApps.filter((app) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;

    return (
      app.name.toLowerCase().includes(query) ||
      app.packageName.toLowerCase().includes(query)
    );
  });
  const canSaveProfile =
    displayName.trim().length > 0 && !profileSaving && !avatarUploading;

  useEffect(() => {
    if (!visible) {
      setShowPersonalSettings(false);
      setAvatarPickerOpen(false);
      setShowGroupOptions(false);
      setShowAndroidPicker(false);
    }
  }, [visible]);

  useEffect(() => {
    if (!showPersonalSettings) return;
    setDisplayName(profile?.display_name ?? "");
    setAvatarUrl(profile?.avatar_url ?? null);
    setProfileError(null);
  }, [profile?.avatar_url, profile?.display_name, showPersonalSettings]);

  useEffect(() => {
    Animated.timing(pickerHeightProgress, {
      toValue: searchFocused ? PICKER_SEARCH_HEIGHT : PICKER_OPEN_HEIGHT,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [pickerHeightProgress, searchFocused]);

  const pickerAnimatedStyle = useMemo(
    () => ({
      height: pickerHeightProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, windowHeight],
      }),
    }),
    [pickerHeightProgress, windowHeight],
  );

  const handleManageBlockedApps = async () => {
    if (Platform.OS === "ios") {
      try {
        const authorizationStatus = await requestAuthorization();
        if (!authorizationStatus.toLowerCase().includes("approved")) {
          Alert.alert(
            "Screen Time not authorized",
            `${formatScreenTimeDiagnostics()}\n\nAllow V3App in Settings > Screen Time, then try again.`,
          );
          return;
        }

        const result = await manageBlockedApps();
        if (result.cancelled) {
          console.log("User cancelled app picker");
          return;
        }
        console.log("Blocked", result.blocked, "apps");
        Alert.alert(
          "Blocked apps saved",
          `Selected: ${result.blocked ?? 0}\n${formatScreenTimeDiagnostics()}`,
        );
      } catch (e) {
        console.log("Manage blocked apps failed:", e);
        Alert.alert(
          "Manage blocked apps failed",
          `${getErrorMessage(e)}\n\n${formatScreenTimeDiagnostics()}`,
        );
      }
      return;
    }

    setShowAndroidPicker(true);
    setSearchQuery("");
    setSearchFocused(false);
    setPickerLoading(true);
    try {
      const [apps, blocked] = await Promise.all([
        getInstalledApps(),
        getBlockedApps(),
      ]);
      setAndroidApps(apps);
      setSelectedPackages(new Set(blocked));
    } catch (e) {
      console.log("Load Android app picker failed:", e);
    } finally {
      setPickerLoading(false);
    }
  };

  const togglePackage = (packageName: string) => {
    setSelectedPackages((current) => {
      const next = new Set(current);
      if (next.has(packageName)) {
        next.delete(packageName);
      } else {
        next.add(packageName);
      }
      return next;
    });
  };

  const handleSaveAndroidPicker = async () => {
    setPickerSaving(true);
    try {
      const result = await blockApps(Array.from(selectedPackages));
      console.log("Blocked", result.blocked, "apps");
      setSearchFocused(false);
      setShowAndroidPicker(false);
    } catch (e) {
      console.log("Save blocked apps failed:", e);
    } finally {
      setPickerSaving(false);
    }
  };

  const openGroupOptions = () => {
    setCopiedInviteCode(false);
    setShowGroupOptions(true);
  };

  const closeGroupOptions = () => {
    setShowGroupOptions(false);
    setCopiedInviteCode(false);
  };

  const openPersonalSettings = () => {
    setDisplayName(profile?.display_name ?? "");
    setAvatarUrl(profile?.avatar_url ?? null);
    setProfileError(null);
    setShowPersonalSettings(true);
  };

  const closePersonalSettings = () => {
    if (profileSaving || avatarUploading) return;
    setShowPersonalSettings(false);
    setAvatarPickerOpen(false);
    setProfileError(null);
  };

  const uploadAvatar = async (uri: string) => {
    if (!user) return;
    setProfileError(null);
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
      setProfileError(e instanceof Error ? e.message : "Could not upload photo");
    } finally {
      setAvatarUploading(false);
    }
  };

  const pickAvatarFromLibrary = async () => {
    setAvatarPickerOpen(false);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setProfileError("Photo library access denied");
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

  const takeAvatarPhoto = async () => {
    setAvatarPickerOpen(false);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setProfileError("Camera access denied");
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

  const savePersonalSettings = async () => {
    if (!user || !canSaveProfile) return;

    const trimmedDisplayName = displayName.trim();
    if (!trimmedDisplayName) {
      setProfileError("Display name cannot be empty");
      return;
    }

    setProfileError(null);
    setProfileSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: trimmedDisplayName,
        avatar_url: avatarUrl,
      })
      .eq("id", user.id);

    if (error) {
      setProfileError(error.message);
      setProfileSaving(false);
      return;
    }

    await refreshProfile();
    setProfileSaving(false);
    setShowPersonalSettings(false);
  };

  const copyInviteCode = async () => {
    if (!group?.invite_code) return;
    await Clipboard.setStringAsync(group.invite_code);
    setCopiedInviteCode(true);
  };

  const leaveGroup = async () => {
    if (!group || !user || leavingGroup) return;

    setLeavingGroup(true);
    const { error } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", group.id)
      .eq("user_id", user.id);

    if (error) {
      Alert.alert("Could not leave group", error.message);
      setLeavingGroup(false);
      return;
    }

    closeGroupOptions();
    onClose();
    await refreshGroup();
    setLeavingGroup(false);
  };

  const confirmLeaveGroup = () => {
    Alert.alert(
      "Leave group?",
      "You will need an invite code to join a group again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: leaveGroup,
        },
      ],
    );
  };

  const handleModalRequestClose = () => {
    if (avatarPickerOpen) {
      setAvatarPickerOpen(false);
      return;
    }

    if (showPersonalSettings) {
      closePersonalSettings();
      return;
    }

    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleModalRequestClose}
    >
      {avatarPickerOpen ? (
        <Pressable
          style={styles.overlay}
          onPress={() => setAvatarPickerOpen(false)}
        >
          <Pressable style={styles.photoSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.photoSheetTitle}>Profile picture</Text>

            <TouchableOpacity
              style={styles.photoRow}
              onPress={takeAvatarPhoto}
              disabled={avatarUploading}
            >
              <View style={styles.photoIcon}>
                <CameraIcon size={22} color={Colours.brand} weight="regular" />
              </View>
              <Text style={styles.photoRowText}>Take photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.photoRow}
              onPress={pickAvatarFromLibrary}
              disabled={avatarUploading}
            >
              <View style={styles.photoIcon}>
                <ImageIcon size={22} color={Colours.brand} weight="regular" />
              </View>
              <Text style={styles.photoRowText}>Choose from library</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.photoCancel}
              onPress={() => setAvatarPickerOpen(false)}
            >
              <Text style={styles.photoCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      ) : showPersonalSettings ? (
        <Pressable style={styles.overlay} onPress={closePersonalSettings}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.profileAvoidingView}
          >
            <Pressable style={styles.sheet}>
              <Text style={styles.title}>Personal Settings</Text>

              <View style={styles.profileContent}>
                <TouchableOpacity
                  style={styles.avatarButton}
                  onPress={() => {
                    if (!avatarUploading) setAvatarPickerOpen(true);
                  }}
                  activeOpacity={0.8}
                >
                  {avatarUrl ? (
                    <Image
                      source={{ uri: avatarUrl }}
                      style={styles.avatarImage}
                      contentFit="cover"
                    />
                  ) : (
                    <Text style={styles.avatarInitial}>
                      {getInitial(displayName || profile?.username)}
                    </Text>
                  )}
                  {avatarUploading && (
                    <View style={styles.avatarOverlay}>
                      <ActivityIndicator color={Colours.text} />
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.changePhotoButton}
                  onPress={() => {
                    if (!avatarUploading) setAvatarPickerOpen(true);
                  }}
                  disabled={avatarUploading}
                >
                  <CameraIcon size={17} weight="bold" color={Colours.text} />
                  <Text style={styles.changePhotoText}>
                    {avatarUploading ? "Uploading" : "Change photo"}
                  </Text>
                </TouchableOpacity>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Display Name</Text>
                  <TextInput
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="Display name"
                    placeholderTextColor={Colours.secondaryText}
                    autoCapitalize="words"
                    autoCorrect={false}
                    maxLength={40}
                    style={styles.profileInput}
                  />
                </View>

                {profileError && (
                  <Text style={styles.profileError}>{profileError}</Text>
                )}

                <View style={styles.profileActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={closePersonalSettings}
                    disabled={profileSaving || avatarUploading}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      !canSaveProfile && styles.primaryButtonDisabled,
                    ]}
                    onPress={savePersonalSettings}
                    disabled={!canSaveProfile}
                  >
                    <Text style={styles.primaryButtonText}>
                      {profileSaving ? "Saving" : "Save"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      ) : (
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable style={styles.sheet}>
            <Text style={styles.title}>Settings</Text>

            <TouchableOpacity style={styles.row} onPress={openPersonalSettings}>
              <View style={styles.iconBox}>
                <UserIcon size={20} weight="bold" color={Colours.text} />
              </View>
              <Text style={styles.rowLabel}>Personal Settings</Text>
              <CaretRightIcon
                size={16}
                weight="bold"
                color={Colours.secondaryText}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.row}
              onPress={handleManageBlockedApps}
            >
              <View style={styles.iconBox}>
                <AppWindowIcon size={20} weight="bold" color={Colours.text} />
              </View>
              <Text style={styles.rowLabel}>Manage Blocked Apps</Text>
              <CaretRightIcon
                size={16}
                weight="bold"
                color={Colours.secondaryText}
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.row} onPress={openGroupOptions}>
              <View style={styles.iconBox}>
                <UsersThreeIcon size={20} weight="bold" color={Colours.text} />
              </View>
              <Text style={styles.rowLabel}>Group Options</Text>
              <CaretRightIcon
                size={16}
                weight="bold"
                color={Colours.secondaryText}
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.row} onPress={handleSignOut}>
              <View style={styles.iconBox}>
                <SignOutIcon size={20} weight="bold" color={Colours.text} />
              </View>
              <Text style={styles.rowLabel}>Sign out</Text>
              <CaretRightIcon
                size={16}
                weight="bold"
                color={Colours.secondaryText}
              />
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      )}

      <Modal visible={showAndroidPicker} transparent animationType="slide">
        <Pressable
          style={styles.overlay}
          onPress={() => {
            if (searchInputRef.current?.isFocused()) {
              Keyboard.dismiss();
            } else {
              setSearchFocused(false);
              setShowAndroidPicker(false);
            }
          }}
        >
          <KeyboardAvoidingView
            behavior="position"
            style={styles.pickerAvoidingView}
            contentContainerStyle={styles.pickerAvoidingContent}
          >
            <AnimatedPressable style={[styles.pickerSheet, pickerAnimatedStyle]}>
              <View style={styles.pickerHeader}>
                <View>
                  <Text style={styles.title}>Blocked Apps</Text>
                  <Text style={styles.subtitle}>
                    {selectedPackages.size} selected
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSaveAndroidPicker}
                  disabled={pickerSaving}
                >
                  <Text style={styles.saveButtonText}>
                    {pickerSaving ? "Saving" : "Save"}
                  </Text>
                </TouchableOpacity>
              </View>

              <TextInput
                ref={searchInputRef}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search apps"
                placeholderTextColor={Colours.secondaryText}
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                style={styles.searchInput}
              />

              {pickerLoading ? (
                <View style={styles.loadingState}>
                  <ActivityIndicator color={Colours.brand} />
                </View>
              ) : (
                <FlatList
                  style={styles.appListScroller}
                  data={filteredAndroidApps}
                  keyExtractor={(item) => item.packageName}
                  contentContainerStyle={styles.appList}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  extraData={selectedPackages}
                  renderItem={({ item }) => {
                    const selected = selectedPackages.has(item.packageName);
                    return (
                      <TouchableOpacity
                        style={styles.appRow}
                        onPress={() => togglePackage(item.packageName)}
                        activeOpacity={0.75}
                      >
                        <View
                          style={[
                            styles.checkbox,
                            selected && styles.checkboxSelected,
                          ]}
                        >
                          {selected && <View style={styles.checkboxDot} />}
                        </View>
                        <View style={styles.appTextBlock}>
                          <Text style={styles.appName}>{item.name}</Text>
                          <Text style={styles.packageName}>
                            {item.packageName}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  }}
                />
              )}
            </AnimatedPressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      <Modal
        visible={showGroupOptions}
        transparent
        animationType="slide"
        onRequestClose={closeGroupOptions}
      >
        <Pressable style={styles.overlay} onPress={closeGroupOptions}>
          <Pressable style={styles.sheet}>
            <Text style={styles.title}>Group Options</Text>

            <View style={styles.inviteSection}>
              <Text style={styles.sectionLabel}>Invite Code</Text>
              <View style={styles.codeRow}>
                <Text style={styles.codeText}>
                  {group?.invite_code ?? "Unavailable"}
                </Text>
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={copyInviteCode}
                  disabled={!group?.invite_code}
                >
                  <CopyIcon size={18} weight="bold" color={Colours.text} />
                  <Text style={styles.copyButtonText}>
                    {copiedInviteCode ? "Copied" : "Copy"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.row, styles.destructiveRow]}
              onPress={confirmLeaveGroup}
              disabled={!group || !user || leavingGroup}
            >
              <View style={[styles.iconBox, styles.destructiveIconBox]}>
                <UserMinusIcon size={20} weight="bold" color="#FF5A5A" />
              </View>
              <Text style={styles.destructiveLabel}>
                {leavingGroup ? "Leaving group..." : "Leave Group"}
              </Text>
              <CaretRightIcon size={16} weight="bold" color="#FF5A5A" />
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

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
  inviteSection: {
    paddingHorizontal: 19,
    paddingBottom: 14,
    gap: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: Colours.secondaryText,
    textTransform: "uppercase",
  },
  codeRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colours.cardHighlight,
    borderRadius: 10,
    paddingLeft: 14,
    paddingRight: 8,
  },
  codeText: {
    flex: 1,
    fontSize: 22,
    fontFamily: Fonts.bold,
    color: Colours.brand,
    letterSpacing: 3,
  },
  copyButton: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 8,
    backgroundColor: Colours.brand,
    paddingHorizontal: 12,
  },
  copyButtonText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: Colours.text,
  },
  destructiveRow: {
    marginTop: 2,
  },
  destructiveIconBox: {
    backgroundColor: "rgba(255,90,90,0.12)",
  },
  destructiveLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: Fonts.medium,
    color: "#FF5A5A",
  },
  profileAvoidingView: {
    flex: 1,
    justifyContent: "flex-end",
  },
  profileContent: {
    paddingHorizontal: 19,
    paddingBottom: 4,
    alignItems: "center",
  },
  avatarButton: {
    width: PROFILE_AVATAR_SIZE,
    height: PROFILE_AVATAR_SIZE,
    borderRadius: PROFILE_AVATAR_SIZE / 2,
    backgroundColor: Colours.cardHighlight,
    borderWidth: 1,
    borderColor: "#333",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginTop: 4,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarInitial: {
    fontSize: 34,
    fontFamily: Fonts.bold,
    color: Colours.brand,
  },
  avatarOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  changePhotoButton: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 8,
    backgroundColor: Colours.cardHighlight,
    paddingHorizontal: 14,
    marginTop: 12,
    marginBottom: 18,
  },
  changePhotoText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: Colours.text,
  },
  fieldGroup: {
    width: "100%",
    gap: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: Colours.secondaryText,
    textTransform: "uppercase",
  },
  profileInput: {
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: Colours.cardHighlight,
    paddingHorizontal: 14,
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: Colours.text,
  },
  profileError: {
    alignSelf: "flex-start",
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: "#FF5A5A",
    marginTop: 12,
  },
  profileActions: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  cancelButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: Colours.cardHighlight,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: Colours.text,
  },
  primaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: Colours.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonDisabled: {
    backgroundColor: Colours.fadedBrand,
    opacity: 0.75,
  },
  primaryButtonText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: Colours.text,
  },
  photoSheet: {
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
  photoSheetTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    color: Colours.text,
    paddingHorizontal: 7,
    marginBottom: 6,
  },
  photoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 7,
  },
  photoIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colours.cardHighlight,
    alignItems: "center",
    justifyContent: "center",
  },
  photoRowText: {
    fontFamily: Fonts.medium,
    fontSize: 15,
    color: Colours.text,
  },
  photoCancel: {
    marginTop: 4,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colours.cardHighlight,
  },
  photoCancelText: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    color: Colours.secondaryText,
  },
  pickerSheet: {
    backgroundColor: Colours.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
  },
  pickerAvoidingView: {
    flex: 1,
    width: "100%",
  },
  pickerAvoidingContent: {
    flex: 1,
    justifyContent: "flex-end",
  },
  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingRight: 19,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colours.secondaryText,
    paddingHorizontal: 19,
    marginTop: -8,
  },
  saveButton: {
    minWidth: 74,
    height: 38,
    borderRadius: 8,
    backgroundColor: Colours.brand,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  saveButtonText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: Colours.text,
  },
  loadingState: {
    height: 220,
    alignItems: "center",
    justifyContent: "center",
  },
  searchInput: {
    height: 42,
    marginHorizontal: 19,
    marginTop: 14,
    borderRadius: 8,
    backgroundColor: Colours.cardHighlight,
    paddingHorizontal: 12,
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Colours.text,
  },
  appList: {
    paddingHorizontal: 19,
    paddingTop: 12,
    paddingBottom: 12,
  },
  appListScroller: {
    flex: 1,
  },
  appRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colours.secondaryText,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: {
    borderColor: Colours.brand,
    backgroundColor: Colours.brand,
  },
  checkboxDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colours.text,
  },
  appTextBlock: {
    flex: 1,
  },
  appName: {
    fontSize: 15,
    fontFamily: Fonts.medium,
    color: Colours.text,
  },
  packageName: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colours.secondaryText,
    marginTop: 2,
  },
});
