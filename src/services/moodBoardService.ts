import { supabase } from "@/integrations/supabase/client";

export interface MoodBoard {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
}

export interface MoodBoardItem {
  id: string;
  board_id: string;
  talent_id: string;
  notes: string | null;
  added_at: string;
  profiles?: any;
}

export const moodBoardService = {
  async getMyBoards(userId: string) {
    const { data, error } = await supabase
      .from("mood_boards")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    return data as MoodBoard[];
  },

  async createBoard(userId: string, title: string, description?: string, isPublic = false) {
    const { data, error } = await supabase
      .from("mood_boards")
      .insert({ user_id: userId, title, description, is_public: isPublic })
      .select()
      .single();
    
    if (error) throw error;
    return data as MoodBoard;
  },

  async deleteBoard(boardId: string) {
    const { error } = await supabase
      .from("mood_boards")
      .delete()
      .eq("id", boardId);
    
    if (error) throw error;
  },

  async getBoardItems(boardId: string) {
    const { data, error } = await supabase
      .from("mood_board_items")
      .select(`
        *,
        profiles (
          id,
          name,
          photo_url,
          role,
          location,
          user_id
        )
      `)
      .eq("board_id", boardId)
      .order("added_at", { ascending: false });
    
    if (error) throw error;
    return data as MoodBoardItem[];
  },

  async addItemToBoard(boardId: string, talentId: string, notes?: string) {
    const { data, error } = await supabase
      .from("mood_board_items")
      .upsert({ board_id: boardId, talent_id: talentId, notes }, { onConflict: "board_id, talent_id" })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async removeItemFromBoard(boardId: string, talentId: string) {
    const { error } = await supabase
      .from("mood_board_items")
      .delete()
      .match({ board_id: boardId, talent_id: talentId });
    
    if (error) throw error;
  }
};
