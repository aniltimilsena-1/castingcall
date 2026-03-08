import { supabase } from "@/integrations/supabase/client";

export const adminService = {
    async getAllAdminData() {
        const [pRes, prRes, fRes, aRes, sRes, tRes, vRes] = await Promise.all([
            supabase.from("profiles").select("*").order("created_at", { ascending: false }),
            supabase.from("projects").select("*").order("created_at", { ascending: false }),
            supabase.from("photo_captions").select("*").order("created_at", { ascending: false }),
            supabase.from("applications" as any).select("*, projects:project_id(title)").order("created_at", { ascending: false }),
            supabase.from("audition_slots" as any).select("*, projects:project_id(title)").order("start_time", { ascending: true }),
            supabase.from("transactions" as any).select("*").order("created_at", { ascending: false }),
            supabase.from("payment_verifications" as any).select("*").order("created_at", { ascending: false })
        ]);

        return {
            profiles: pRes.data || [],
            projects: prRes.data || [],
            feedItems: fRes.data || [],
            applications: aRes.data || [],
            schedules: sRes.data || [],
            finances: tRes.data || [],
            verifications: vRes.data || []
        };
    },

    async approvePayment(v: any) {
        const pType = v.payment_type || 'pro';
        const meta = v.metadata || {};

        if (pType === 'pro') {
            await supabase.from("profiles").update({ plan: 'pro' } as any).eq("user_id", v.user_id);
        } else if (pType === 'fan_pass') {
            await supabase.from("fan_subscriptions" as any).insert({
                subscriber_id: v.user_id,
                talent_id: meta.talent_id,
                status: 'active',
                expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            });
        } else if (pType === 'product') {
            await supabase.from("product_purchases" as any).insert({
                buyer_id: v.user_id,
                product_id: meta.product_id,
                amount_paid: v.amount
            });
        } else if (pType === 'tip') {
            await supabase.from("tips" as any).insert({
                sender_id: v.user_id,
                receiver_id: meta.talent_id,
                amount: v.amount,
                post_url: meta.post_url,
                message: "Gift approved by admin"
            });
        } else if (pType === 'unlock') {
            await supabase.from("photo_purchases" as any).insert({
                buyer_id: v.user_id,
                photo_url: meta.post_url,
                amount_paid: v.amount
            });
        }

        // Mark verified
        await supabase.from("payment_verifications" as any).update({ status: 'approved' }).eq("id", v.id);

        // Create transaction record
        await supabase.from("transactions" as any).insert({
            user_id: v.user_id,
            amount: v.amount,
            currency: v.currency || 'NPR',
            payment_type: pType,
            payment_method: 'manual_verification',
            metadata: meta
        } as any);

        // Create notification
        await supabase.from("notifications" as any).insert({
            user_id: v.user_id,
            title: "Payment Approved",
            content: `Your payment for ${pType.toUpperCase()} has been verified. Access granted!`,
            type: "payment"
        });
    },

    async rejectPayment(v: any) {
        await supabase.from("payment_verifications" as any).update({ status: 'rejected' }).eq("id", v.id);

        await supabase.from("notifications" as any).insert({
            user_id: v.user_id,
            title: "Payment Rejected",
            content: `Your payment for ${v.payment_type?.toUpperCase()} was rejected. Please check your details.`,
            type: "payment"
        });
    },

    async deleteProfile(userId: string) {
        await supabase.from("profiles").delete().eq("user_id", userId);
    },

    async updateTalentBadge(userId: string, plan: string) {
        await supabase.from("profiles").update({ plan } as any).eq("user_id", userId);
    },

    async deleteProject(projectId: string) {
        await supabase.from("projects").delete().eq("id", projectId);
    }
};
