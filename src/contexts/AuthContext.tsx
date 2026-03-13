import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";

type Profile = Tables<"profiles">;

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isPremium: boolean;
  signUp: (email: string, password: string, name: string, role: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithPhone: (phone: string, metadata?: { name: string, role: string }) => Promise<void>;
  verifyOTP: (phone: string, token: string) => Promise<void>;
  signInWithOAuth: (provider: 'google' | 'facebook') => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Profile fetch error:", error);
        return null;
      }
      return data;
    } catch (err) {
      console.error("Unexpected fetchProfile error:", err);
      return null;
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;

    // Step 1: Get existing session first (synchronous local check via Supabase)
    const initAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();

        if (!isMounted.current) return;

        if (initialSession?.user) {
          setSession(initialSession);
          setUser(initialSession.user);
          // Fetch profile before clearing loading state
          const profileData = await fetchProfile(initialSession.user.id);
          if (isMounted.current) {
            setProfile(profileData);
          }
        }
      } catch (err) {
        console.error("Session initialization error:", err);
      } finally {
        // Always clear loading after initial check
        if (isMounted.current) {
          setLoading(false);
        }
      }
    };

    initAuth();

    // Step 2: Listen for auth state changes AFTER initial load
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!isMounted.current) return;

        // Update session and user immediately
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (event === 'SIGNED_OUT') {
          setProfile(null);
          return;
        }

        if (newSession?.user) {
          const profileData = await fetchProfile(newSession.user.id);
          if (isMounted.current) {
            setProfile(profileData);
          }
        } else {
          setProfile(null);
        }
      }
    );

    // Safety net: force loading off after 3 seconds max (reduced from 5)
    const safetyTimer = setTimeout(() => {
      if (isMounted.current && loading) {
        setLoading(false);
      }
    }, 3000);

    return () => {
      isMounted.current = false;
      subscription.unsubscribe();
      clearTimeout(safetyTimer);
    };
  }, [fetchProfile]);

  // Real-time profile update listener
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`profile-realtime-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newProfile = payload.new as Profile;
          const oldProfile = payload.old as Profile;
          setProfile(newProfile);
          if (oldProfile?.plan !== newProfile.plan) {
            toast.success("Account status updated!");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const signUp = async (email: string, password: string, name: string, role: string) => {
    if (role === "Admin") throw new Error("Unauthorized role");
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role } },
    });
    if (error) throw error;

    const newUserId = data.user?.id;
    if (newUserId) {
      await supabase
        .from("profiles")
        .upsert({ user_id: newUserId, name, role, email }, { onConflict: "user_id" });
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signInWithPhone = async (phone: string, metadata?: { name: string, role: string }) => {
    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: { data: metadata }
    });
    if (error) throw error;
  };

  const verifyOTP = async (phone: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
    if (error) throw error;
  };

  const signInWithOAuth = async (provider: 'google' | 'facebook') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin }
    });
    if (error) throw error;
  };

  const signOut = async () => {
    setProfile(null);
    setUser(null);
    setSession(null);
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      if (isMounted.current) setProfile(profileData);
    }
  };

  const isPremium = profile?.role === "Admin" || profile?.plan === "pro";

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, isPremium, signUp, signIn, signInWithPhone, verifyOTP, signInWithOAuth, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
