import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string, name: string, role: string) => Promise<void>;
  signInWithOAuth: (provider: 'google') => Promise<void>;
  signInWithPhone: (phone: string, metadata?: Record<string, unknown>) => Promise<void>;
  verifyOTP: (phone: string, token: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  isPremium: boolean;
  isRecovering: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);
  const fetchingProfile = useRef<string | null>(null);

  const [isRecovering, setIsRecovering] = useState(false);

  const fetchProfile = useCallback(async (userId: string) => {
    if (fetchingProfile.current === userId) return;
    fetchingProfile.current = userId;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Profile fetch error:", error);
      }
      setProfile(data || null);
    } catch (err) {
      console.error("Unexpected profile fetch error:", err);
    } finally {
      fetchingProfile.current = null;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    let mounted = true;

    const safetyTimer = setTimeout(() => {
      if (mounted && loading) {
        console.warn("Auth initialization timed out; forcing app load.");
        setLoading(false);
      }
    }, 5500);

    const initialize = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (mounted) {
          if (error) console.error("Session fetch error:", error);
          
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          
          if (initialSession?.user) {
            await fetchProfile(initialSession.user.id);
          }
        }
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        if (mounted) {
          initialized.current = true;
          setLoading(false);
          clearTimeout(safetyTimer);
        }
      }
    };

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!mounted) return;

      const newUser = currentSession?.user ?? null;
      
      // ONLY update if the session or user ID actually changed to prevent flickering
      setSession(prev => (prev?.access_token === currentSession?.access_token ? prev : currentSession));
      setUser(prev => (prev?.id === newUser?.id ? prev : newUser));

      if (event === "PASSWORD_RECOVERY") {
        setIsRecovering(true);
      }

      if (event === "SIGNED_OUT") {
        setProfile(null);
        setIsRecovering(false);
        setLoading(false);
      } else if (newUser) {
        if (event === "USER_UPDATED") {
          setIsRecovering(false); 
        }
        // Only fetch profile if we don't have it or it's a different user
        if (initialized.current) {
          fetchProfile(newUser.id);
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = async (email: string, pass: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
  };

  const signUp = async (email: string, pass: string, name: string, role: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: { data: { name, role } },
    });
    if (error) throw error;
  };

  const signInWithOAuth = async (provider: 'google') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin }
    });
    if (error) throw error;
  };

  const signInWithPhone = async (phone: string, metadata?: Record<string, unknown>) => {
    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: { data: metadata }
    });
    if (error) throw error;
  };

  const verifyOTP = async (phone: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms'
    });
    if (error) throw error;
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/settings`,
    });
    if (error) throw error;
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setProfile(null);
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setLoading(false);
    }
  };

  const isPremium = profile?.plan === "pro" || profile?.role === "Admin";

  const value = {
    session,
    user,
    profile,
    loading,
    signOut,
    signIn,
    signUp,
    signInWithOAuth,
    signInWithPhone,
    verifyOTP,
    resetPassword,
    refreshProfile,
    isPremium,
    isRecovering,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
