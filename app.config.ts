import { ExpoConfig, ConfigContext } from "expo/config";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (
  process.env.EAS_BUILD === "true" &&
  (!supabaseUrl || !supabasePublishableKey)
) {
  throw new Error(
    `Missing Supabase env vars for EAS ${
      process.env.EAS_BUILD_PROFILE ?? "unknown"
    } build. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY to the EAS environment used by this build profile.`,
  );
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? "V3App",
  slug: config.slug ?? "V3App",
  extra: {
    ...(config.extra ?? {}),
    supabaseUrl,
    supabasePublishableKey,
  },
});
