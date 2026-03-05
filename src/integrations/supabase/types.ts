export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          message: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string | null
          title?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          bio: string | null
          created_at: string
          email: string | null
          id: string
          location: string | null
          name: string
          photo_url: string | null
          plan: string | null
          role: string | null
          height: string | null
          age: number | null
          experience_years: number | null
          gender: string | null
          hair_color: string | null
          eye_color: string | null
          portfolio_url: string | null
          skills: string[] | null
          photos: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          email?: string | null
          id?: string
          location?: string | null
          name?: string
          photo_url?: string | null
          plan?: string | null
          role?: string | null
          height?: string | null
          age?: number | null
          experience_years?: number | null
          gender?: string | null
          hair_color?: string | null
          eye_color?: string | null
          portfolio_url?: string | null
          skills?: string[] | null
          photos?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          email?: string | null
          id?: string
          location?: string | null
          name?: string
          photo_url?: string | null
          plan?: string | null
          role?: string | null
          height?: string | null
          age?: number | null
          experience_years?: number | null
          gender?: string | null
          hair_color?: string | null
          eye_color?: string | null
          portfolio_url?: string | null
          skills?: string[] | null
          photos?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          status: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          status?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          status?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_talents: {
        Row: {
          created_at: string
          id: string
          talent_profile_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          talent_profile_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          talent_profile_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_talents_talent_profile_id_fkey"
            columns: ["talent_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_likes: {
        Row: {
          id: string
          photo_url: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          photo_url: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          photo_url?: string
          user_id?: string
          created_at?: string
        }
        Relationships: []
      }
      photo_comments: {
        Row: {
          id: string
          photo_url: string
          user_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          photo_url: string
          user_id: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          photo_url?: string
          user_id?: string
          content?: string
          created_at?: string
        }
        Relationships: []
      }
      photo_captions: {
        Row: {
          photo_url: string
          user_id: string
          description: string | null
          created_at: string
          is_premium: boolean | null
          price: number | null
        }
        Insert: {
          photo_url: string
          user_id: string
          description?: string | null
          created_at?: string
          is_premium?: boolean | null
          price?: number | null
        }
        Update: {
          photo_url?: string
          user_id?: string
          description?: string | null
          created_at?: string
          is_premium?: boolean | null
          price?: number | null
        }
        Relationships: []
      }
      fan_subscriptions: {
        Row: {
          id: string
          subscriber_id: string
          talent_id: string
          status: string | null
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          subscriber_id: string
          talent_id: string
          status?: string | null
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          subscriber_id?: string
          talent_id?: string
          status?: string | null
          expires_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      digital_products: {
        Row: {
          id: string
          seller_id: string
          title: string
          description: string | null
          price: number
          currency: string | null
          file_url: string
          thumbnail_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          seller_id: string
          title: string
          description?: string | null
          price: number
          currency?: string | null
          file_url: string
          thumbnail_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          seller_id?: string
          title?: string
          description?: string | null
          price?: number
          currency?: string | null
          file_url?: string
          thumbnail_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_purchases: {
        Row: {
          id: string
          buyer_id: string
          product_id: string
          amount_paid: number
          currency: string | null
          created_at: string
        }
        Insert: {
          id?: string
          buyer_id: string
          product_id: string
          amount_paid: number
          currency?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          buyer_id?: string
          product_id?: string
          amount_paid?: number
          currency?: string | null
          created_at?: string
        }
        Relationships: []
      }
      tips: {
        Row: {
          id: string
          sender_id: string
          receiver_id: string
          amount: number
          currency: string | null
          post_url: string | null
          message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          sender_id: string
          receiver_id: string
          amount: number
          currency?: string | null
          post_url?: string | null
          message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          sender_id?: string
          receiver_id?: string
          amount?: number
          currency?: string | null
          post_url?: string | null
          message?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
  | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
  ? R
  : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
    DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
    DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
  ? R
  : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I
  }
  ? I
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Insert: infer I
  }
  ? I
  : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U
  }
  ? U
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Update: infer U
  }
  ? U
  : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
  | keyof DefaultSchema["Enums"]
  | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof DefaultSchema["CompositeTypes"]
  | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
