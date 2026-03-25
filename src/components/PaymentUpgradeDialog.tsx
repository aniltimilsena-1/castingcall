import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { CreditCard, QrCode, Upload, Check, X, ShieldCheck, Zap, Crown, ShoppingBag, Gift } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface PaymentUpgradeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user: User | null;
    type: 'pro' | 'fan_pass' | 'unlock' | 'product' | 'tip';
    amount: number;
    metadata?: Record<string, any> | null;
    currency?: string;
    currencySymbol?: string;
    onSuccess?: () => void;
}

export default function PaymentUpgradeDialog({
    open,
    onOpenChange,
    user,
    type,
    amount,
    metadata,
    currency = 'USD',
    currencySymbol = '$',
    onSuccess
}: PaymentUpgradeDialogProps) {
    const [method, setMethod] = useState<'card' | 'manual' | null>(null);
    const [uploading, setUploading] = useState(false);
    const [step, setStep] = useState<'select' | 'pay' | 'confirm'>('select');

    const handleManualUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const filePath = `${user.id}/${Math.random()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage.from('payments').upload(filePath, file);
            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('payments').getPublicUrl(filePath);

            const { error: dbError } = await supabase.from('payment_verifications').insert({
                user_id: user.id,
                amount: amount,
                screenshot_url: publicUrl,
                status: 'pending',
                payment_type: type,
                metadata: metadata
            });

            if (dbError) throw dbError;

            toast.success("Payment proof submitted! Admin will verify shortly.");
            setStep('confirm');
        } catch (err: any) {
            toast.error(err.message || "Upload failed");
        } finally {
            setUploading(false);
        }
    };

    const handleStripeSimulate = () => {
        setUploading(true);
        const toastId = toast.loading("Connecting to Stripe Secure Gateway...");

        // Calculate USD equivalent if needed for simulation display
        const usdAmount = currency === 'NPR' ? (amount / 135).toFixed(2) : amount;

        setTimeout(() => {
            toast.dismiss(toastId);
            setUploading(false);
            toast.success(`Payment of $${usdAmount} successful! (Simulated)`);
            onSuccess?.();
            onOpenChange(false);
        }, 2000);
    };

    const getTitle = () => {
        switch (type) {
            case 'pro': return "Upgrade to Global PRO";
            case 'fan_pass': return "Get Fan Subscription";
            case 'unlock': return "Unlock Premium Content";
            case 'product': return "Purchase Digital Good";
            case 'tip': return "Send a Gift";
            default: return "Secure Payment";
        }
    };

    const getIcon = () => {
        switch (type) {
            case 'pro': return <Crown className="text-amber-500" />;
            case 'fan_pass': return <Zap className="text-primary" />;
            case 'unlock': return <ShieldCheck className="text-blue-500" />;
            case 'product': return <ShoppingBag className="text-orange-500" />;
            case 'tip': return <Gift className="text-pink-500" />;
            default: return <CreditCard />;
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md bg-card border-border p-0 overflow-hidden rounded-[2.5rem] shadow-2xl">
                <div className="p-8">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center border border-border">
                            {getIcon()}
                        </div>
                        <div>
                            <h2 className="text-xl font-display text-foreground">{getTitle()}</h2>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">{currencySymbol}{amount} {currency} Contribution</p>
                        </div>
                    </div>

                    <AnimatePresence mode="wait">
                        {step === 'select' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                                <button
                                    onClick={() => { setMethod('card'); setStep('pay'); }}
                                    className="w-full group relative overflow-hidden bg-primary text-primary-foreground p-5 rounded-2xl font-bold transition-all hover:scale-[1.02] flex items-center justify-between shadow-lg shadow-primary/20"
                                >
                                    <div className="flex items-center gap-3">
                                        <CreditCard size={20} />
                                        <span>Pay with Card / Stripe</span>
                                    </div>
                                    <Check size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>

                                <button
                                    onClick={() => { setMethod('manual'); setStep('pay'); }}
                                    className="w-full group bg-secondary border border-border text-foreground p-5 rounded-2xl font-bold transition-all hover:bg-secondary/80 flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-3">
                                        <QrCode size={20} />
                                        <span>eSewa / Khalti / manual</span>
                                    </div>
                                    <Upload size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
                                </button>
                            </motion.div>
                        )}

                        {step === 'pay' && method === 'card' && (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                                <div className="bg-secondary p-6 rounded-2xl border border-border text-center space-y-4">
                                    <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto">
                                        <CreditCard className="text-blue-500" size={32} />
                                    </div>
                                    <p className="text-sm text-muted-foreground">You are being redirected to Stripe for a secure global checkout.</p>
                                </div>
                                <button
                                    onClick={handleStripeSimulate}
                                    disabled={uploading}
                                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-4 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                                >
                                    {uploading ? 'Processing Secure Connection...' : `Confirm & Pay $${currency === 'NPR' ? (amount / 135).toFixed(2) : amount} (USD Equivalent)`}
                                </button>
                                <button onClick={() => setStep('select')} className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors">Go Back</button>
                            </motion.div>
                        )}

                        {step === 'pay' && method === 'manual' && (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                                <div className="bg-secondary p-6 rounded-2xl border border-border space-y-6">
                                    <div className="flex justify-center">
                                        <div className="w-40 h-40 bg-card p-2 rounded-xl ring-1 ring-border flex items-center justify-center">
                                            <QRCodeSVG 
                                                value="CastingHubGlobal" 
                                                size={144}
                                                level="M"
                                                includeMargin={false}
                                                aria-label="Casting Hub Global QR Code"
                                                fgColor="currentColor"
                                                className="text-foreground"
                                            />
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs font-bold text-foreground mb-1">Casting Hub Global QR</p>
                                        <p className="text-[0.7rem] text-muted-foreground uppercase tracking-[1px]">
                                            Scan and pay {currency === 'USD' ? 'Rs. ' : currencySymbol}{Math.round(currency === 'USD' ? amount * 135 : amount)}
                                            {currency === 'USD' ? ' (NPR Equivalent)' : ''}
                                        </p>
                                    </div>
                                </div>

                                <div className="relative">
                                    <input
                                        type="file"
                                        id="screenshot-up"
                                        className="hidden"
                                        onChange={handleManualUpload}
                                        disabled={uploading}
                                    />
                                    <label
                                        htmlFor="screenshot-up"
                                        className="w-full flex flex-col items-center justify-center border-2 border-dashed border-border rounded-2xl py-8 cursor-pointer hover:border-primary/30 hover:bg-primary/5 transition-all"
                                    >
                                        {uploading ? (
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                                        ) : (
                                            <>
                                                <Upload className="text-muted-foreground mb-2" size={24} />
                                                <span className="text-sm font-bold text-foreground">Upload Screenshot</span>
                                                <span className="text-[0.65rem] text-muted-foreground">Confirm your transfer proof</span>
                                            </>
                                        )}
                                    </label>
                                </div>
                                <button onClick={() => setStep('select')} className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors">Go Back</button>
                            </motion.div>
                        )}

                        {step === 'confirm' && (
                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8 space-y-6">
                                <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                                    <Check className="text-green-600" size={40} />
                                </div>
                                <div>
                                    <h3 className="text-xl text-foreground font-bold mb-2">Request Submitted</h3>
                                    <p className="text-sm text-muted-foreground">Our financing team will verify the screenshot and activate your {type.replace('_', ' ')} within 1-2 hours.</p>
                                </div>
                                <button
                                    onClick={() => onOpenChange(false)}
                                    className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-bold transition-all shadow-lg shadow-primary/20"
                                >
                                    Close & Continue
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="bg-secondary px-8 py-4 flex items-center gap-2">
                    <ShieldCheck size={14} className="text-green-600" />
                    <span className="text-[0.65rem] text-muted-foreground uppercase tracking-wider">End-to-End Encrypted Secure Checkout</span>
                </div>
            </DialogContent>
        </Dialog>
    );
}
