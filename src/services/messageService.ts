import { supabase } from "@/integrations/supabase/client";
import { settingsService } from "./settingsService";

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
        // 1. Check if recipient has blocked sender
        const isBlockedByRecipient = await settingsService.isBlocked(receiverId, senderId);
        if (isBlockedByRecipient) {
            throw new Error("You cannot send messages to this user.");
        }

        // 1b. Check if sender has blocked recipient
        const isBlockedByMe = await settingsService.isBlocked(senderId, receiverId);
        if (isBlockedByMe) {
            throw new Error("You have blocked this user. Unblock to send messages.");
        }

        // 2. Check if recipient allows messaging (Permissions)
        const recipientSettings = await settingsService.getSettings(receiverId);
        if (recipientSettings.visibility.messaging === "No one") {
            throw new Error("This user has disabled direct messaging.");
        }

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

        // 3. Auto-Response Logic (only if NOT an auto-response itself)
        if (!content.includes("[Auto-Response]") && recipientSettings.communication.autoResponse) {
            try {
               await supabase
                .from("messages")
                .insert({
                    sender_id: receiverId,
                    receiver_id: senderId,
                    content: `${recipientSettings.communication.autoResponse} [Auto-Response]`,
                });
            } catch (err) {
                console.error("Auto-response failed:", err);
            }
        }

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
