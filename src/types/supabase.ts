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
    PostgrestVersion: "13.0.4"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      advisors: {
        Row: {
          bio: string | null
          capacity: number | null
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          specialization: string | null
          updated_at: string
        }
        Insert: {
          bio?: string | null
          capacity?: number | null
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          specialization?: string | null
          updated_at?: string
        }
        Update: {
          bio?: string | null
          capacity?: number | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          specialization?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      assignments: {
        Row: {
          created_at: string
          creator_advisor_id: string | null
          description: string | null
          due_at: string | null
          id: string
          status: Database["public"]["Enums"]["assignment_status"]
          student_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_advisor_id?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          status?: Database["public"]["Enums"]["assignment_status"]
          student_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_advisor_id?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          status?: Database["public"]["Enums"]["assignment_status"]
          student_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_creator_advisor_id_fkey"
            columns: ["creator_advisor_id"]
            isOneToOne: false
            referencedRelation: "advisors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          assignment_id: string
          author_profile_id: string
          body: string
          created_at: string | null
          id: string
        }
        Insert: {
          assignment_id: string
          author_profile_id: string
          body: string
          created_at?: string | null
          id?: string
        }
        Update: {
          assignment_id?: string
          author_profile_id?: string
          body?: string
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_profile_id_fkey"
            columns: ["author_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          author_advisor_id: string | null
          author_parent_id: string | null
          body: string
          created_at: string
          id: string
          student_id: string
          visible_to_parents: boolean
          visible_to_student: boolean
        }
        Insert: {
          author_advisor_id?: string | null
          author_parent_id?: string | null
          body: string
          created_at?: string
          id?: string
          student_id: string
          visible_to_parents?: boolean
          visible_to_student?: boolean
        }
        Update: {
          author_advisor_id?: string | null
          author_parent_id?: string | null
          body?: string
          created_at?: string
          id?: string
          student_id?: string
          visible_to_parents?: boolean
          visible_to_student?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "notes_author_advisor_id_fkey"
            columns: ["author_advisor_id"]
            isOneToOne: false
            referencedRelation: "advisors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_author_parent_id_fkey"
            columns: ["author_parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      parents: {
        Row: {
          created_at: string
          email: string
          first_name: string
          id: string
          kind: Database["public"]["Enums"]["parent_type"]
          last_name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name: string
          id?: string
          kind?: Database["public"]["Enums"]["parent_type"]
          last_name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          kind?: Database["public"]["Enums"]["parent_type"]
          last_name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          last_seen_at: string | null
          lesson_29_test: string | null
          name: string | null
          role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          last_seen_at?: string | null
          lesson_29_test?: string | null
          name?: string | null
          role: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          last_seen_at?: string | null
          lesson_29_test?: string | null
          name?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      student_advisor: {
        Row: {
          advisor_id: string
          end_date: string | null
          is_primary: boolean
          start_date: string | null
          student_id: string
        }
        Insert: {
          advisor_id: string
          end_date?: string | null
          is_primary?: boolean
          start_date?: string | null
          student_id: string
        }
        Update: {
          advisor_id?: string
          end_date?: string | null
          is_primary?: boolean
          start_date?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_advisor_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "advisors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_advisor_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_parent: {
        Row: {
          created_at: string
          parent_id: string
          relation: Database["public"]["Enums"]["parent_type"] | null
          student_id: string
        }
        Insert: {
          created_at?: string
          parent_id: string
          relation?: Database["public"]["Enums"]["parent_type"] | null
          student_id: string
        }
        Update: {
          created_at?: string
          parent_id?: string
          relation?: Database["public"]["Enums"]["parent_type"] | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_parent_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_parent_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          created_at: string
          email: string | null
          first_name: string
          grade: string | null
          grade_level: number | null
          id: string
          last_name: string | null
          parent_id: string
          school_name: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name: string
          grade?: string | null
          grade_level?: number | null
          id?: string
          last_name?: string | null
          parent_id: string
          school_name?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string
          grade?: string | null
          grade_level?: number | null
          id?: string
          last_name?: string | null
          parent_id?: string
          school_name?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_uid: { Args: never; Returns: string }
    }
    Enums: {
      app_role: "parent" | "student" | "advisor" | "admin"
      assignment_status:
        | "todo"
        | "in_progress"
        | "done"
        | "blocked"
        | "archived"
      parent_type: "mother" | "father" | "guardian" | "other"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["parent", "student", "advisor", "admin"],
      assignment_status: ["todo", "in_progress", "done", "blocked", "archived"],
      parent_type: ["mother", "father", "guardian", "other"],
    },
  },
} as const
