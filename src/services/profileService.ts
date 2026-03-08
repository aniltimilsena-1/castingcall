import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

export type Profile = Tables<"profiles"> & {
    mood_tags?: string[];
    style_tags?: string[];
    personality_traits?: string[];
    looks_like?: string[];
    trending_score?: number;
    visual_search_keywords?: string;
};

export const profileService = {
    async getProfileById(id: string) {
        const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .or(`id.eq.${id},user_id.eq.${id}`)
            .maybeSingle();

        if (error) throw error;
        return data;
    },

    async updateProfile(userId: string, updates: Partial<Profile>) {
        const { data, error } = await supabase
            .from("profiles")
            .update(updates as any)
            .eq("user_id", userId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async getFeaturedProfiles(isAdmin: boolean = false) {
        let q = supabase.from("profiles").select("*").eq("plan", "pro");
        if (!isAdmin) {
            q = q.neq("role", "Admin");
        }
        const { data, error } = await q.order("created_at", { ascending: false });
        if (error) throw error;
        return data;
    },

    async searchProfiles(params: {
        query?: string;
        role?: string;
        isTrending?: boolean;
        isAdmin?: boolean;
        moods?: string[];
        styles?: string[];
        traits?: string[];
        looksLike?: string;
    }) {
        let q = supabase.from("profiles").select("*");

        if (params.isTrending) {
            q = q.order('trending_score', { ascending: false });
        } else {
            q = q.order('plan', { ascending: false });
        }

        if (params.role) {
            q = q.eq("role", params.role);
        }

        if (params.query) {
            // Logic for UUID vs Keyword search
            const trimmed = params.query.trim();
            const profileUrlMatch = trimmed.match(/\/profile\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
            const uuidFromQuery = profileUrlMatch ? profileUrlMatch[1] : (
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed) ? trimmed : null
            );

            if (uuidFromQuery) {
                q = q.or(`id.eq.${uuidFromQuery},user_id.eq.${uuidFromQuery}`);
            } else {
                q = q.or(`name.ilike.%${params.query}%,role.ilike.%${params.query}%,bio.ilike.%${params.query}%`);

                if (params.moods?.length) q = q.overlaps('mood_tags', params.moods.map(m => m.toLowerCase()));
                if (params.styles?.length) q = q.overlaps('style_tags', params.styles.map(s => s.toLowerCase()));
                if (params.traits?.length) q = q.overlaps('personality_traits', params.traits.map(t => t.toLowerCase()));
            }
        }

        if (params.looksLike) {
            q = q.overlaps('looks_like', [params.looksLike]);
        }

        if (!params.isAdmin) {
            q = q.neq('role', 'Admin');
        }

        const { data, error } = await q;
        if (error) throw error;
        return data;
    },

    async trackProfileView(profileId: string, viewerId?: string) {
        const { error } = await supabase.from("profile_views" as any).insert({
            profile_id: profileId,
            viewer_id: viewerId || null,
        } as any);
        if (error) console.error("Track view error:", error);
    },

    async getTalentProjects(talentId: string) {
        const { data, error } = await supabase
            .from("applications" as any)
            .select("project_id")
            .eq("user_id", talentId);
        if (error) throw error;
        return (data || []).map((a: any) => a.project_id);
    },

    async getDigitalProducts(talentId: string) {
        const { data, error } = await supabase
            .from("digital_products" as any)
            .select("*")
            .eq("user_id", talentId)
            .eq("is_active", true);
        if (error) throw error;
        return data || [];
    }
};
