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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      calendar_events: {
        Row: {
          all_day: boolean | null
          created_at: string | null
          end_time: string
          id: string
          start_time: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          all_day?: boolean | null
          created_at?: string | null
          end_time: string
          id?: string
          start_time: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          all_day?: boolean | null
          created_at?: string | null
          end_time?: string
          id?: string
          start_time?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      completed_tasks: {
        Row: {
          completed_at: string
          energy_level: string
          id: string
          priority: string
          task_duration: number
          task_title: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          energy_level: string
          id?: string
          priority: string
          task_duration: number
          task_title: string
          user_id: string
        }
        Update: {
          completed_at?: string
          energy_level?: string
          id?: string
          priority?: string
          task_duration?: number
          task_title?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_completions: {
        Row: {
          all_completed: boolean
          completion_date: string
          created_at: string
          id: string
          tasks_completed: number
          total_tasks: number
          user_id: string
        }
        Insert: {
          all_completed?: boolean
          completion_date: string
          created_at?: string
          id?: string
          tasks_completed?: number
          total_tasks?: number
          user_id: string
        }
        Update: {
          all_completed?: boolean
          completion_date?: string
          created_at?: string
          id?: string
          tasks_completed?: number
          total_tasks?: number
          user_id?: string
        }
        Relationships: []
      }
      flow_state_sessions: {
        Row: {
          average_energy_level: string | null
          created_at: string
          end_time: string | null
          id: string
          interruptions: number
          quality_score: number | null
          start_time: string
          tasks_completed: number
          user_id: string
        }
        Insert: {
          average_energy_level?: string | null
          created_at?: string
          end_time?: string | null
          id?: string
          interruptions?: number
          quality_score?: number | null
          start_time: string
          tasks_completed?: number
          user_id: string
        }
        Update: {
          average_energy_level?: string | null
          created_at?: string
          end_time?: string | null
          id?: string
          interruptions?: number
          quality_score?: number | null
          start_time?: string
          tasks_completed?: number
          user_id?: string
        }
        Relationships: []
      }
      goal_achievements: {
        Row: {
          achieved_at: string
          achieved_value: number
          goal_type: string
          id: string
          target_value: number
          user_id: string
        }
        Insert: {
          achieved_at?: string
          achieved_value: number
          goal_type: string
          id?: string
          target_value: number
          user_id: string
        }
        Update: {
          achieved_at?: string
          achieved_value?: number
          goal_type?: string
          id?: string
          target_value?: number
          user_id?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          achieved: boolean
          achieved_at: string | null
          created_at: string
          current_value: number
          id: string
          target_value: number
          type: string
          updated_at: string
          user_id: string
          week_start: string
        }
        Insert: {
          achieved?: boolean
          achieved_at?: string | null
          created_at?: string
          current_value?: number
          id?: string
          target_value: number
          type: string
          updated_at?: string
          user_id: string
          week_start: string
        }
        Update: {
          achieved?: boolean
          achieved_at?: string | null
          created_at?: string
          current_value?: number
          id?: string
          target_value?: number
          type?: string
          updated_at?: string
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      recurring_tasks: {
        Row: {
          created_at: string
          duration: number
          end_date: string | null
          energy_level: string
          id: string
          is_active: boolean
          last_generated_date: string | null
          preferred_time: string | null
          priority: string
          recurrence_pattern: Json
          recurrence_type: Database["public"]["Enums"]["recurrence_type"]
          start_date: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration: number
          end_date?: string | null
          energy_level: string
          id?: string
          is_active?: boolean
          last_generated_date?: string | null
          preferred_time?: string | null
          priority: string
          recurrence_pattern?: Json
          recurrence_type: Database["public"]["Enums"]["recurrence_type"]
          start_date?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration?: number
          end_date?: string | null
          energy_level?: string
          id?: string
          is_active?: boolean
          last_generated_date?: string | null
          preferred_time?: string | null
          priority?: string
          recurrence_pattern?: Json
          recurrence_type?: Database["public"]["Enums"]["recurrence_type"]
          start_date?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      schedules: {
        Row: {
          break_preference: string
          created_at: string
          id: string
          name: string
          schedule_data: Json
          start_time: string
          user_id: string
        }
        Insert: {
          break_preference: string
          created_at?: string
          id?: string
          name: string
          schedule_data: Json
          start_time: string
          user_id: string
        }
        Update: {
          break_preference?: string
          created_at?: string
          id?: string
          name?: string
          schedule_data?: Json
          start_time?: string
          user_id?: string
        }
        Relationships: []
      }
      task_dependencies: {
        Row: {
          created_at: string
          depends_on_task_id: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          depends_on_task_id: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          depends_on_task_id?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_dependencies_depends_on_task_id_fkey"
            columns: ["depends_on_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_dependencies_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          created_at: string
          duration: number
          energy_level: string
          id: string
          priority: string
          recurring_task_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration: number
          energy_level: string
          id?: string
          priority: string
          recurring_task_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration?: number
          energy_level?: string
          id?: string
          priority?: string
          recurring_task_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_recurring_task_id_fkey"
            columns: ["recurring_task_id"]
            isOneToOne: false
            referencedRelation: "recurring_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          progress: number
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          progress?: number
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          progress?: number
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          breakfast_duration: number | null
          breakfast_time: string | null
          created_at: string
          dinner_duration: number | null
          dinner_time: string | null
          enable_hydration_reminders: boolean | null
          enable_nutrition_reminders: boolean | null
          hydration_interval: number | null
          id: string
          lunch_duration: number | null
          lunch_time: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          breakfast_duration?: number | null
          breakfast_time?: string | null
          created_at?: string
          dinner_duration?: number | null
          dinner_time?: string | null
          enable_hydration_reminders?: boolean | null
          enable_nutrition_reminders?: boolean | null
          hydration_interval?: number | null
          id?: string
          lunch_duration?: number | null
          lunch_time?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          breakfast_duration?: number | null
          breakfast_time?: string | null
          created_at?: string
          dinner_duration?: number | null
          dinner_time?: string | null
          enable_hydration_reminders?: boolean | null
          enable_nutrition_reminders?: boolean | null
          hydration_interval?: number | null
          id?: string
          lunch_duration?: number | null
          lunch_time?: string | null
          updated_at?: string
          user_id?: string
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
      recurrence_type: "daily" | "weekly" | "monthly" | "custom"
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
      recurrence_type: ["daily", "weekly", "monthly", "custom"],
    },
  },
} as const
