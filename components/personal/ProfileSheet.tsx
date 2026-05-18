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
import {
  AppWindowIcon,
  CaretRightIcon,
  CopyIcon,
  SignOutIcon,
  UserMinusIcon,
  UsersThreeIcon,
} from "phosphor-react-native";
import { Colours } from "../../constants/Colours";
import { Fonts } from "../../constants/Fonts";
import { useAuth } from "../../lib/AuthContext";
import {
  type AndroidAppInfo,
  blockApps,
  getBlockedApps,
  getInstalledApps,
  manageBlockedApps,
} from "../../modules/screen-time-locks";
import { supabase } from "../../lib/supabase";

const handleSignOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) console.log("Sign out failed:", error.message);
};

const PICKER_OPEN_HEIGHT = 0.7;
const PICKER_SEARCH_HEIGHT = 0.48;
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ProfileSheetProps {
  visible: boolean;
  onClose: () => void;
}

export default function ProfileSheet({ visible, onClose }: ProfileSheetProps) {
  const { group, user, refreshGroup } = useAuth();
  const { height: windowHeight } = useWindowDimensions();
  const searchInputRef = useRef<TextInput>(null);
  const pickerHeightProgress = useRef(
    new Animated.Value(PICKER_OPEN_HEIGHT),
  ).current;
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);
  const [showGroupOptions, setShowGroupOptions] = useState(false);
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
  const filteredAndroidApps = androidApps.filter((app) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;

    return (
      app.name.toLowerCase().includes(query) ||
      app.packageName.toLowerCase().includes(query)
    );
  });

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
        const result = await manageBlockedApps();
        if (result.cancelled) {
          console.log("User cancelled app picker");
          return;
        }
        console.log("Blocked", result.blocked, "apps");
      } catch (e) {
        console.log("Manage blocked apps failed:", e);
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

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet}>
          <Text style={styles.title}>Settings</Text>

          <TouchableOpacity style={styles.row} onPress={handleManageBlockedApps}>
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
