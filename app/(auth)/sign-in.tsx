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

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit =
    email.trim().length > 0 && password.length > 0 && !loading;

  const handleSignIn = async () => {
    setError(null);
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }
    // On success, AuthProvider's onAuthStateChange fires SIGNED_IN and the
    // root gate redirects to (app).
  };

  return (
    <SafeAreaView style={styles.container}>
      <Pressable style={styles.flex} onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.content}>
            <Text style={styles.title}>Welcome back</Text>

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
                textContentType="password"
                value={password}
                onChangeText={setPassword}
              />

              {error && <Text style={styles.error}>{error}</Text>}

              <TouchableOpacity
                style={[
                  styles.button,
                  !canSubmit && { backgroundColor: Colours.fadedBrand },
                ]}
                disabled={!canSubmit}
                onPress={handleSignIn}
              >
                <Text style={styles.buttonText}>
                  {loading ? "Signing in…" : "Sign in"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don&apos;t have an account? </Text>
              <Link href="/(auth)/sign-up" replace>
                <Text style={styles.link}>Sign up</Text>
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
