import { supabase } from "@/integrations/supabase/client";

export const feedService = {
    async getFeedData(limit = 40) {
        const { data: profiles, error } = await supabase
            .from("profiles")
            .select("id, user_id, name, photo_url, role, plan, photos, videos, created_at")
            .neq("role", "Admin")
            .order("created_at", { ascending: false })
            .limit(limit);
        
        if (error) throw error;
        return profiles;
    },

    async getVideoMap() {
        // Redundant as getFeedData now pulls videos directly into items
        return {};
    },

    async getCaptionMap() {
        try {
            const { data: captionRows, error } = await supabase
                .from("photo_captions")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(400);

            if (error) {
                console.warn("Caption fetch error:", error.message);
                return {};
            }

            const captionMap: Record<string, { description: string, isPremium: boolean, price: number }> = {};
            (captionRows || []).forEach((row: any) => {
                captionMap[row.photo_url] = {
                    description: row.description || "",
                    isPremium: row.is_premium || false,
                    price: row.price || 0
                };
            });
            return captionMap;
        } catch (_) {
            return {};
        }
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
            .select("id, photo_url, content, user_id, created_at, parent_id")
            .in("photo_url", urls)
            .order("created_at", { ascending: true });
        return commentRows || [];
    },

    async getCommentLikes(commentIds: string[]) {
        const { data: likeRows } = await supabase
            .from("photo_comment_likes")
            .select("comment_id, user_id")
            .in("comment_id", commentIds);
        return likeRows || [];
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

    async addComment(photoUrl: string, userId: string, content: string, parentId: string | null = null) {
        const trimmed = content.trim();
        if (!trimmed) {
            throw new Error("Comment cannot be empty");
        }
        
        const { data, error } = await supabase
            .from("photo_comments")
            .insert({ 
                photo_url: photoUrl, 
                user_id: userId, 
                content: trimmed,
                parent_id: parentId 
            })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async likeComment(commentId: string, userId: string) {
        const { error } = await supabase
            .from("photo_comment_likes")
            .insert({ comment_id: commentId, user_id: userId });
        if (error) throw error;
    },

    async unlikeComment(commentId: string, userId: string) {
        const { error } = await supabase
            .from("photo_comment_likes")
            .delete()
            .eq("comment_id", commentId)
            .eq("user_id", userId);
        if (error) throw error;
    },

    async deleteComment(commentId: string) {
        const { error } = await supabase
            .from("photo_comments")
            .delete()
            .eq("id", commentId);
        if (error) throw error;
    },

    async getSavedPostUrls(userId: string) {
        try {
            const { data, error } = await supabase
                .from("saved_posts")
                .select("post_url")
                .eq("user_id", userId);
            if (error) {
                console.warn("Saved posts table not found or error:", error.message);
                return [];
            }
            return (data || []).map((s: any) => s.post_url);
        } catch (_) {
            return [];
        }
    },

    async savePost(userId: string, postUrl: string) {
        try {
            const { error } = await supabase
                .from("saved_posts")
                .insert({ user_id: userId, post_url: postUrl });
            if (error) throw error;
        } catch (err: any) {
            console.error("Save post error:", err);
            throw err;
        }
    },

    async unsavePost(userId: string, postUrl: string) {
        try {
            const { error } = await supabase
                .from("saved_posts")
                .delete()
                .eq("user_id", userId)
                .eq("post_url", postUrl);
            if (error) throw error;
        } catch (err: any) {
            console.error("Unsave post error:", err);
            throw err;
        }
    }
};
