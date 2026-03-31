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
        const { error } = await (supabase.rpc as any)('approve_payment_v2', {
            v_id: v.id,
            v_user_id: v.user_id,
            v_payment_type: v.payment_type || 'pro',
            v_amount: JSON.parse(JSON.stringify(v.amount || 0)), // Ensure FLOAT compatibility
            v_currency: v.currency || 'NPR',
            v_metadata: v.metadata || {}
        });
        if (error) throw error;
    },

    async rejectPayment(v: any) {
        const { error } = await (supabase.rpc as any)('reject_payment_v2', {
            v_id: v.id,
            v_user_id: v.user_id,
            v_payment_type: v.payment_type || 'unknown'
        });
        if (error) throw error;
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
