import { supabase } from "@/integrations/supabase/client";

export const messageService = {
    async getMessages(userId: string) {
        const { data, error } = await supabase
            .from("messages")
            .select("*")
            .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
            .order("created_at", { ascending: true });

        if (error) throw error;
        return data || [];
    },

    async getLatestMessages(userId: string) {
        // This is more complex logic often used in messaging apps to get the latest message per conversation
        const { data, error } = await supabase
            .from("messages")
            .select("*")
            .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
            .order("created_at", { ascending: false });

        if (error) throw error;
        return data || [];
    },

    async sendMessage(senderId: string, receiverId: string, content: string, fileUrl?: string, fileType?: 'image' | 'video' | 'file') {
        const { data, error } = await supabase
            .from("messages")
            .insert({
                sender_id: senderId,
                receiver_id: receiverId,
                content: content.trim(),
                file_url: fileUrl,
                file_type: fileType
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async markAsRead(messageIds: string[]) {
        const { error } = await supabase
            .from("messages")
            .update({ is_read: true })
            .in("id", messageIds);

        if (error) throw error;
    },

    async deleteMessage(messageId: string) {
        const { error } = await supabase
            .from("messages")
            .delete()
            .eq("id", messageId);

        if (error) throw error;
    },

    async getUnreadCount(userId: string) {
        const { count, error } = await supabase
            .from("messages")
            .select("*", { count: 'exact', head: true })
            .eq("receiver_id", userId)
            .or('is_read.eq.false,is_read.is.null');

        if (error) throw error;
        return count || 0;
    }
};
