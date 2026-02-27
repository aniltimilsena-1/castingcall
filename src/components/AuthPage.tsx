import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";

interface AuthPageProps {
  onSuccess: () => void;
}

const ROLES = ["Actor", "Director", "Singer", "Choreographer", "Producer", "Casting Director"];

export default function AuthPage({ onSuccess }: AuthPageProps) {
  const { signIn, signUp } = useAuth();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);

  // login fields
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");

  // signup fields
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPass, setSignupPass] = useState("");
  const [signupConfirmPass, setSignupConfirmPass] = useState("");
  const [signupRole, setSignupRole] = useState("");
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (tab === "login") {
        if (!loginEmail || !loginPass) { toast.error("Please fill all fields"); return; }
        await signIn(loginEmail, loginPass);
        toast.success("Welcome back! 👋");
      } else {
        if (!signupName || !signupEmail || !signupPass || !signupConfirmPass || !signupRole) { toast.error("Please fill all fields"); return; }
        if (signupPass !== signupConfirmPass) { toast.error("Passwords do not match"); return; }
        if (signupPass.length < 6) { toast.error("Password must be at least 6 characters"); return; }
        await signUp(signupEmail, signupPass, signupName, signupRole);
        toast.success("Welcome to CastingCall! 🎬");
      }
      onSuccess();
    } catch (e: any) {
      toast.error(e.message);
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
          <img src="/logo.png" alt="CastingCall Logo" className="h-20 w-auto mb-4" />
          <h1 className="font-display text-4xl text-primary tracking-tight">CastingCall</h1>
          <p className="text-muted-foreground text-sm mt-2 font-medium">
            Connect with top talent and industry professionals
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-7">
          {(["login", "signup"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 border-[1.5px] rounded-lg font-body text-sm font-semibold transition-all ${tab === t
                ? "border-primary text-primary bg-primary/5"
                : "border-border text-muted-foreground"
                }`}
            >
              {t === "login" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>

        {/* Forms */}
        {tab === "login" ? (
          <div className="space-y-4">
            <Field label="EMAIL" type="email" value={loginEmail} onChange={setLoginEmail} placeholder="you@example.com" />
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
          </div>
        ) : (
          <div className="space-y-4">
            <Field label="FULL NAME" value={signupName} onChange={setSignupName} placeholder="Your name" />
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
            <div>
              <label className="block text-[0.76rem] text-muted-foreground font-bold tracking-wider mb-1">YOUR ROLE</label>
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
          className="w-full bg-primary text-primary-foreground rounded-lg py-3 font-body font-bold text-base mt-5 hover:opacity-85 transition-opacity disabled:opacity-50"
        >
          {loading ? "Please wait…" : tab === "login" ? "Sign In" : "Create Account"}
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
      <label className="block text-[0.76rem] text-muted-foreground font-bold tracking-wider mb-1">{label}</label>
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
