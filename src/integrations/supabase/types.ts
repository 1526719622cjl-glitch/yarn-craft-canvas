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
      pattern_ai_parses: {
        Row: {
          anchor_regions: Json | null
          created_at: string
          id: string
          parsed_steps: Json
          pattern_id: string
          user_id: string
        }
        Insert: {
          anchor_regions?: Json | null
          created_at?: string
          id?: string
          parsed_steps?: Json
          pattern_id: string
          user_id: string
        }
        Update: {
          anchor_regions?: Json | null
          created_at?: string
          id?: string
          parsed_steps?: Json
          pattern_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pattern_ai_parses_pattern_id_fkey"
            columns: ["pattern_id"]
            isOneToOne: false
            referencedRelation: "pattern_library"
            referencedColumns: ["id"]
          },
        ]
      }
      pattern_annotations: {
        Row: {
          annotation_type: string
          created_at: string
          data: Json
          id: string
          pattern_file_id: string
          user_id: string
        }
        Insert: {
          annotation_type: string
          created_at?: string
          data?: Json
          id?: string
          pattern_file_id: string
          user_id: string
        }
        Update: {
          annotation_type?: string
          created_at?: string
          data?: Json
          id?: string
          pattern_file_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pattern_annotations_pattern_file_id_fkey"
            columns: ["pattern_file_id"]
            isOneToOne: false
            referencedRelation: "pattern_files"
            referencedColumns: ["id"]
          },
        ]
      }
      pattern_files: {
        Row: {
          created_at: string
          file_type: string
          file_url: string
          id: string
          pattern_id: string
          sort_order: number
          user_id: string
        }
        Insert: {
          created_at?: string
          file_type?: string
          file_url: string
          id?: string
          pattern_id: string
          sort_order?: number
          user_id: string
        }
        Update: {
          created_at?: string
          file_type?: string
          file_url?: string
          id?: string
          pattern_id?: string
          sort_order?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pattern_files_pattern_id_fkey"
            columns: ["pattern_id"]
            isOneToOne: false
            referencedRelation: "pattern_library"
            referencedColumns: ["id"]
          },
        ]
      }
      pattern_library: {
        Row: {
          category: string
          cover_image_url: string | null
          created_at: string
          description: string | null
          finished_photo_url: string | null
          id: string
          is_favorite: boolean
          linked_yarn_id: string | null
          status: string
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          finished_photo_url?: string | null
          id?: string
          is_favorite?: boolean
          linked_yarn_id?: string | null
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          finished_photo_url?: string | null
          id?: string
          is_favorite?: boolean
          linked_yarn_id?: string | null
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pattern_library_linked_yarn_id_fkey"
            columns: ["linked_yarn_id"]
            isOneToOne: false
            referencedRelation: "yarn_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      pattern_progress: {
        Row: {
          corrections: Json | null
          created_at: string
          current_step: number
          id: string
          pattern_id: string
          step_timestamps: Json | null
          total_steps: number
          updated_at: string
          user_id: string
        }
        Insert: {
          corrections?: Json | null
          created_at?: string
          current_step?: number
          id?: string
          pattern_id: string
          step_timestamps?: Json | null
          total_steps?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          corrections?: Json | null
          created_at?: string
          current_step?: number
          id?: string
          pattern_id?: string
          step_timestamps?: Json | null
          total_steps?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pattern_progress_pattern_id_fkey"
            columns: ["pattern_id"]
            isOneToOne: false
            referencedRelation: "pattern_library"
            referencedColumns: ["id"]
          },
        ]
      }
      pixel_designs: {
        Row: {
          color_palette: Json
          created_at: string
          grid_data: Json
          height: number
          id: string
          knitting_progress: Json | null
          name: string
          updated_at: string
          user_id: string
          width: number
        }
        Insert: {
          color_palette?: Json
          created_at?: string
          grid_data?: Json
          height: number
          id?: string
          knitting_progress?: Json | null
          name: string
          updated_at?: string
          user_id: string
          width: number
        }
        Update: {
          color_palette?: Json
          created_at?: string
          grid_data?: Json
          height?: number
          id?: string
          knitting_progress?: Json | null
          name?: string
          updated_at?: string
          user_id?: string
          width?: number
        }
        Relationships: []
      }
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
      quick_calc_history: {
        Row: {
          created_at: string
          id: string
          result_rows: number
          result_stitches: number
          rows: number
          stitches: number
          swatch_height: number
          swatch_width: number
          target_height: number
          target_width: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          result_rows: number
          result_stitches: number
          rows: number
          stitches: number
          swatch_height: number
          swatch_width: number
          target_height: number
          target_width: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          result_rows?: number
          result_stitches?: number
          rows?: number
          stitches?: number
          swatch_height?: number
          swatch_width?: number
          target_height?: number
          target_width?: number
          user_id?: string
        }
        Relationships: []
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
          post_wash_photo_url: string | null
          post_wash_width_cm: number | null
          pre_wash_height_cm: number | null
          pre_wash_photo_url: string | null
          pre_wash_width_cm: number | null
          rows_per_10cm: number | null
          rows_post_wash: number | null
          rows_pre_wash: number | null
          status: Database["public"]["Enums"]["yarn_status"] | null
          stitches_per_10cm: number | null
          stitches_post_wash: number | null
          stitches_pre_wash: number | null
          tool_size_mm: number | null
          tool_type: string | null
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
          post_wash_photo_url?: string | null
          post_wash_width_cm?: number | null
          pre_wash_height_cm?: number | null
          pre_wash_photo_url?: string | null
          pre_wash_width_cm?: number | null
          rows_per_10cm?: number | null
          rows_post_wash?: number | null
          rows_pre_wash?: number | null
          status?: Database["public"]["Enums"]["yarn_status"] | null
          stitches_per_10cm?: number | null
          stitches_post_wash?: number | null
          stitches_pre_wash?: number | null
          tool_size_mm?: number | null
          tool_type?: string | null
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
          post_wash_photo_url?: string | null
          post_wash_width_cm?: number | null
          pre_wash_height_cm?: number | null
          pre_wash_photo_url?: string | null
          pre_wash_width_cm?: number | null
          rows_per_10cm?: number | null
          rows_post_wash?: number | null
          rows_pre_wash?: number | null
          status?: Database["public"]["Enums"]["yarn_status"] | null
          stitches_per_10cm?: number | null
          stitches_post_wash?: number | null
          stitches_pre_wash?: number | null
          tool_size_mm?: number | null
          tool_type?: string | null
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
