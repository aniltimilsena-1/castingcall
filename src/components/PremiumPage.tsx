import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Crown, CreditCard, Loader2, PartyPopper, Wallet, Globe, Sparkles, TrendingUp } from "lucide-react";
import PaymentUpgradeDialog from "./PaymentUpgradeDialog";

export default function PremiumPage() {
    const { user, profile, isPremium, refreshProfile } = useAuth();
    const [success, setSuccess] = useState(false);
    const [isNepal, setIsNepal] = useState<boolean | null>(null);
    const [showPayment, setShowPayment] = useState(false);
    const [talentsCount, setTalentsCount] = useState("0");

    const isPro = isPremium;

    // Detect User Location (Country)
    useEffect(() => {
        const detectLocation = async () => {
            try {
                const res = await fetch("https://ipapi.co/json/");
                const data = await res.json();
                setIsNepal(data.country_code === "NP");
            } catch (err) {
                console.error("Location detection failed, defaulting to Global:", err);
                setIsNepal(false);
            }
        };
        detectLocation();

        // Handle eSewa Redirect Success/Failure
        const query = new URLSearchParams(window.location.search);
        const status = query.get("status");
        if (status === "success") {
            setSuccess(true);
            refreshProfile();
        }

        const fetchStats = async () => {
            try {
                const { count } = await supabase.from("profiles").select("id", { count: 'exact', head: true });
                if (count) {
                    setTalentsCount(count > 1000 ? `${(count / 1000).toFixed(1)}k+` : count.toString());
                }
            } catch (err) {
                console.error("Failed to load talent count");
            }
        };
        fetchStats();
    }, [refreshProfile]);

    const price = isNepal ? "499" : "4.99";
    const currency = isNepal ? "NPR" : "USD";

    const plans = [
        { name: "FREE", price: isNepal ? "0" : "0", features: ["Basic Profile", "Global Visibility"], current: !isPro },
        { name: "PRO", price: price, features: ["Verified Badge", "Featured Worldwide", "Unlimited Messages", "Fan Pass Access"], current: isPro, popular: true },
    ];

    if (success) {
        return (
            <div className="max-w-[600px] mx-auto py-24 text-center">
                <PartyPopper className="w-12 h-12 text-primary mx-auto mb-6" />
                <h1 className="text-4xl text-white mb-4">Welcome to PRO!</h1>
                <p className="text-muted-foreground uppercase tracking-widest text-xs">Your career elevation starts now.</p>
                <button onClick={() => window.location.href = "/"} className="bg-primary text-black px-10 py-4 rounded-xl mt-10 font-bold tracking-widest text-[0.6rem] uppercase shadow-xl shadow-primary/20">Go to Dashboard</button>
            </div>
        );
    }

    return (
        <div className="max-w-[1200px] mx-auto px-6 py-12 pb-32">
            <div className="text-center mb-16 px-4">
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 bg-primary/10 text-primary px-5 py-2 rounded-full text-[0.65rem] uppercase mb-8 border border-primary/20 tracking-[2px]">
                    <Globe className="w-4 h-4" />
                    Casting Hub {isNepal ? "Nepal" : "Global"} Elite
                </motion.div>
                <h1 className="text-5xl md:text-8xl text-primary font-display italic mb-6 leading-[1.1]">Elevate Your <span className="text-white not-italic">Career</span></h1>
                <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto uppercase tracking-tighter">Get discovered by top casting directors {isNepal ? "in Nepal & Worldwide" : "Worldwide"}.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-20">
                {plans.map((plan, idx) => (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        key={plan.name}
                        className={`bg-card/30 backdrop-blur-3xl border-2 rounded-[3.5rem] p-12 relative overflow-hidden flex flex-col ${plan.popular ? "border-primary" : "border-white/5"}`}
                    >
                        {plan.popular && (
                            <div className="absolute top-10 right-10 bg-primary text-black px-4 py-1 rounded-full text-[0.5rem] font-bold tracking-widest uppercase">Popular Choice</div>
                        )}
                        <h3 className="text-[0.65rem] text-primary/60 mb-6 uppercase tracking-[4px]">{plan.name} PLAN</h3>
                        <div className="flex items-baseline gap-2 mb-10">
                            <span className="text-6xl font-display text-white italic">{isNepal ? "NPR " : "$"}{plan.price}</span>
                            <span className="text-xs text-muted-foreground">/ PREMANENT ACCESS</span>
                        </div>
                        <ul className="space-y-5 mb-12 flex-1">
                            {plan.features.map(f => <li key={f} className="flex items-center gap-4 text-sm text-foreground/80 font-normal"><Check size={16} className="text-primary" /> {f}</li>)}
                        </ul>
                        <button
                            disabled={plan.current}
                            onClick={() => plan.name === 'PRO' && setShowPayment(true)}
                            className={`w-full py-5 rounded-2xl text-[0.6rem] font-bold uppercase tracking-[3px] transition-all ${plan.current ? "bg-white/5 text-muted-foreground cursor-default" : "bg-primary text-black hover:scale-[1.02] shadow-xl shadow-primary/20"}`}
                        >
                            {plan.current ? "Current Plan" : "Upgrade to Pro"}
                        </button>
                    </motion.div>
                ))}
            </div>

            <div className="bg-card/20 border border-white/5 rounded-[3rem] p-16 text-center max-w-4xl mx-auto shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] -z-10" />
                <Wallet className="text-primary w-8 h-8 mx-auto mb-8" />
                <h3 className="text-4xl text-white font-display italic mb-4">The Smart Move for Your Talent</h3>
                <p className="text-muted-foreground text-sm uppercase tracking-widest mb-10">Trusted by over {talentsCount} talents globally across the network.</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    <Benefit icon={<Crown size={20} />} label="Premium Badge" />
                    <Benefit icon={<Sparkles size={20} />} label="Priority Listing" />
                    <Benefit icon={<TrendingUp size={20} />} label="Analytics Hub" />
                    <Benefit icon={<Globe size={20} />} label="Global Reach" />
                </div>
            </div>

            <PaymentUpgradeDialog
                open={showPayment}
                onOpenChange={setShowPayment}
                user={user}
                type="pro"
                amount={isNepal ? 499 : 4.99}
                currency={isNepal ? 'NPR' : 'USD'}
                currencySymbol={isNepal ? 'NPR ' : '$'}
                onSuccess={() => {
                    setSuccess(true);
                    refreshProfile();
                }}
            />
        </div>
    );
}

function Benefit({ icon, label }: any) {
    return (
        <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-primary">{icon}</div>
            <span className="text-[0.55rem] uppercase tracking-widest text-muted-foreground">{label}</span>
        </div>
    );
}
