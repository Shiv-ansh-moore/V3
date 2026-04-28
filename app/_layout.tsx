import { Stack, useRouter, useSegments } from "expo-router";
import {
  useFonts,
  Inter_100Thin,
  Inter_200ExtraLight,
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from "@expo-google-fonts/inter";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { AuthProvider, useAuth } from "../lib/AuthContext";
import { useEffect } from "react";

function RootNavigator() {
  const { session, profile, group, loading } = useAuth();
  const segments = useSegments() as string[];
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === "(auth)";
    const inCreateProfile = inAuthGroup && segments[1] === "create-profile";
    const inJoinGroup = inAuthGroup && segments[1] === "join-group";
    const profileComplete = !!profile?.display_name;

    if (!session) {
      if (!inAuthGroup || inCreateProfile || inJoinGroup) {
        router.replace("/(auth)/sign-in");
      }
    } else if (!profileComplete) {
      if (!inCreateProfile) {
        router.replace("/(auth)/create-profile");
      }
    } else if (!group) {
      if (!inJoinGroup) {
        router.replace("/(auth)/join-group");
      }
    } else if (inAuthGroup) {
      router.replace("/(app)");
    }
  }, [session, profile, group, loading, segments, router]);

  if (loading) return null;

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_100Thin,
    Inter_200ExtraLight,
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
  });

  if (!fontsLoaded) return null;

  return (
    <KeyboardProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </KeyboardProvider>
  );
}
