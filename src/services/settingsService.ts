import { supabase } from "@/integrations/supabase/client";

export interface UserSettings {
  isPublic: boolean;
  isSearchable: boolean;
  availability: "Available" | "Busy" | "Open to offers";
  willingness: {
    travel: boolean;
    paidWork: boolean;
    unpaidWork: boolean;
    roles: string[];
  };
  visibility: {
    profile: "Everyone" | "Verified" | "No one";
    messaging: "Everyone" | "Verified" | "No one";
    showContactOnlyOnAccepted: boolean;
    onlineStatus: boolean;
    readReceipts: boolean;
    showConnections: "Everyone" | "Followers" | "No one";
    showSocialLinks: boolean;
    showStats: boolean;
  };
  protection: {
    watermark: boolean;
    preventDownload: boolean;
  };
  communication: {
    autoResponse: string;
    emailNotifications: boolean;
  };
  advanced: {
    openToCollaboration: boolean;
    language: string;
  };
}

export const DEFAULT_SETTINGS: UserSettings = {
  isPublic: true,
  isSearchable: true,
  availability: "Available",
  willingness: {
    travel: true,
    paidWork: true,
    unpaidWork: false,
    roles: ["Commercials", "Films", "TV"],
  },
  visibility: {
    profile: "Everyone",
    messaging: "Everyone",
    showContactOnlyOnAccepted: true,
    onlineStatus: true,
    readReceipts: true,
    showConnections: "Everyone",
    showSocialLinks: true,
    showStats: true,
  },
  protection: {
    watermark: false,
    preventDownload: false,
  },
  communication: {
    autoResponse: "",
    emailNotifications: true,
  },
  advanced: {
    openToCollaboration: false,
    language: "English",
  },
};

export const settingsService = {
  async getSettings(userId: string): Promise<UserSettings> {
    const { data, error } = await supabase
      .from("talent_growth_data")
      .select("content")
      .eq("user_id", userId)
      .eq("type", "user_settings")
      .maybeSingle();

    if (error) {
      console.error("Error fetching user settings:", error);
      return DEFAULT_SETTINGS;
    }

    if (!data) {
      return DEFAULT_SETTINGS;
    }

    // MED-3: Validate content structure before merging
    const raw = data.content as Record<string, unknown> | null;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return DEFAULT_SETTINGS;
    }

    // Only allow known top-level keys to prevent injection of unexpected properties
    const allowedKeys = new Set(Object.keys(DEFAULT_SETTINGS));
    const sanitized: Record<string, unknown> = {};
    for (const key of Object.keys(raw)) {
      if (allowedKeys.has(key)) {
        sanitized[key] = raw[key];
      }
    }

    return { ...DEFAULT_SETTINGS, ...sanitized } as UserSettings;
  },

  async updateSettings(userId: string, settings: Partial<UserSettings>): Promise<void> {
    // 1. Fetch current (manually to avoid recursion with getSettings)
    const { data: existing, error: fetchError } = await supabase
      .from("talent_growth_data")
      .select("id, content")
      .eq("user_id", userId)
      .eq("type", "user_settings")
      .maybeSingle();

    if (fetchError) throw fetchError;

    const currentContent = (existing?.content as any) || DEFAULT_SETTINGS;
    const updatedContent = { ...currentContent, ...settings };

    // 2. Persist to talent_growth_data
    if (existing) {
      const { error } = await supabase
        .from("talent_growth_data")
        .update({ content: updatedContent as any })
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("talent_growth_data")
        .insert({
          user_id: userId,
          type: "user_settings",
          content: updatedContent as any,
        });
      if (error) throw error;
    }

    // 3. Sync to profiles table (optional sync)
    try {
      if (settings.isPublic !== undefined || settings.isSearchable !== undefined) {
        await supabase
          .from("profiles")
          .update({
            is_public: updatedContent.isPublic,
            is_searchable: updatedContent.isSearchable
          } as any)
          .eq("user_id", userId);
      }
    } catch (err) {
      console.warn("Non-critical sync error (this is fine if columns don't exist yet):", err);
    }
  },

  async getBlocks(userId: string): Promise<string[]> {
    const { data } = await supabase
      .from("talent_growth_data")
      .select("content")
      .eq("user_id", userId)
      .eq("type", "blocked_users")
      .maybeSingle();
    return (data?.content as any)?.blockedIds || [];
  },

  async toggleBlock(userId: string, targetId: string): Promise<boolean> {
    const blockedIds = await this.getBlocks(userId);
    const isBlocked = blockedIds.includes(targetId);
    const updated = isBlocked 
      ? blockedIds.filter(id => id !== targetId)
      : [...blockedIds, targetId];

    const { data } = await supabase
      .from("talent_growth_data")
      .select("id")
      .eq("user_id", userId)
      .eq("type", "blocked_users")
      .maybeSingle();

    if (data) {
      await supabase.from("talent_growth_data").update({ content: { blockedIds: updated } } as any).eq("id", data.id);
    } else {
      await supabase.from("talent_growth_data").insert({ user_id: userId, type: "blocked_users", content: { blockedIds: updated } as any });
    }
    return !isBlocked;
  },

  async isBlocked(userId: string, targetId: string): Promise<boolean> {
    const blocks = await this.getBlocks(userId);
    return blocks.includes(targetId);
  }
};
