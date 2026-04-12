import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";
import { AppState } from "react-native";
import { Database } from "./database.types";

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl as string;
const supabasePublishableKey = Constants.expoConfig?.extra
  ?.supabasePublishableKey as string;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    "Missing Supabase env vars. Check .env.local and app.config.ts.",
  );
}

export const supabase = createClient<Database>(
  supabaseUrl,
  supabasePublishableKey,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);
// Refresh the auth token whenever the app comes back to foreground.
// Without this, a long-backgrounded app will return with a stale token
// and the user's next request will silently fail with 401.
AppState.addEventListener("change", (state) => {
  if (state === "active") {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
