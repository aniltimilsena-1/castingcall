import { supabase } from "@/integrations/supabase/client";

export const adminService = {
    async getAllAdminData() {
        // Individual fetches with catch to prevent one failure from breaking everything
        const fetchTable = async (table: string, query: string = "*", order: any = { column: "created_at", ascending: false }) => {
            try {
                const { data, error } = await supabase
                    .from(table as any)
                    .select(query)
                    .order(order.column, { ascending: order.ascending });
                if (error) {
                    console.warn(`Admin fetch error for table ${table}:`, error.message);
                    return [];
                }
                return data || [];
            } catch (err) {
                console.error(`Unexpected error fetching ${table}:`, err);
                return [];
            }
        };

        const [profiles, projects, feedItems, applications, schedules, finances, verifications] = await Promise.all([
            fetchTable("profiles"),
            fetchTable("projects"),
            fetchTable("photo_captions"),
            fetchTable("applications", "*, projects:project_id(title)"),
            fetchTable("audition_slots", "*, projects:project_id(title)", { column: "start_time", ascending: true }),
            fetchTable("transactions"),
            fetchTable("payment_verifications")
        ]);

        return {
            profiles,
            projects,
            feedItems,
            applications,
            schedules,
            finances,
            verifications
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
            await supabase.from("product_purchases").insert({
                buyer_id: v.user_id,
                product_id: meta.product_id,
                amount_paid: v.amount
            });
        } else if (pType === 'tip') {
            await supabase.from("tips").insert({
                sender_id: v.user_id,
                receiver_id: meta.talent_id,
                amount: v.amount,
                post_url: meta.post_url,
                message: "Gift approved by admin"
            });
        } else if (pType === 'unlock') {
            await supabase.from("photo_purchases").insert({
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
        await supabase.from("notifications").insert({
            user_id: v.user_id,
            title: "Payment Approved",
            message: `Your payment for ${pType.toUpperCase()} has been verified. Access granted!`,
        });
    },

    async rejectPayment(v: any) {
        await supabase.from("payment_verifications").update({ status: 'rejected' } as any).eq("id", v.id);

        await supabase.from("notifications").insert({
            user_id: v.user_id,
            title: "Payment Rejected",
            message: `Your payment for ${v.payment_type?.toUpperCase()} was rejected. Please check your details.`,
        });
    },

    async deleteProfile(userId: string) {
        return await supabase.from("profiles").delete().eq("user_id", userId);
    },

    async updateTalentBadge(userId: string, plan: string) {
        await supabase.from("profiles").update({ plan } as any).eq("user_id", userId);
    },

    async deleteProject(projectId: string) {
        return await supabase.from("projects").delete().eq("id", projectId);
    }
};
