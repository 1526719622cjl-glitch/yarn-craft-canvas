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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_specs: {
        Row: {
          adjusted_rows: number | null
          adjusted_stitches: number | null
          balls_needed: number | null
          created_at: string
          height_shrinkage_factor: number | null
          id: string
          name: string
          notes: string | null
          target_height_cm: number | null
          target_width_cm: number | null
          total_grams_needed: number | null
          total_meters_needed: number | null
          total_rows: number | null
          total_stitches: number | null
          user_id: string
          width_shrinkage_factor: number | null
          yarn_entry_id: string | null
        }
        Insert: {
          adjusted_rows?: number | null
          adjusted_stitches?: number | null
          balls_needed?: number | null
          created_at?: string
          height_shrinkage_factor?: number | null
          id?: string
          name: string
          notes?: string | null
          target_height_cm?: number | null
          target_width_cm?: number | null
          total_grams_needed?: number | null
          total_meters_needed?: number | null
          total_rows?: number | null
          total_stitches?: number | null
          user_id: string
          width_shrinkage_factor?: number | null
          yarn_entry_id?: string | null
        }
        Update: {
          adjusted_rows?: number | null
          adjusted_stitches?: number | null
          balls_needed?: number | null
          created_at?: string
          height_shrinkage_factor?: number | null
          id?: string
          name?: string
          notes?: string | null
          target_height_cm?: number | null
          target_width_cm?: number | null
          total_grams_needed?: number | null
          total_meters_needed?: number | null
          total_rows?: number | null
          total_stitches?: number | null
          user_id?: string
          width_shrinkage_factor?: number | null
          yarn_entry_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_specs_yarn_entry_id_fkey"
            columns: ["yarn_entry_id"]
            isOneToOne: false
            referencedRelation: "yarn_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      yarn_entries: {
        Row: {
          balls_in_stock: number | null
          brand: string | null
          color_code: string | null
          created_at: string
          fiber_content: string | null
          folder_id: string | null
          grams_per_ball: number | null
          id: string
          meters_per_ball: number | null
          name: string
          notes: string | null
          post_wash_height_cm: number | null
          post_wash_width_cm: number | null
          rows_per_10cm: number | null
          status: Database["public"]["Enums"]["yarn_status"] | null
          stitches_per_10cm: number | null
          updated_at: string
          user_id: string
          weight: Database["public"]["Enums"]["yarn_weight"] | null
        }
        Insert: {
          balls_in_stock?: number | null
          brand?: string | null
          color_code?: string | null
          created_at?: string
          fiber_content?: string | null
          folder_id?: string | null
          grams_per_ball?: number | null
          id?: string
          meters_per_ball?: number | null
          name: string
          notes?: string | null
          post_wash_height_cm?: number | null
          post_wash_width_cm?: number | null
          rows_per_10cm?: number | null
          status?: Database["public"]["Enums"]["yarn_status"] | null
          stitches_per_10cm?: number | null
          updated_at?: string
          user_id: string
          weight?: Database["public"]["Enums"]["yarn_weight"] | null
        }
        Update: {
          balls_in_stock?: number | null
          brand?: string | null
          color_code?: string | null
          created_at?: string
          fiber_content?: string | null
          folder_id?: string | null
          grams_per_ball?: number | null
          id?: string
          meters_per_ball?: number | null
          name?: string
          notes?: string | null
          post_wash_height_cm?: number | null
          post_wash_width_cm?: number | null
          rows_per_10cm?: number | null
          status?: Database["public"]["Enums"]["yarn_status"] | null
          stitches_per_10cm?: number | null
          updated_at?: string
          user_id?: string
          weight?: Database["public"]["Enums"]["yarn_weight"] | null
        }
        Relationships: [
          {
            foreignKeyName: "yarn_entries_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "yarn_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      yarn_folders: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          parent_id: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "yarn_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "yarn_folders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      yarn_status: "new" | "in_use" | "scraps" | "finished" | "wishlist"
      yarn_weight:
        | "lace"
        | "fingering"
        | "sport"
        | "dk"
        | "worsted"
        | "aran"
        | "bulky"
        | "super_bulky"
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
    Enums: {
      yarn_status: ["new", "in_use", "scraps", "finished", "wishlist"],
      yarn_weight: [
        "lace",
        "fingering",
        "sport",
        "dk",
        "worsted",
        "aran",
        "bulky",
        "super_bulky",
      ],
    },
  },
} as const
