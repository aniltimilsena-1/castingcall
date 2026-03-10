import { createContext, useContext, useEffect, useState, ReactNode } from "react";
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

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    setProfile(data);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Real-time listener for profile changes (e.g., PRO upgrade)
    let profileSubscription: { unsubscribe: () => void } | null = null;
    if (user) {
      const channel = supabase
        .channel(`profile-${user.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `user_id=eq.${user.id}` },
          (payload) => {
            const newProfile = payload.new as Profile;
            const oldProfile = payload.old as Profile;

            setProfile(newProfile);
            // Only show toast if it's a meaningful change (like plan)
            if (oldProfile && oldProfile.plan !== newProfile.plan) {
              toast.success("Account status updated!");
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            profileSubscription = { unsubscribe: () => { supabase.removeChannel(channel); } };
          }
        });
    }

    return () => {
      if (profileSubscription) profileSubscription.unsubscribe();
    };
  }, [user]);

  const signUp = async (email: string, password: string, name: string, role: string) => {
    if (role === "Admin") throw new Error("Unauthorized role");
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role }, // Passed into auth metadata → DB trigger picks these up
      },
    });
    if (error) throw error;

    // Explicitly upsert the profile row with name + role using the returned user ID
    // This is more reliable than calling getUser() immediately after signUp
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
      options: {
        data: metadata
      }
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
      options: {
        redirectTo: window.location.origin,
      }
    });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
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
