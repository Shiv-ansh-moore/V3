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
import { Link } from "expo-router";
import { Colours } from "../../constants/Colours";
import { Fonts } from "../../constants/Fonts";
import { supabase } from "../../lib/supabase";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit =
    email.trim().length > 0 &&
    password.length > 0 &&
    confirm.length > 0 &&
    !loading;

  const handleSignUp = async () => {
    setError(null);

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    // On success, AuthProvider's onAuthStateChange fires SIGNED_IN and the
    // root gate redirects to (app). Nothing to do here.
  };

  return (
    <SafeAreaView style={styles.container}>
      <Pressable style={styles.flex} onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.content}>
            <Text style={styles.title}>Create account</Text>

            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={Colours.secondaryText}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                value={email}
                onChangeText={setEmail}
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={Colours.secondaryText}
                secureTextEntry
                autoCapitalize="none"
                textContentType="newPassword"
                value={password}
                onChangeText={setPassword}
              />
              <TextInput
                style={styles.input}
                placeholder="Confirm password"
                placeholderTextColor={Colours.secondaryText}
                secureTextEntry
                autoCapitalize="none"
                textContentType="newPassword"
                value={confirm}
                onChangeText={setConfirm}
              />

              {error && <Text style={styles.error}>{error}</Text>}

              <TouchableOpacity
                style={[
                  styles.button,
                  !canSubmit && { backgroundColor: Colours.fadedBrand },
                ]}
                disabled={!canSubmit}
                onPress={handleSignUp}
              >
                <Text style={styles.buttonText}>
                  {loading ? "Creating account…" : "Sign up"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <Link href="/(auth)/sign-in" replace>
                <Text style={styles.link}>Sign in</Text>
              </Link>
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
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  footerText: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colours.secondaryText,
  },
  link: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: Colours.brand,
  },
});
