import { supabase } from "@/integrations/supabase/client";

export const adminService = {
    async getAllAdminData() {
        const fetchTable = async (table: string, query: string = "*", options: { order?: { column: string, ascending: boolean }, limit?: number } = {}): Promise<any[]> => {
            const { order = { column: "created_at", ascending: false }, limit } = options;
            try {
                let q = (supabase.from(table as any) as any).select(query).order(order.column, { ascending: order.ascending });
                if (limit) q = q.limit(limit);
                
                const { data, error } = await q;
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

        const [profiles, projects, feedItems, applications, schedules, finances, verifications, crashReports] = await Promise.all([
            fetchTable("profiles", "*", { limit: 100 }),
            fetchTable("projects", "*", { limit: 50 }),
            fetchTable("photo_captions", "*", { limit: 200 }),
            fetchTable("applications", "*, projects:project_id(title)", { limit: 100 }),
            fetchTable("audition_slots", "*, projects:project_id(title)", { order: { column: "start_time", ascending: true }, limit: 50 }),
            fetchTable("transactions", "*", { limit: 100 }),
            fetchTable("payment_verifications", "*", { limit: 50 }),
            fetchTable("crash_reports" as any, "*", { limit: 50 })
        ]);

        return {
            profiles,
            projects,
            feedItems,
            applications,
            schedules,
            finances,
            verifications,
            crashReports
        };
    },

    async getRecentProjects(limit = 10) {
        const { data, error } = await supabase
            .from("projects")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(limit);
        if (error) {
            console.error("Error fetching recent projects:", error);
            return [];
        }
        return data || [];
    },

    async approvePayment(v: any) {
        const pType = v.payment_type || 'pro';
        const meta = v.metadata || {};

        if (pType === 'pro') {
            const { error: e1 } = await (supabase.from("profiles") as any).update({ plan: 'pro' }).eq("user_id", v.user_id);
            if (e1) throw e1;
        } else if (pType === 'fan_pass') {
            const { error: e2 } = await (supabase.from("fan_subscriptions" as any) as any).insert({
                subscriber_id: v.user_id,
                talent_id: meta.talent_id,
                status: 'active',
                expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            });
            if (e2) throw e2;
        } else if (pType === 'product') {
            const { error: e3 } = await (supabase.from("product_purchases" as any) as any).insert({
                buyer_id: v.user_id,
                product_id: meta.product_id,
                amount_paid: v.amount
            });
            if (e3) throw e3;
        } else if (pType === 'tip') {
            const { error: e4 } = await (supabase.from("tips" as any) as any).insert({
                sender_id: v.user_id,
                receiver_id: meta.talent_id,
                amount: v.amount,
                post_url: meta.post_url,
                message: "Gift approved by admin"
            });
            if (e4) throw e4;
        } else if (pType === 'unlock') {
            const { error: e5 } = await (supabase.from("photo_purchases" as any) as any).insert({
                buyer_id: v.user_id,
                photo_url: meta.post_url,
                amount_paid: v.amount
            });
            if (e5) throw e5;
        }

        // Mark verified
        const { error: e6 } = await (supabase.from("payment_verifications" as any) as any).update({ status: 'approved' }).eq("id", v.id);
        if (e6) throw e6;

        // Create transaction record
        const { error: e7 } = await (supabase.from("transactions" as any) as any).insert({
            user_id: v.user_id,
            amount: v.amount,
            currency: v.currency || 'NPR',
            payment_type: pType,
            payment_method: 'manual_verification',
            metadata: meta
        });
        if (e7) throw e7;

        // Create notification
        const { error: e8 } = await (supabase.from("notifications" as any) as any).insert({
            user_id: v.user_id,
            title: "Payment Approved",
            message: `Your payment for ${pType.toUpperCase()} has been verified. Access granted!`,
        });
        if (e8) throw e8;
    },

    async rejectPayment(v: any) {
        const { error: e1 } = await (supabase.from("payment_verifications" as any) as any).update({ status: 'rejected' }).eq("id", v.id);
        if (e1) throw e1;

        const { error: e2 } = await (supabase.from("notifications" as any) as any).insert({
            user_id: v.user_id,
            title: "Payment Rejected",
            message: `Your payment for ${v.payment_type?.toUpperCase()} was rejected. Please check your details.`,
        });
        if (e2) throw e2;
    },

    async deleteProfile(userId: string) {
        const { data, error } = await (supabase.from("profiles" as any) as any).delete().eq("user_id", userId);
        if (error) throw error;
        return { data, error };
    },

    async updateTalentBadge(userId: string, plan: string) {
        const { error } = await (supabase.from("profiles" as any) as any).update({ plan }).eq("user_id", userId);
        if (error) throw error;
    },

    async deleteProject(projectId: string) {
        const { data, error } = await (supabase.from("projects" as any) as any).delete().eq("id", projectId);
        if (error) throw error;
        return { data, error };
    }
};
