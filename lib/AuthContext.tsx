import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { Database } from "./database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Group = Database["public"]["Tables"]["groups"]["Row"];

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  group: Group | null;
  loading: boolean;
  groupLoading: boolean;
  refreshProfile: () => Promise<void>;
  refreshGroup: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [groupLoading, setGroupLoading] = useState(false);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (error) {
      console.log("[auth] profile fetch error:", error.message);
      return null;
    }
    return data;
  }, []);

  const fetchGroup = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("group_members")
      .select("group:groups(*)")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      console.log("[auth] group fetch error:", error.message);
      return null;
    }
    return data?.group ?? null;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!session?.user) return;
    const p = await fetchProfile(session.user.id);
    setProfile(p);
  }, [session?.user, fetchProfile]);

  const refreshGroup = useCallback(async () => {
    if (!session?.user) return;
    const g = await fetchGroup(session.user.id);
    setGroup(g);
  }, [session?.user, fetchGroup]);

  // Session hydration + auth event subscription
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((event, newSession) => {
      // TEMP — removed once full auth flow is stable
      console.log("[auth]", event, newSession?.user?.id ?? null);
      setSession(newSession);
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  // Profile fetched whenever session user changes
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    let cancelled = false;
    setProfileLoading(true);
    fetchProfile(userId).then((p) => {
      if (cancelled) return;
      setProfile(p);
      setProfileLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, fetchProfile]);

  // Group fetched whenever session user changes
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) {
      setGroup(null);
      setGroupLoading(false);
      return;
    }
    let cancelled = false;
    setGroupLoading(true);
    fetchGroup(userId).then((g) => {
      if (cancelled) return;
      setGroup(g);
      setGroupLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, fetchGroup]);

  const loading = sessionLoading || profileLoading || groupLoading;

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        group,
        loading,
        groupLoading,
        refreshProfile,
        refreshGroup,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
