import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Crown, CreditCard, Loader2, PartyPopper, Wallet, Globe, ExternalLink, QrCode, Hourglass, Landmark, X, Apple } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe("pk_test_YOUR_STRIPE_PUBLISHABLE_KEY");

export default function PremiumPage() {
    const { user, profile, isPremium, refreshProfile } = useAuth();
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<"esewa" | "khalti" | "stripe" | "manual" | null>(null);
    const [success, setSuccess] = useState(false);
    const [screenshot, setScreenshot] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [pendingVerification, setPendingVerification] = useState<any>(null);
    const [isNepal, setIsNepal] = useState<boolean | null>(null);

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
        const esewaResult = query.get("q");

        if (status === "success" || esewaResult === "su") {
            handleFinalUpgrade(esewaResult === "su" ? "eSewa" : "International");
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
            toast.success(`Welcome to PRO! Membership activated via ${method}`);
        } catch (err: any) {
            toast.error("Upgrade sync failed: " + err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    // --- NEPAL GATEWAYS ---
    const initEsewa = (amt: number) => {
        if (!user) { toast.error("Sign in to upgrade"); return; }
        setPaymentMethod("esewa");
        setIsProcessing(true);
        const path = "https://uat.esewa.com.np/epay/main";
        const params: Record<string, any> = {
            amt: amt, psc: 0, pdc: 0, txAmt: 0, tAmt: amt,
            pid: `PRO-${user.id.slice(0, 8)}-${Date.now()}`,
            scd: "EPAYTEST",
            su: window.location.origin + "/premium?status=success",
            fu: window.location.origin + "/premium?status=failed"
        };
        const form = document.createElement("form");
        form.method = "POST"; form.action = path;
        for (const key in params) {
            const hiddenField = document.createElement("input");
            hiddenField.type = "hidden"; hiddenField.name = key; hiddenField.value = params[key];
            form.appendChild(hiddenField);
        }
        document.body.appendChild(form); form.submit();
    };

    const initKhalti = () => {
        if (!user) { toast.error("Sign in to upgrade"); return; }
        setPaymentMethod("khalti");
        // Khalti widget script loading... (simplified for this brief)
        const script = document.createElement("script");
        script.src = "https://khalti.s3.ap-south-1.amazonaws.com/KPG/dist/2020.12.17.0.0.0/khalti-checkout.iffe.js";
        document.body.appendChild(script);
        script.onload = () => {
            // @ts-ignore
            const checkout = new KhaltiCheckout({
                publicKey: "test_public_key_dc74e0ef10724fb4ad6d7d30f2709e6c",
                productIdentity: "PRO_MEMBERSHIP",
                productName: "Casting Hub Pro",
                eventHandler: {
                    onSuccess() { handleFinalUpgrade("Khalti"); },
                    onError() { toast.error("Khalti failed"); setIsProcessing(false); }
                }
            });
            checkout.show({ amount: 49900 });
        };
    };

    // --- GLOBAL GATEWAY ---
    const initStripe = async () => {
        setIsProcessing(true);
        // Mock Stripe - Connect your Edge Function here
        setTimeout(() => { handleFinalUpgrade("Stripe (Global)"); }, 1500);
    };

    const handleManualSubmit = async () => {
        if (!user || !screenshot) return;
        setUploading(true);
        try {
            const fileName = `${user.id}/${Date.now()}.${screenshot.name.split('.').pop()}`;
            await supabase.storage.from('payments').upload(fileName, screenshot);
            const { data: { publicUrl } } = supabase.storage.from('payments').getPublicUrl(fileName);
            await supabase.from('payment_verifications' as any).insert({
                user_id: user.id, screenshot_url: publicUrl, amount: 499, payment_method: 'manual_qr'
            } as any);
            toast.success("Submitted for review!");
            setPendingVerification({ status: 'pending' });
            setPaymentMethod(null);
        } catch (err: any) { toast.error(err.message); } finally { setUploading(false); }
    };

    const price = isNepal ? "NPR 499" : "$4.99";

    const plans = [
        { name: "FREE", price: isNepal ? "0" : "0", features: ["Basic Profile", "Global Visibility"], current: !isPro },
        { name: "PRO", price: isNepal ? "499" : "4.99", features: ["Verified Badge", "Featured Worldwide", "Unlimited Messages"], current: isPro, popular: true },
    ];

    if (success) {
        return (
            <div className="max-w-[600px] mx-auto py-24 text-center">
                <PartyPopper className="w-12 h-12 text-primary mx-auto mb-6" />
                <h1 className="text-4xl text-white mb-4">Welcome to PRO!</h1>
                <button onClick={() => window.location.href = "/"} className="bg-primary text-black px-8 py-3 rounded-xl mt-8">Dashboard</button>
            </div>
        );
    }

    return (
        <div className="max-w-[1000px] mx-auto px-6 py-12">
            <div className="text-center mb-16">
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-[0.65rem] uppercase mb-6 border border-primary/20">
                    <Globe className="w-4 h-4" />
                    Casting Hub {isNepal ? "Nepal" : "Global"}
                </div>
                <h1 className="text-5xl md:text-7xl text-primary font-display italic mb-6">Elevate Your Career</h1>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto uppercase tracking-tighter">Get discovered by casting directors {isNepal ? "in Nepal & Worldwide" : "Worldwide"}.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-20">
                {plans.map((plan, idx) => (
                    <div key={plan.name} className={`bg-card/50 border-2 rounded-[2.5rem] p-10 ${plan.popular ? "border-primary" : "border-card-border"}`}>
                        <h3 className="text-[0.65rem] text-primary/60 mb-3 uppercase tracking-widest">{plan.name} PLAN</h3>
                        <div className="flex items-baseline gap-2 mb-8">
                            <span className="text-5xl font-display text-white italic">{isNepal ? "NPR" : "$"}{plan.price}</span>
                            <span className="text-xs text-muted-foreground">/ MONTH</span>
                        </div>
                        <ul className="space-y-4 mb-10">
                            {plan.features.map(f => <li key={f} className="flex items-center gap-3 text-sm text-foreground/80"><Check size={14} className="text-primary" /> {f}</li>)}
                        </ul>
                        <button disabled={plan.current} onClick={() => idx === 1 && document.getElementById('payment-section')?.scrollIntoView({ behavior: 'smooth' })} className={`w-full py-4 rounded-xl text-xs uppercase tracking-[2px] ${plan.current ? "bg-secondary text-muted-foreground" : "bg-primary text-black"}`}>
                            {plan.current ? "Active" : "Go Pro Now"}
                        </button>
                    </div>
                ))}
            </div>

            <div id="payment-section" className="bg-card/30 border-2 border-card-border rounded-[3rem] p-12 text-center max-w-3xl mx-auto shadow-2xl relative overflow-hidden">
                <Wallet className="text-primary w-6 h-6 mx-auto mb-6" />
                <h3 className="text-3xl text-primary italic mb-8">Secure Checkout</h3>

                {isNepal === null ? <Loader2 className="animate-spin mx-auto text-primary" /> : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {isNepal ? (
                            <>
                                <button onClick={() => initEsewa(499)} className="p-8 bg-white/5 border-2 border-white/5 rounded-[2rem] hover:border-[#60bb46] transition-all flex flex-col items-center">
                                    <img src="/esewa.png" className="h-10 mb-4" alt="eSewa" />
                                    <span className="text-[0.6rem] uppercase tracking-widest">Pay via eSewa</span>
                                </button>
                                <button onClick={initKhalti} className="p-8 bg-white/5 border-2 border-white/5 rounded-[2rem] hover:border-[#5c2d91] transition-all flex flex-col items-center">
                                    <img src="/khalti.jpg" className="h-10 mb-4 rounded" alt="Khalti" />
                                    <span className="text-[0.6rem] uppercase tracking-widest">Pay via Khalti</span>
                                </button>
                                <button onClick={() => setPaymentMethod("manual")} className="sm:col-span-2 p-8 bg-white/5 border-2 border-white/5 rounded-[2rem] hover:border-primary transition-all flex flex-col items-center">
                                    <QrCode className="mb-4 text-primary" />
                                    <span className="text-[0.6rem] uppercase tracking-widest">Direct QR Transfer</span>
                                </button>
                            </>
                        ) : (
                            <button onClick={initStripe} className="sm:col-span-2 p-12 bg-white/5 border-2 border-white/5 rounded-[2.5rem] hover:border-primary transition-all flex flex-col items-center">
                                <div className="flex gap-6 mb-6">
                                    <CreditCard size={32} className="text-primary" />
                                    <Apple size={32} className="text-white opacity-40" />
                                    <Globe size={32} className="text-blue-400 opacity-40" />
                                </div>
                                <span className="text-lg text-white mb-2">Global Credit Card / Apple Pay</span>
                                <span className="text-[0.6rem] uppercase tracking-widest opacity-40">Secured by Stripe</span>
                            </button>
                        )}
                    </div>
                )}

                {paymentMethod === "manual" && isNepal && (
                    <div className="mt-8 p-8 bg-black/40 border border-primary/20 rounded-2xl text-left">
                        <h4 className="text-white uppercase tracking-widest mb-6 flex gap-2"><QrCode className="text-primary" /> Step 1: Scan QR</h4>
                        <div className="aspect-square w-48 bg-white p-4 rounded-xl mx-auto mb-6">
                            <img src="/rbb-qr.png" alt="RBB QR" className="w-full h-full object-contain" />
                        </div>
                        <div className="space-y-6">
                            <h4 className="text-white uppercase tracking-widest flex gap-2"><Landmark className="text-primary" /> Step 2: Upload Screenshot</h4>
                            <input type="file" onChange={e => setScreenshot(e.target.files?.[0] || null)} className="bg-white/5 border border-white/10 w-full p-3 rounded-xl text-xs" />
                            <button onClick={handleManualSubmit} disabled={!screenshot || uploading} className="bg-primary text-black w-full py-4 rounded-xl uppercase tracking-widest text-[0.65rem]">
                                {uploading ? <Loader2 className="animate-spin mx-auto" /> : "Submit Review"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
