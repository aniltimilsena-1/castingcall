import { supabase } from "@/integrations/supabase/client";

export const feedService = {
    async getFeedData(isAdmin: boolean = false) {
        let q = supabase
            .from("profiles")
            .select("id, user_id, name, photo_url, role, plan, photos, created_at");

        if (!isAdmin) {
            q = q.neq('role', 'Admin');
        }

        const { data: profiles, error } = await q.order("created_at", { ascending: false });
        if (error) throw error;
        return profiles;
    },

    async getVideoMap() {
        try {
            const { data: videoProfiles } = await supabase
                .from("profiles")
                .select("user_id, videos");

            const videoMap: Record<string, string[]> = {};
            (videoProfiles || []).forEach((p: any) => {
                if (p.videos?.length) videoMap[p.user_id] = p.videos;
            });
            return videoMap;
        } catch (_) {
            return {};
        }
    },

    async getCaptionMap() {
        const { data: captionRows } = await supabase
            .from("photo_captions")
            .select("photo_url, description, is_premium, price");

        const captionMap: Record<string, { description: string, isPremium: boolean, price: number }> = {};
        (captionRows || []).forEach(row => {
            captionMap[row.photo_url] = {
                description: row.description || "",
                isPremium: row.is_premium || false,
                price: row.price || 0
            };
        });
        return captionMap;
    },

    async getLikes(urls: string[]) {
        const { data: likeRows } = await supabase
            .from("photo_likes")
            .select("photo_url, user_id")
            .in("photo_url", urls);
        return likeRows || [];
    },

    async getComments(urls: string[]) {
        const { data: commentRows } = await supabase
            .from("photo_comments")
            .select("id, photo_url, content, user_id, created_at")
            .in("photo_url", urls)
            .order("created_at", { ascending: true });
        return commentRows || [];
    },

    async getCommenters(ids: string[]) {
        const { data: commenters } = await supabase
            .from("profiles")
            .select("user_id, name, photo_url")
            .in("user_id", ids);
        return commenters || [];
    },

    async likePost(photoUrl: string, userId: string) {
        const { error } = await supabase
            .from("photo_likes")
            .insert({ photo_url: photoUrl, user_id: userId });
        if (error) throw error;
    },

    async unlikePost(photoUrl: string, userId: string) {
        const { error } = await supabase
            .from("photo_likes")
            .delete()
            .eq("photo_url", photoUrl)
            .eq("user_id", userId);
        if (error) throw error;
    },

    async addComment(photoUrl: string, userId: string, content: string) {
        const { data, error } = await supabase
            .from("photo_comments")
            .insert({ photo_url: photoUrl, user_id: userId, content: content.trim() })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async deleteComment(commentId: string) {
        const { error } = await supabase
            .from("photo_comments")
            .delete()
            .eq("id", commentId);
        if (error) throw error;
    }
};
