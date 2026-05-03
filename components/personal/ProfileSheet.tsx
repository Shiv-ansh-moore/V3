import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity,
} from "react-native";
import {
  AppWindowIcon,
  CaretRightIcon,
  SignOutIcon,
} from "phosphor-react-native";
import { Colours } from "../../constants/Colours";
import { Fonts } from "../../constants/Fonts";
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

interface ProfileSheetProps {
  visible: boolean;
  onClose: () => void;
}

export default function ProfileSheet({ visible, onClose }: ProfileSheetProps) {
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);
  const [androidApps, setAndroidApps] = useState<AndroidAppInfo[]>([]);
  const [selectedPackages, setSelectedPackages] = useState<Set<string>>(
    new Set(),
  );
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerSaving, setPickerSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const filteredAndroidApps = androidApps.filter((app) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;

    return (
      app.name.toLowerCase().includes(query) ||
      app.packageName.toLowerCase().includes(query)
    );
  });

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
      setShowAndroidPicker(false);
    } catch (e) {
      console.log("Save blocked apps failed:", e);
    } finally {
      setPickerSaving(false);
    }
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
          onPress={() => setShowAndroidPicker(false)}
        >
          <Pressable style={styles.pickerSheet}>
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
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search apps"
              placeholderTextColor={Colours.secondaryText}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.searchInput}
            />

            {pickerLoading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator color={Colours.brand} />
              </View>
            ) : (
              <FlatList
                data={filteredAndroidApps}
                keyExtractor={(item) => item.packageName}
                contentContainerStyle={styles.appList}
                showsVerticalScrollIndicator={false}
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
  pickerSheet: {
    maxHeight: "82%",
    backgroundColor: Colours.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
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
