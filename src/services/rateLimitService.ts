import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const rateLimitService = {
  /**
   * Checks if an identifier (email/phone) is currently rate limited.
   * If limited, it shows a toast and returns true.
   */
  async checkRateLimit(identifier: string): Promise<boolean> {
    const { data: isLimited, error } = await (supabase as any).rpc('check_auth_rate_limit', {
      target_identifier: identifier,
      max_attempts: 5,
      interval_minutes: 1
    });

    if (error) {
      console.warn("Rate limit check failed, skipping to allow login flow:", error);
      return false; // Fallback to let the user try
    }

    if (isLimited) {
      toast.error("Too many login attempts. Please wait 1 minute before trying again.", {
        description: "X-RateLimit-Limit: 5/min"
      });
      return true;
    }

    return false;
  },

  /**
   * Records a success or failure for an authentication attempt.
   */
  async recordAttempt(identifier: string, success: boolean, action_type: string) {
    try {
        // We try to get the IP from a public service if needed, 
        // but for now we just record the identifier.
        // Supabase RPC can be called by anyone but its internal logic is secure.
        await (supabase as any).rpc('record_auth_attempt', {
            target_identifier: identifier,
            is_success: success,
            action_type: action_type
        });
    } catch (e) {
        console.warn("Failed to record auth attempt:", e);
    }
  }
};
