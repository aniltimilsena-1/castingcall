import { supabase } from "@/integrations/supabase/client";

export interface FollowProfile {
  user_id: string;
  name: string;
  photo_url: string | null;
  role: string | null;
  plan: string | null;
  is_verified?: boolean | null;
}

export const followService = {
  /** Follow a user */
  async follow(followerId: string, followingId: string): Promise<void> {
    const { error } = await supabase
      .from("follows")
      .insert({ follower_id: followerId, following_id: followingId });
    if (error) throw error;
  },

  /** Unfollow a user */
  async unfollow(followerId: string, followingId: string): Promise<void> {
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", followerId)
      .eq("following_id", followingId);
    if (error) throw error;
  },

  /** Check if follower is following a specific user */
  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", followerId)
      .eq("following_id", followingId)
      .maybeSingle();
    if (error) return false;
    return !!data;
  },

  /** Get follower count and following count for a user */
  async getCounts(userId: string): Promise<{ followers: number; following: number }> {
    const [followersRes, followingRes] = await Promise.all([
      supabase
        .from("follows")
        .select("id", { count: "exact", head: true })
        .eq("following_id", userId),
      supabase
        .from("follows")
        .select("id", { count: "exact", head: true })
        .eq("follower_id", userId),
    ]);
    return {
      followers: followersRes.count ?? 0,
      following: followingRes.count ?? 0,
    };
  },

  /** Get list of followers (people who follow userId) with their profile info */
  async getFollowers(userId: string): Promise<FollowProfile[]> {
    const { data, error } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("following_id", userId)
      .order("created_at", { ascending: false });

    if (error || !data?.length) return [];

    const ids = data.map((r: any) => r.follower_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, name, photo_url, role, plan, is_verified")
      .in("user_id", ids);

    const profilesList = (profiles || []) as FollowProfile[];
    // Preserve order from 'ids'
    return ids.map(id => profilesList.find(p => p.user_id === id)).filter(Boolean) as FollowProfile[];
  },

  /** Get list of following (people userId follows) with their profile info */
  async getFollowing(userId: string): Promise<FollowProfile[]> {
    const { data, error } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", userId)
      .order("created_at", { ascending: false });

    if (error || !data?.length) return [];

    const ids = data.map((r: any) => r.following_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, name, photo_url, role, plan, is_verified")
      .in("user_id", ids);

    const profilesList = (profiles || []) as FollowProfile[];
    // Preserve order from 'ids'
    return ids.map(id => profilesList.find(p => p.user_id === id)).filter(Boolean) as FollowProfile[];
  },
};
