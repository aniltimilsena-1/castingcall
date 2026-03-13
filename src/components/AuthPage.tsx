import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Eye, EyeOff, Phone, Mail } from "lucide-react";

interface AuthPageProps {
  onSuccess: () => void;
}

const ROLES = ["Actor", "Director", "Singer", "Choreographer", "Producer", "Casting Director"];

export default function AuthPage({ onSuccess }: AuthPageProps) {
  const { signIn, signUp, signInWithOAuth, signInWithPhone, verifyOTP, resetPassword } = useAuth();
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

    setLoading(true);
    try {
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
          toast.success(`Welcome ${tab === "login" ? "back" : ""}! 🎉`);
          onSuccess();
        }
      } else {
        if (tab === "login") {
          if (!loginEmail || !loginPass) { toast.error("Please fill all fields"); return; }
          await signIn(loginEmail, loginPass);
          toast.success("Welcome back! 👋");
          onSuccess();
        } else {
          if (!signupName || !signupEmail || !signupPass || !signupConfirmPass || !signupRole) { toast.error("Please fill all fields"); return; }
          if (signupPass !== signupConfirmPass) { toast.error("Passwords do not match"); return; }
          if (signupPass.length < 6) { toast.error("Password must be at least 6 characters"); return; }
          await signUp(signupEmail, signupPass, signupName, signupRole);
          toast.success("Welcome to CaastingCall! 🎬");
          onSuccess();
        }
      }
    } catch (err: unknown) {
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

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-6 py-16">
      <motion.div
        className="bg-card border-[1.5px] border-card-border rounded-2xl p-8 w-full max-w-[420px]"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex flex-col items-center text-center mb-8">
          <img src="/logo.png" alt="CaastingCall Logo" className="h-20 w-auto mb-4" />
          <h1 className="font-display text-4xl text-primary tracking-tight">CaastingCall</h1>
          <p className="text-muted-foreground text-sm mt-2 font-medium">
            {tab === "reset" ? "Recover your account password" : "Connect with top talent and industry professionals"}
          </p>
        </div>

        {tab !== "reset" && (
          <>
            {/* OAuth Buttons */}
            <div className="mb-7">
              <button
                onClick={() => handleOAuthClick('google')}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 border-[1.5px] border-border rounded-lg bg-background hover:bg-muted/50 transition-colors disabled:opacity-50"
              >
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
                <span className="text-xs font-normal uppercase tracking-wider">Continue with Google</span>
              </button>
            </div>

            <div className="relative mb-7">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground font-normal tracking-widest">Or continue with</span></div>
            </div>

            <div className="flex gap-2 mb-7">
              {(["login", "signup"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setOtpSent(false); }}
                  className={`flex-1 py-2.5 border-[1.5px] rounded-lg font-body text-sm font-normal transition-all ${tab === t
                    ? "border-primary text-primary bg-primary/5"
                    : "border-border text-muted-foreground"
                    }`}
                >
                  {t === "login" ? "Sign In" : "Sign Up"}
                </button>
              ))}
            </div>

            <div className="flex bg-secondary/30 p-1 rounded-xl mb-6 border border-white/5">
              <button
                onClick={() => { setAuthMethod("email"); setOtpSent(false); }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-normal tracking-widest transition-all ${authMethod === "email" ? "bg-primary text-black" : "text-muted-foreground hover:text-white"}`}
              >
                <Mail size={16} /> EMAIL
              </button>
              <button
                onClick={() => { setAuthMethod("phone"); setOtpSent(false); }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-normal tracking-widest transition-all ${authMethod === "phone" ? "bg-primary text-black" : "text-muted-foreground hover:text-white"}`}
              >
                <Phone size={16} /> PHONE
              </button>
            </div>
          </>
        )}

        {/* Forms */}
        {tab === "reset" ? (
          <div className="space-y-4">
            <Field label="EMAIL ADDRESS" type="email" value={resetEmail} onChange={setResetEmail} placeholder="Enter your registered email" />
            <button
              onClick={() => setTab("login")}
              className="text-[0.7rem] text-primary hover:underline transition-all block mt-1 uppercase tracking-wider font-medium"
            >
              Back to Login
            </button>
          </div>
        ) : tab === "login" ? (
          <div className="space-y-4">
            {authMethod === "email" ? (
              <>
                <Field label="EMAIL" type="email" value={loginEmail} onChange={setLoginEmail} placeholder="you@example.com" />
                <div>
                  <Field
                    label="PASSWORD"
                    type={showPass ? "text" : "password"}
                    value={loginPass}
                    onChange={setLoginPass}
                    placeholder="••••••••"
                    rightElement={
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="p-2 text-muted-foreground hover:text-primary transition-colors"
                      >
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    }
                  />
                  <button
                    onClick={() => setTab("reset")}
                    className="text-[0.7rem] text-muted-foreground hover:text-primary transition-colors block mt-2 ml-auto uppercase tracking-wider font-medium"
                  >
                    Forgot Password?
                  </button>
                </div>
              </>
            ) : (
              <>
                <Field
                  label="PHONE NUMBER"
                  type="tel"
                  value={phone}
                  onChange={setPhone}
                  placeholder="+977 123456789"
                />
                {otpSent && (
                  <Field
                    label="verification code"
                    type="text"
                    value={otp}
                    onChange={setOtp}
                    placeholder="Enter OTP code"
                  />
                )}
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <Field label="FULL NAME" value={signupName} onChange={setSignupName} placeholder="Your name" />
            {authMethod === "email" ? (
              <>
                <Field label="EMAIL" type="email" value={signupEmail} onChange={setSignupEmail} placeholder="you@example.com" />
                <Field
                  label="PASSWORD"
                  type={showPass ? "text" : "password"}
                  value={signupPass}
                  onChange={setSignupPass}
                  placeholder="Min 6 characters"
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="p-2 text-muted-foreground hover:text-primary transition-colors"
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                />
                <Field
                  label="CONFIRM PASSWORD"
                  type={showPass ? "text" : "password"}
                  value={signupConfirmPass}
                  onChange={setSignupConfirmPass}
                  placeholder="Repeat password"
                />
              </>
            ) : (
              <>
                <Field
                  label="PHONE NUMBER"
                  type="tel"
                  value={phone}
                  onChange={setPhone}
                  placeholder="+977 123456789"
                />
                {otpSent && (
                  <Field
                    label="verification code"
                    type="text"
                    value={otp}
                    onChange={setOtp}
                    placeholder="Enter OTP code"
                  />
                )}
              </>
            )}
            <div>
              <label className="block text-[0.76rem] text-muted-foreground font-normal tracking-wider mb-1">YOUR ROLE</label>
              <select
                value={signupRole}
                onChange={(e) => setSignupRole(e.target.value)}
                className="w-full bg-background border-[1.5px] border-border rounded-lg px-4 py-2.5 text-foreground font-body text-sm outline-none focus:border-primary transition-colors"
              >
                <option value="">Select your role…</option>
                {ROLES.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-primary text-primary-foreground rounded-lg py-3 font-body font-normal text-base mt-5 hover:opacity-85 transition-opacity disabled:opacity-50"
        >
          {loading ? "Please wait…" : tab === "reset" ? "Send Reset Link" : tab === "login" ? (authMethod === "phone" ? (otpSent ? "Verify Code" : "Send OTP") : "Sign In") : "Create Account"}
        </button>
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
      <label className="block text-[0.76rem] text-muted-foreground font-normal tracking-wider mb-1">{label}</label>
      <div className="relative flex items-center">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-background border-[1.5px] border-border rounded-lg px-4 py-2.5 text-foreground font-body text-sm outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/40 pr-10"
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
