import { useState, useRef } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Phone, Mail, ArrowRight, ChevronLeft, Star } from "lucide-react";
import { loggingService } from "@/services/loggingService";
import { rateLimitService } from "@/services/rateLimitService";

interface AuthPageProps {
  onSuccess: () => void;
  onBack?: () => void;
}

const ROLES = ["Actor", "Director", "Singer", "Choreographer", "Producer", "Casting Director"];

export default function AuthPage({ onSuccess, onBack }: AuthPageProps) {
  const { signIn, signUp, signInWithOAuth, signInWithPhone, verifyOTP, resetPassword } = useAuth();
  const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  const [tab, setTab] = useState<"login" | "signup" | "reset">("login");
  const [authMethod, setAuthMethod] = useState<"email" | "phone">("email");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  // login fields
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");

  // reset fields
  const [resetEmail, setResetEmail] = useState("");

  // signup fields
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPass, setSignupPass] = useState("");
  const [signupConfirmPass, setSignupConfirmPass] = useState("");
  const [signupRole, setSignupRole] = useState("");
  const [showPass, setShowPass] = useState(false);
  
  // security / rate limiting
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);

  // phone fields
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");

  const handleOAuthClick = async (provider: 'google') => {
    setLoading(true);
    try {
      await signInWithOAuth(provider);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "OAuth failed");
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetEmail) { toast.error("Please enter your email"); return; }
    setLoading(true);
    try {
      await resetPassword(resetEmail);
      toast.success("Password reset link sent to your email! 📧");
      setTab("login");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (tab === "reset") {
      await handleResetPassword();
      return;
    }

    const identifier = authMethod === "email" 
      ? (tab === "login" ? loginEmail : signupEmail)
      : phone;

    if (!identifier) { toast.error("Please enter email or phone"); return; }

    // 1. Rate Limit Check (Server-side RPC)
    const isLimited = await rateLimitService.checkRateLimit(identifier);
    if (isLimited) return;

    // 2. Bot Protection (Cloudflare Turnstile)
    // If we've failed 3+ times, require a fresh token
    if (failedAttempts >= 3 && !captchaToken) {
        toast.error("Bot protection required. Please complete the security check.");
        return;
    }

    setLoading(true);
    try {
      const captchaOptions = captchaToken ? { captchaToken } : {};
      
      if (authMethod === "phone") {
        if (!otpSent) {
          if (!phone) { toast.error("Enter phone number"); return; }
          const metadata = tab === "signup" ? { name: signupName, role: signupRole } : undefined;
          if (tab === "signup" && (!signupName || !signupRole)) { toast.error("Please fill Name and Role"); return; }
          await signInWithPhone(phone, metadata);
          setOtpSent(true);
          toast.success("OTP sent to your phone! 📱");
        } else {
          if (!otp) { toast.error("Enter verification code"); return; }
          await verifyOTP(phone, otp);
          await rateLimitService.recordAttempt(identifier, true, 'login_phone');
          toast.success(`Welcome ${tab === "login" ? "back" : ""}! 🎉`);
          onSuccess();
        }
      } else {
        if (tab === "login") {
          if (!loginEmail || !loginPass) { toast.error("Please fill all fields"); return; }
          // Pass captcha token if available
          const { error } = await supabase.auth.signInWithPassword({ 
            email: loginEmail, 
            password: loginPass,
            options: { ...captchaOptions }
          });
          if (error) throw error;
          
          await rateLimitService.recordAttempt(loginEmail, true, 'login_email');
          toast.success("Welcome back! 👋");
          onSuccess();
        } else {
          if (!signupName || !signupEmail || !signupPass || !signupConfirmPass || !signupRole) { toast.error("Please fill all fields"); return; }
          if (signupPass !== signupConfirmPass) { toast.error("Passwords do not match"); return; }
          if (signupPass.length < 6) { toast.error("Password must be at least 6 characters"); return; }
          
          const { error } = await supabase.auth.signUp({
            email: signupEmail,
            password: signupPass,
            options: { 
              data: { name: signupName, role: signupRole },
              ...captchaOptions
            },
          });
          if (error) throw error;

          await rateLimitService.recordAttempt(signupEmail, true, 'signup');
          toast.success("Welcome to CaastingCall! 🎬 Please verify your email.");
          onSuccess();
        }
      }
    } catch (err: any) {
      await loggingService.logAuthFailure(tab, err);
      await rateLimitService.recordAttempt(identifier, false, tab);
      setFailedAttempts(prev => prev + 1);
      
      // Reset Turnstile on failure if it exists
      if (turnstileRef.current) {
        turnstileRef.current.reset();
        setCaptchaToken(null);
      }
      
      console.error("Auth Error details:", err);
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred during auth";
      
      if (errorMessage === "Failed to fetch") {
        toast.error("Network Error: Could not reach the server. Please check your internet or VPN.");
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const buttonLabel = loading
    ? "Please wait…"
    : tab === "reset"
    ? "Send Reset Link"
    : tab === "login"
    ? authMethod === "phone"
      ? otpSent ? "Verify Code" : "Send OTP"
      : "Sign In"
    : "Create Account";

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12">
      <motion.div
        className="w-full max-w-[380px]"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="text-center mb-8 relative">
          {onBack && (
            <button
              onClick={onBack}
              className="absolute left-0 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-white/5 text-muted-foreground/40 hover:text-foreground transition-all group hidden md:block"
              title="Back"
            >
              <ChevronLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
            </button>
          )}
          <h1 className="font-accent text-2xl text-foreground tracking-tight">
            {tab === "reset" ? "Reset Password" : tab === "login" ? "Welcome back" : "Create account"}
          </h1>
          <p className="text-muted-foreground/60 text-xs mt-1.5 tracking-wide">
            {tab === "reset"
              ? "We'll send a recovery link to your email"
              : tab === "login"
              ? "Sign in to continue to CaastingCall"
              : "Join CaastingCall — it's free"}
          </p>
        </div>

        {/* ── Card ── */}
        <div className="premium-card p-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Star size={120} className="text-primary" />
          </div>
          <div className="relative z-10">
          
          {tab !== "reset" && (
            <>
              {/* Google OAuth */}
              <button
                onClick={() => handleOAuthClick('google')}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 py-2.5 border border-border/10 rounded-xl bg-foreground/5 hover:bg-foreground/10 transition-all text-sm text-foreground/80 disabled:opacity-30"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              {/* Divider */}
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/[0.06]" /></div>
                <div className="relative flex justify-center"><span className="bg-card/60 px-3 text-[10px] text-muted-foreground/40 uppercase tracking-[0.2em]">or</span></div>
              </div>

              {/* Tab toggle — compact pill */}
              <div className="flex bg-white/[0.03] p-0.5 rounded-lg mb-5 border border-white/[0.04]">
                {(["login", "signup"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => { setTab(t); setOtpSent(false); }}
                    className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${
                      tab === t
                        ? "bg-primary text-black shadow-sm"
                        : "text-muted-foreground/60 hover:text-muted-foreground"
                    }`}
                  >
                    {t === "login" ? "Sign In" : "Sign Up"}
                  </button>
                ))}
              </div>

              {/* Auth method toggle — subtle underline style */}
              <div className="flex gap-4 mb-5">
                {([
                  { id: "email" as const, icon: Mail, label: "Email" },
                  { id: "phone" as const, icon: Phone, label: "Phone" },
                ]).map(({ id, icon: Icon, label }) => (
                  <button
                    key={id}
                    onClick={() => { setAuthMethod(id); setOtpSent(false); }}
                    className={`flex items-center gap-1.5 pb-1.5 text-xs transition-all border-b-2 ${
                      authMethod === id
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground/40 hover:text-muted-foreground/60"
                    }`}
                  >
                    <Icon size={13} />
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ── Forms ── */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`${tab}-${authMethod}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
            >
              {tab === "reset" ? (
                <div className="space-y-3">
                  <Field label="Email" type="email" value={resetEmail} onChange={setResetEmail} placeholder="you@example.com" />
                  <button
                    onClick={() => setTab("login")}
                    className="flex items-center gap-1 text-[11px] text-muted-foreground/50 hover:text-primary transition-colors mt-1"
                  >
                    <ChevronLeft size={12} /> Back to sign in
                  </button>
                </div>
              ) : tab === "login" ? (
                <div className="space-y-3">
                  {authMethod === "email" ? (
                    <>
                      <Field label="Email" type="email" value={loginEmail} onChange={setLoginEmail} placeholder="you@example.com" />
                      <Field
                        label="Password"
                        type={showPass ? "text" : "password"}
                        value={loginPass}
                        onChange={setLoginPass}
                        placeholder="••••••••"
                        rightElement={
                          <button
                            type="button"
                            onClick={() => setShowPass(!showPass)}
                            className="p-1.5 text-muted-foreground/30 hover:text-muted-foreground transition-colors"
                          >
                            {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        }
                      />
                      <button
                        onClick={() => setTab("reset")}
                        className="text-[11px] text-muted-foreground/40 hover:text-primary transition-colors block ml-auto"
                      >
                        Forgot password?
                      </button>
                    </>
                  ) : (
                    <>
                      <Field label="Phone" type="tel" value={phone} onChange={setPhone} placeholder="+977 123456789" />
                      {otpSent && <Field label="Verification Code" type="text" value={otp} onChange={setOtp} placeholder="Enter OTP" />}
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <Field label="Full Name" value={signupName} onChange={setSignupName} placeholder="Your name" />
                  {authMethod === "email" ? (
                    <>
                      <Field label="Email" type="email" value={signupEmail} onChange={setSignupEmail} placeholder="you@example.com" />
                      <Field
                        label="Password"
                        type={showPass ? "text" : "password"}
                        value={signupPass}
                        onChange={setSignupPass}
                        placeholder="Min 6 characters"
                        rightElement={
                          <button type="button" onClick={() => setShowPass(!showPass)} className="p-1.5 text-muted-foreground/30 hover:text-muted-foreground transition-colors">
                            {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        }
                      />
                      <Field
                        label="Confirm Password"
                        type={showPass ? "text" : "password"}
                        value={signupConfirmPass}
                        onChange={setSignupConfirmPass}
                        placeholder="Repeat password"
                      />
                    </>
                  ) : (
                    <>
                      <Field label="Phone" type="tel" value={phone} onChange={setPhone} placeholder="+977 123456789" />
                      {otpSent && <Field label="Verification Code" type="text" value={otp} onChange={setOtp} placeholder="Enter OTP" />}
                    </>
                  )}
                  <div>
                    <label className="block text-[11px] text-muted-foreground/50 mb-1.5">Role</label>
                    <select
                      value={signupRole}
                      onChange={(e) => setSignupRole(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-foreground text-sm outline-none focus:border-primary/50 transition-colors appearance-none"
                    >
                      <option value="">Select your role…</option>
                      {ROLES.map((r) => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {failedAttempts >= 3 && (
                <div className="mt-8 flex justify-center">
                  {TURNSTILE_SITE_KEY ? (
                    <Turnstile
                      ref={turnstileRef}
                      siteKey={TURNSTILE_SITE_KEY}
                      onSuccess={(token) => setCaptchaToken(token)}
                      onExpire={() => setCaptchaToken(null)}
                      onError={() => {
                        toast.error("Security verification failed. Please try again.");
                        setCaptchaToken(null);
                      }}
                      options={{ theme: 'dark' }}
                    />
                  ) : (
                    <div className="text-[10px] text-red-500/50 uppercase tracking-widest font-medium border border-red-500/10 p-4 rounded-xl bg-red-500/5">
                      Missing Security Configuration (Turnstile)
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-primary text-black rounded-xl py-2.5 text-sm font-semibold mt-5 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-30 disabled:bg-white/[0.04] disabled:text-white/20 disabled:border-white/[0.05] disabled:cursor-not-allowed"
          >
            {buttonLabel}
            {!loading && <ArrowRight size={14} />}
          </button>
        </div>
      </div>

        {/* Footer link */}
        {tab !== "reset" && (
          <p className="text-center text-[11px] text-muted-foreground/30 mt-5">
            {tab === "login" ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => { setTab(tab === "login" ? "signup" : "login"); setOtpSent(false); }}
              className="text-primary/70 hover:text-primary transition-colors"
            >
              {tab === "login" ? "Sign up" : "Sign in"}
            </button>
          </p>
        )}
      </motion.div>
    </div>
  );
}

function Field({
  label, type = "text", value, onChange, placeholder, rightElement
}: {
  label: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string; rightElement?: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[11px] text-muted-foreground/50 mb-1.5">{label}</label>
      <div className="relative flex items-center">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-foreground text-sm outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground/20 pr-9"
        />
        {rightElement && (
          <div className="absolute right-1">
            {rightElement}
          </div>
        )}
      </div>
    </div>
  );
}
