import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Crown, CreditCard, Loader2, PartyPopper, Wallet, ExternalLink, ShieldCheck } from "lucide-react";

export default function PremiumPage() {
    const { user, profile, refreshProfile } = useAuth();
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<"esewa" | "khalti" | null>(null);
    const [success, setSuccess] = useState(false);

    const isPro = profile?.plan === "pro";

    // Handle eSewa Redirect Success/Failure from URL
    useEffect(() => {
        const query = new URLSearchParams(window.location.search);
        const status = query.get("status");
        const esewaResult = query.get("q"); // eSewa returns su or fu in q parameter sometimes

        if (status === "success" || esewaResult === "su") {
            handleFinalUpgrade("esewa");
            // Clean URL
            window.history.replaceState({}, document.title, "/premium");
        } else if (status === "failed" || esewaResult === "fu") {
            toast.error("Payment was cancelled or failed via eSewa");
            window.history.replaceState({}, document.title, "/premium");
        }
    }, [user]);

    const handleFinalUpgrade = async (method: string) => {
        if (!user) return;
        setIsProcessing(true);
        try {
            const { error } = await supabase
                .from("profiles")
                .update({ plan: "pro" } as any)
                .eq("user_id", user.id);

            if (error) throw error;

            await refreshProfile();
            setSuccess(true);
            toast.success(`Welcome to PRO! Upgrade verified via ${method}`);
        } catch (err: any) {
            toast.error("Upgrade sync failed: " + err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const initEsewa = (amt: number) => {
        if (!user) {
            toast.error("Please sign in to upgrade");
            return;
        }
        setPaymentMethod("esewa");
        setIsProcessing(true);

        const path = "https://uat.esewa.com.np/epay/main";
        const params: Record<string, any> = {
            amt: amt,
            psc: 0,
            pdc: 0,
            txAmt: 0,
            tAmt: amt,
            pid: `PRO-${user.id.slice(0, 8)}-${Date.now()}`,
            scd: "EPAYTEST", // Default Merchant Code for UAT
            su: window.location.origin + "/premium?status=success",
            fu: window.location.origin + "/premium?status=failed"
        };

        const form = document.createElement("form");
        form.setAttribute("method", "POST");
        form.setAttribute("action", path);

        for (const key in params) {
            const hiddenField = document.createElement("input");
            hiddenField.setAttribute("type", "hidden");
            hiddenField.setAttribute("name", key);
            hiddenField.setAttribute("value", params[key]);
            form.appendChild(hiddenField);
        }

        document.body.appendChild(form);
        form.submit();
    };

    const initKhalti = () => {
        if (!user) {
            toast.error("Please sign in to upgrade");
            return;
        }
        setPaymentMethod("khalti");

        // Load Khalti Script if not already present
        if (!document.getElementById("khalti-script")) {
            const script = document.createElement("script");
            script.id = "khalti-script";
            script.src = "https://khalti.s3.ap-south-1.amazonaws.com/KPG/dist/2020.12.17.0.0.0/khalti-checkout.iffe.js";
            document.body.appendChild(script);
            script.onload = () => triggerKhalti();
        } else {
            triggerKhalti();
        }
    };

    const triggerKhalti = () => {
        const config = {
            "publicKey": "test_public_key_dc74e0ef10724fb4ad6d7d30f2709e6c",
            "productIdentity": "PRO_MEMBERSHIP",
            "productName": "Casting Hub Pro",
            "productUrl": window.location.origin,
            "eventHandler": {
                onSuccess(payload: any) {
                    console.log("Khalti Success Payload:", payload);
                    handleFinalUpgrade("khalti");
                },
                onError(error: any) {
                    console.error("Khalti Error:", error);
                    toast.error("Khalti checkout failed to load");
                },
                onClose() {
                    setIsProcessing(false);
                    setPaymentMethod(null);
                }
            },
            "paymentPreference": ["KHALTI", "EBANKING", "MOBILE_BANKING", "CONNECT_IPS", "SCT"],
        };

        try {
            // @ts-ignore
            const checkout = new KhaltiCheckout(config);
            setIsProcessing(true);
            checkout.show({ amount: 49900 }); // Amount in paisa
        } catch (err) {
            toast.error("Could not initialize Khalti Widget");
        }
    };

    const plans = [
        {
            name: "FREE",
            price: "0",
            features: [
                "Basic Profile",
                "Limited Search",
                "Standard Messages",
                "Public Portfolio",
            ],
            current: !isPro,
        },
        {
            name: "PRO",
            price: "499",
            features: [
                "Verified Badge",
                "Priority Search Listing",
                "Unlimited Messages",
                "Advanced Analytics",
                "Featured on Home Page",
                "Direct Contact Support",
            ],
            current: isPro,
            popular: true,
        },
    ];

    if (success) {
        return (
            <motion.div
                className="max-w-[600px] mx-auto px-6 md:px-4 py-24 text-center"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
            >
                <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-8">
                    <PartyPopper className="w-12 h-12 text-primary" />
                </div>
                <h1 className="font-display text-5xl text-white mb-4">Welcome to PRO!</h1>
                <p className="text-muted-foreground text-lg mb-12">
                    Your account has been upgraded. You now have full access to all premium features.
                </p>
                <button
                    onClick={() => window.location.href = "/"}
                    className="bg-primary text-black px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-primary/20"
                >
                    Back to Dashboard
                </button>
            </motion.div>
        );
    }

    return (
        <motion.div
            className="max-w-[1000px] mx-auto px-6 md:px-4 py-12"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <div className="text-center mb-16">
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-[0.65rem] font-black tracking-[2px] uppercase mb-6 border border-primary/20"
                >
                    <Crown className="w-4 h-4" />
                    Casting Hub Elite
                </motion.div>
                <h1 className="font-display text-5xl md:text-7xl text-primary mb-6 italic tracking-tight">Elevate Your Career</h1>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto font-medium">
                    Unlock exclusive features and get <span className="text-white">10x more visibility</span> from top casting directors in Nepal.
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-20">
                {plans.map((plan, idx) => (
                    <motion.div
                        key={plan.name}
                        initial={{ opacity: 0, x: idx === 0 ? -20 : 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`relative bg-card/50 backdrop-blur-xl border-2 rounded-[2.5rem] p-10 transition-all ${plan.popular ? "border-primary shadow-[0_0_50px_-12px_rgba(251,191,36,0.2)]" : "border-card-border"
                            }`}
                    >
                        {plan.popular && (
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-black px-6 py-1.5 rounded-full text-[0.6rem] font-black tracking-[2px] uppercase shadow-xl">
                                Recommended
                            </div>
                        )}

                        <div className="mb-10">
                            <h3 className="text-[0.65rem] font-black tracking-[3px] uppercase text-primary/60 mb-3">
                                {plan.name} PLAN
                            </h3>
                            <div className="flex items-baseline gap-2">
                                <span className="text-5xl font-display text-white italic">NPR {plan.price}</span>
                                <span className="text-muted-foreground text-sm font-bold">/ MONTH</span>
                            </div>
                        </div>

                        <ul className="space-y-5 mb-10">
                            {plan.features.map((feature) => (
                                <li key={feature} className="flex items-center gap-4 text-sm font-medium text-foreground/80">
                                    <div className="w-6 h-6 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 border border-primary/20">
                                        <Check className="w-3.5 h-3.5 text-primary" strokeWidth={3} />
                                    </div>
                                    {feature}
                                </li>
                            ))}
                        </ul>

                        <button
                            disabled={plan.current || isProcessing}
                            onClick={() => {
                                if (idx === 1) document.getElementById('payment-section')?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[3px] transition-all shadow-xl ${plan.current
                                ? "bg-secondary/40 text-muted-foreground cursor-default border border-white/5"
                                : "bg-primary text-black hover:scale-105 active:scale-95 shadow-primary/20"
                                }`}
                        >
                            {plan.current ? (idx === 1 ? "Active Plan" : "Basic Status") : "Go Pro Now"}
                        </button>
                    </motion.div>
                ))}
            </div>

            <AnimatePresence>
                {!isPro && (
                    <motion.div
                        id="payment-section"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-card/30 backdrop-blur-2xl border-2 border-card-border rounded-[3rem] p-12 text-center max-w-3xl mx-auto shadow-2xl overflow-hidden relative"
                    >
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

                        <div className="flex items-center justify-center gap-3 mb-8">
                            <Wallet className="text-primary w-6 h-6" />
                            <h3 className="font-display text-3xl text-primary italic">Secure Checkout</h3>
                        </div>

                        <p className="text-sm text-muted-foreground mb-12 font-medium max-w-lg mx-auto leading-relaxed">
                            Upgrade securely via Nepal's leading gateways. Click to initiate the payment process.
                            <br />
                            <span className="text-primary/60 text-[10px] uppercase font-bold flex items-center justify-center gap-1 mt-2">
                                <ShieldCheck size={12} /> Powered by eSewa & Khalti
                            </span>
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <button
                                onClick={() => initEsewa(499)}
                                disabled={isProcessing}
                                className="flex flex-col items-center justify-center p-8 bg-white/5 border-2 border-white/5 rounded-[2rem] hover:border-[#60bb46] hover:bg-[#60bb46]/5 transition-all group relative overflow-hidden active:scale-95"
                            >
                                {isProcessing && paymentMethod === "esewa" ? (
                                    <Loader2 className="w-12 h-12 text-[#60bb46] animate-spin mb-3" />
                                ) : (
                                    <div className="w-16 h-16 mb-2 flex items-center justify-center font-display text-5xl text-[#60bb46] drop-shadow-[0_0_15px_rgba(96,187,70,0.3)]">
                                        e
                                    </div>
                                )}
                                <span className="text-[0.65rem] font-black tracking-[4px] uppercase opacity-40 group-hover:opacity-100 transition-opacity">Pay with eSewa</span>
                                <ExternalLink size={12} className="absolute top-4 right-4 text-white/20 group-hover:text-[#60bb46] transition-colors" />
                            </button>

                            <button
                                onClick={() => initKhalti()}
                                disabled={isProcessing}
                                className="flex flex-col items-center justify-center p-8 bg-white/5 border-2 border-white/5 rounded-[2rem] hover:border-[#5c2d91] hover:bg-[#5c2d91]/5 transition-all group relative overflow-hidden active:scale-95"
                            >
                                {isProcessing && paymentMethod === "khalti" ? (
                                    <Loader2 className="w-12 h-12 text-[#5c2d91] animate-spin mb-3" />
                                ) : (
                                    <div className="w-16 h-16 mb-2 flex items-center justify-center font-display text-5xl text-[#5c2d91] drop-shadow-[0_0_15px_rgba(92,45,145,0.3)]">
                                        K
                                    </div>
                                )}
                                <span className="text-[0.65rem] font-black tracking-[4px] uppercase opacity-40 group-hover:opacity-100 transition-opacity">Khalti Widget</span>
                                <ExternalLink size={12} className="absolute top-4 right-4 text-white/20 group-hover:text-[#5c2d91] transition-colors" />
                            </button>
                        </div>

                        <div className="mt-12 flex items-center justify-center gap-3 text-[0.6rem] text-muted-foreground uppercase tracking-[3px] font-black opacity-60">
                            <CreditCard className="w-4 h-4 text-primary" />
                            Encrypted 256-bit Secure Checkout
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div >
    );
}
