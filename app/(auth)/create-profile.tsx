import { useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colours } from "../../constants/Colours";
import { Fonts } from "../../constants/Fonts";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/AuthContext";

const normaliseUsername = (raw: string) =>
  raw.toLowerCase().replace(/\s+/g, "");

export default function CreateProfile() {
  const { user, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit =
    displayName.trim().length > 0 &&
    username.trim().length > 0 &&
    !loading;

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
});
