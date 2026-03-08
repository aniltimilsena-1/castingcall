import { supabase } from "@/integrations/supabase/client";

export const paymentService = {
    async getFanSubscriptions(userId: string) {
        const { data, error } = await supabase
            .from("fan_subscriptions" as any)
            .select("talent_id")
            .eq("subscriber_id", userId)
            .eq("status", "active");

        if (error) throw error;
        return (data || []).map((s: any) => s.talent_id);
    },

    async getPurchasedPosts(userId: string) {
        const { data: purchases } = await supabase
            .from("purchased_content" as any)
            .select("photo_url")
            .eq("user_id", userId);
        return new Set((purchases || []).map((p: any) => p.photo_url));
    },

    async verifySubscription(subscriberId: string, talentId: string) {
        const { data, error } = await supabase
            .from("fan_subscriptions" as any)
            .select("id")
            .eq("subscriber_id", subscriberId)
            .eq("talent_id", talentId)
            .eq("status", "active")
            .maybeSingle();

        if (error) throw error;
        return !!data;
    },

    async recordPayment(payload: {
        user_id: string;
        amount: number;
        currency: string;
        payment_method: string;
        status: string;
        type: string;
        metadata: any;
        screenshot_url?: string;
    }) {
        const { data, error } = await supabase
            .from("payments" as any)
            .insert(payload)
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};
