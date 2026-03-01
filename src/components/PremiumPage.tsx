import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Crown, CreditCard, Loader2, PartyPopper, Wallet, ExternalLink, ShieldCheck, Upload, QrCode, Hourglass, Landmark } from "lucide-react";

export default function PremiumPage() {
    const { user, profile, isPremium, refreshProfile } = useAuth();
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<"esewa" | "khalti" | "manual" | null>(null);
    const [success, setSuccess] = useState(false);
    const [screenshot, setScreenshot] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [pendingVerification, setPendingVerification] = useState<any>(null);

    const isPro = isPremium;

    // Handle eSewa Redirect Success/Failure from URL
    useEffect(() => {
        const query = new URLSearchParams(window.location.search);
        const status = query.get("status");
        const esewaResult = query.get("q");

        if (status === "success" || esewaResult === "su") {
            handleFinalUpgrade("esewa");
            window.history.replaceState({}, document.title, "/premium");
        } else if (status === "failed" || esewaResult === "fu") {
            toast.error("Payment was cancelled or failed via eSewa");
            window.history.replaceState({}, document.title, "/premium");
        }

        if (user) {
            const checkPending = async () => {
                const { data } = await supabase
                    .from("payment_verifications" as any)
                    .select("*")
                    .eq("user_id", user.id)
                    .eq("status", "pending")
                    .single();
                setPendingVerification(data);
            };
            checkPending();
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

    const handleManualSubmit = async () => {
        if (!user || !screenshot) return;
        setUploading(true);
        try {
            const fileExt = screenshot.name.split('.').pop();
            const fileName = `${user.id}/${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('payments')
                .upload(fileName, screenshot);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('payments')
                .getPublicUrl(fileName);

            const { error: dbError } = await supabase
                .from('payment_verifications' as any)
                .insert({
                    user_id: user.id,
                    screenshot_url: publicUrl,
                    amount: 499,
                    payment_method: 'qr'
                } as any);

            if (dbError) throw dbError;

            toast.success("Verification request submitted! We will review it shortly.");
            setPendingVerification({ status: 'pending' });
            setPaymentMethod(null);
            setScreenshot(null);
        } catch (err: any) {
            toast.error("Failed to submit request: " + err.message);
        } finally {
            setUploading(false);
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
                    className="bg-primary text-black px-12 py-4 rounded-2xl font-normal text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-primary/20"
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
                    className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-[0.65rem] font-normal tracking-[2px] uppercase mb-6 border border-primary/20"
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
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-black px-6 py-1.5 rounded-full text-[0.6rem] font-normal tracking-[2px] uppercase shadow-xl">
                                Recommended
                            </div>
                        )}

                        <div className="mb-10">
                            <h3 className="text-[0.65rem] font-normal tracking-[3px] uppercase text-primary/60 mb-3">
                                {plan.name} PLAN
                            </h3>
                            <div className="flex items-baseline gap-2">
                                <span className="text-5xl font-display text-white italic">NPR {plan.price}</span>
                                <span className="text-muted-foreground text-sm font-normal">/ MONTH</span>
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
                            className={`w-full py-5 rounded-2xl font-normal text-xs uppercase tracking-[3px] transition-all shadow-xl ${plan.current
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

                        <p className="text-sm text-muted-foreground mb-8 font-medium max-w-lg mx-auto leading-relaxed">
                            Upgrade securely via Nepal's leading gateways.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative">
                            <button
                                onClick={() => initEsewa(499)}
                                disabled={isProcessing}
                                className="flex flex-col items-center justify-center p-8 bg-white/5 border-2 border-white/5 rounded-[2rem] hover:border-[#60bb46] hover:bg-[#60bb46]/5 transition-all group relative overflow-hidden active:scale-95"
                            >
                                {isProcessing && paymentMethod === "esewa" ? (
                                    <Loader2 className="w-12 h-12 text-[#60bb46] animate-spin mb-3" />
                                ) : (
                                    <div className="w-24 h-16 mb-4 flex items-center justify-center">
                                        <img
                                            src="/esewa.png"
                                            alt="eSewa"
                                            className="h-10 w-auto object-contain drop-shadow-[0_0_15px_rgba(96,187,70,0.3)] group-hover:scale-110 transition-transform"
                                        />
                                    </div>
                                )}
                                <span className="text-[0.65rem] font-normal tracking-[4px] uppercase opacity-40 group-hover:opacity-100 transition-opacity">Pay via eSewa</span>
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
                                    <div className="w-32 h-16 mb-4 flex items-center justify-center">
                                        <img
                                            src="/khalti.jpg"
                                            alt="Khalti"
                                            className="h-12 w-auto object-contain drop-shadow-[0_0_15px_rgba(92,45,145,0.3)] group-hover:scale-110 transition-transform rounded-lg"
                                        />
                                    </div>
                                )}
                                <span className="text-[0.65rem] font-normal tracking-widest uppercase opacity-40 group-hover:opacity-100 transition-opacity">Pay via Khalti</span>
                                <ExternalLink size={12} className="absolute top-4 right-4 text-white/20 group-hover:text-[#5c2d91] transition-colors" />
                            </button>

                            <button
                                onClick={() => setPaymentMethod(paymentMethod === "manual" ? null : "manual")}
                                disabled={isProcessing || uploading || pendingVerification}
                                className={`flex flex-col items-center justify-center p-8 bg-white/5 border-2 rounded-[2rem] transition-all group relative overflow-hidden active:scale-95 sm:col-span-2 ${paymentMethod === 'manual' ? 'border-primary bg-primary/5' : 'border-white/5 hover:border-primary/50'}`}
                            >
                                {pendingVerification ? (
                                    <>
                                        <Hourglass className="w-12 h-12 text-primary animate-pulse mb-3" />
                                        <span className="text-[0.65rem] font-normal tracking-widest uppercase text-primary">Verification Pending</span>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-12 h-12 mb-4 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:scale-110 transition-all">
                                            <QrCode size={24} />
                                        </div>
                                        <span className="text-[0.65rem] font-normal tracking-widest uppercase opacity-40 group-hover:opacity-100 transition-opacity">Direct QR / Bank Transfer</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {paymentMethod === "manual" && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-10 p-8 bg-black/40 rounded-[2rem] border border-primary/20 text-left">
                                <div className="grid md:grid-cols-2 gap-10">
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-3">
                                            <QrCode className="text-primary" size={20} />
                                            <h4 className="text-sm font-normal text-white uppercase tracking-widest">Step 1: Scan & Pay</h4>
                                        </div>
                                        <div className="aspect-square w-full max-w-[240px] bg-white p-4 rounded-2xl mx-auto shadow-2xl relative group">
                                            <img
                                                src="/rbb-qr.png"
                                                alt="Rastriya Banijya Bank QR"
                                                className="w-full h-full object-contain"
                                                onError={(e) => {
                                                    // Fallback if image isn't found yet
                                                    e.currentTarget.style.display = 'none';
                                                    e.currentTarget.parentElement!.querySelector('.qr-placeholder')!.classList.remove('hidden');
                                                }}
                                            />
                                            <div className="qr-placeholder hidden w-full h-full bg-black/5 rounded-lg flex flex-col items-center justify-center text-black text-center gap-2">
                                                <QrCode size={40} className="mb-2" />
                                                <span className="text-[0.5rem] font-display font-medium uppercase leading-tight text-red-600">Rastriya Banijya Bank<br />Please Upload rbb-qr.png</span>
                                            </div>
                                        </div>
                                        <div className="bg-white/5 p-4 rounded-xl border border-white/5 flex items-center gap-4">
                                            <Landmark size={20} className="text-primary shrink-0" />
                                            <div className="text-[0.65rem] text-muted-foreground uppercase leading-relaxed">
                                                Bank: <span className="text-white">Rastriya Banijya Bank (RBB)</span><br />
                                                A/C Name: <span className="text-white">Casting Hub Nepal</span><br />
                                                Location: <span className="text-white">Kathmandu, Nepal</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="flex items-center gap-3">
                                            <Upload className="text-primary" size={20} />
                                            <h4 className="text-sm font-normal text-white uppercase tracking-widest">Step 2: Upload Screenshot</h4>
                                        </div>
                                        <div className="relative aspect-video rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center bg-white/5 overflow-hidden">
                                            {screenshot ? (
                                                <img src={URL.createObjectURL(screenshot)} className="w-full h-full object-cover" alt="Screenshot" />
                                            ) : (
                                                <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors p-4 block">
                                                    <Upload size={24} className="text-muted-foreground mb-3" />
                                                    <span className="text-[0.6rem] text-muted-foreground uppercase tracking-widest">Select Image</span>
                                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => setScreenshot(e.target.files?.[0] || null)} />
                                                </label>
                                            )}
                                        </div>
                                        <button
                                            onClick={handleManualSubmit}
                                            disabled={!screenshot || uploading}
                                            className="w-full bg-primary text-black py-4 rounded-xl font-normal text-xs uppercase tracking-[3px] disabled:opacity-50 hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
                                        >
                                            {uploading ? <Loader2 size={16} className="animate-spin" /> : <><ShieldCheck size={16} /> Submit for Review</>}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        <div className="mt-12 flex items-center justify-center gap-3 text-[0.6rem] text-muted-foreground uppercase tracking-[3px] font-normal opacity-60">
                            <CreditCard className="w-4 h-4 text-primary" />
                            Encrypted 256-bit Secure Checkout
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div >
    );
}
