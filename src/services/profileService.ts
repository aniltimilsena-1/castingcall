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

    async updateFcmToken(userId: string, token: string) {
        const { error } = await supabase
            .from("profiles")
            .update({ fcm_token: token } as any)
            .eq("user_id", userId);

        if (error) throw error;
    },

    async getFeaturedProfiles() {
        const { data: proProfiles, error } = await supabase.from("profiles")
            .select("*")
            .eq("plan", "pro")
            .neq("role", "Admin")
            .order("created_at", { ascending: false })
            .limit(10);
            
        if (error) throw error;
        
        if (proProfiles && proProfiles.length > 0) return proProfiles;
        
        // Fallback to latest profiles (but prioritize active ones)
        const { data: latest } = await supabase.from("profiles")
            .select("*")
            .neq("role", "Admin")
            .order("updated_at", { ascending: false })
            .limit(50);
            
        return latest || [];
    },

    async getProProfiles() {
        const { data, error } = await supabase.from("profiles")
            .select("*")
            .eq("plan", "pro")
            .neq("role", "Admin")
            .order("created_at", { ascending: false })
            .limit(10);
            
        if (error) throw error;
        return data || [];
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
        // Optimize: Only fetch fields needed for the search list to reduce payload size
        let q = supabase.from("profiles").select("id, user_id, name, photo_url, role, plan, location, experience_years, trending_score, bio, mood_tags, style_tags, is_verified, created_at, personality_traits, looks_like, visual_search_keywords");

        q = q.neq("role", "Admin");

        if (params.isTrending) {
            q = q.order('trending_score', { ascending: false });
        } else {
            q = q.order('plan', { ascending: false });
        }

        // Add a reasonable limit for performance
        q = q.limit(50);

        if (params.role) {
            q = q.eq("role", params.role);
        }

        if (params.query) {
            const trimmed = params.query.trim();
            const profileUrlMatch = trimmed.match(/\/profile\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
            const uuidFromQuery = profileUrlMatch ? profileUrlMatch[1] : (
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed) ? trimmed : null
            );

            if (uuidFromQuery) {
                q = q.or(`id.eq.${uuidFromQuery},user_id.eq.${uuidFromQuery}`);
            } else {
                // Escape ILIKE wildcards to prevent unintended matches
                const escaped = params.query.replace(/[%_\\]/g, '\\$&');
                q = q.ilike('name', `%${escaped}%`);
            }
        }

        // Apply filters independently of query
        if (params.moods?.length) q = q.overlaps('mood_tags', params.moods.map(m => m.toLowerCase()));
        if (params.styles?.length) q = q.overlaps('style_tags', params.styles.map(s => s.toLowerCase()));
        if (params.traits?.length) q = q.overlaps('personality_traits', params.traits.map(t => t.toLowerCase()));
        if (params.looksLike) q = q.overlaps('looks_like', [params.looksLike.toLowerCase()]);

        const { data, error } = await q;
        if (error) {
            console.error("Supabase search error:", error);
            throw error;
        }
        return data || [];
    },

    async trackProfileView(profileId: string, viewerId?: string) {
        const { error } = await supabase.from("profile_views").insert({
            profile_id: profileId,
            viewer_id: viewerId || null,
        });
        if (error) console.error("Track view error:", error);
    },

    async getTalentProjects(talentId: string) {
        const { data, error } = await supabase
            .from("applications")
            .select("project_id")
            .eq("applicant_id", talentId);
        if (error) throw error;
        return (data || []).map((a: any) => a.project_id);
    },

    async getDigitalProducts(talentId: string) {
        // Separate out to avoid deep instantiation error
        const query = supabase
            .from("digital_products" as any)
            .select("*")
            .eq("seller_id", talentId)
            .eq("is_active", true);
        const { data, error } = await (query as any);
        if (error) throw error;
        return data || [];
    },

    async getSavedTalentIds(userId: string) {
        const { data, error } = await supabase
            .from("saved_talents")
            .select("talent_profile_id")
            .eq("user_id", userId);
        if (error) throw error;
        return (data || []).map(s => s.talent_profile_id);
    },

    async getSavedProfiles(userId: string) {
        const ids = await this.getSavedTalentIds(userId);
        if (ids.length === 0) return [];
        const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .in("id", ids);
        if (error) throw error;
        return data || [];
    },

    async saveProfile(userId: string, talentProfileId: string) {
        const { error } = await supabase
            .from("saved_talents")
            .insert({ user_id: userId, talent_profile_id: talentProfileId });
        if (error) throw error;
    },

    async unsaveProfile(userId: string, talentProfileId: string) {
        const { error } = await supabase
            .from("saved_talents")
            .delete()
            .eq("user_id", userId)
            .eq("talent_profile_id", talentProfileId);
        if (error) throw error;
    },

    async getGlobalStats() {
        const fetchCount = async (table: string) => {
            try {
                const { count, error } = await supabase.from(table as any).select("id", { count: 'exact', head: true });
                if (error) return 0;
                return count || 0;
            } catch {
                return 0;
            }
        };

        const [talentsCount, projectsCount, viewsCount, appsCount] = await Promise.all([
            fetchCount("profiles"),
            fetchCount("projects"),
            fetchCount("profile_views"),
            fetchCount("applications")
        ]);

        return {
            talentsCount,
            projectsCount,
            viewsCount,
            successCount: appsCount
        };
    }
};
