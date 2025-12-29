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
      ai_scheduling_suggestions: {
        Row: {
          booking_id: string | null
          confidence_score: number | null
          conflicts: string[] | null
          created_at: string
          id: string
          reasoning: string | null
          status: string | null
          suggested_city_id: string | null
          suggested_date: string
          suggested_time: string | null
        }
        Insert: {
          booking_id?: string | null
          confidence_score?: number | null
          conflicts?: string[] | null
          created_at?: string
          id?: string
          reasoning?: string | null
          status?: string | null
          suggested_city_id?: string | null
          suggested_date: string
          suggested_time?: string | null
        }
        Update: {
          booking_id?: string | null
          confidence_score?: number | null
          conflicts?: string[] | null
          created_at?: string
          id?: string
          reasoning?: string | null
          status?: string | null
          suggested_city_id?: string | null
          suggested_date?: string
          suggested_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_scheduling_suggestions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_scheduling_suggestions_suggested_city_id_fkey"
            columns: ["suggested_city_id"]
            isOneToOne: false
            referencedRelation: "city_configurations"
            referencedColumns: ["id"]
          },
        ]
      }
      availability: {
        Row: {
          city: string
          city_id: string | null
          created_at: string
          date: string
          external_event_id: string | null
          id: string
          is_available: boolean
          notes: string | null
          slot_type: string | null
          time_slots: Json | null
          updated_at: string
        }
        Insert: {
          city: string
          city_id?: string | null
          created_at?: string
          date: string
          external_event_id?: string | null
          id?: string
          is_available?: boolean
          notes?: string | null
          slot_type?: string | null
          time_slots?: Json | null
          updated_at?: string
        }
        Update: {
          city?: string
          city_id?: string | null
          created_at?: string
          date?: string
          external_event_id?: string | null
          id?: string
          is_available?: boolean
          notes?: string | null
          slot_type?: string | null
          time_slots?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "city_configurations"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_activities: {
        Row: {
          activity_type: string
          booking_id: string
          created_at: string | null
          created_by: string | null
          description: string
          id: string
          metadata: Json | null
        }
        Insert: {
          activity_type: string
          booking_id: string
          created_at?: string | null
          created_by?: string | null
          description: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          activity_type?: string
          booking_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_activities_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          admin_notes: string | null
          city_id: string | null
          created_at: string
          customer_notes: string | null
          deposit_amount: number | null
          deposit_paid: boolean | null
          deposit_paid_at: string | null
          deposit_requested_at: string | null
          email: string
          estimated_price: string | null
          follow_up_date: string | null
          full_name: string | null
          id: string
          last_contacted_at: string | null
          name: string
          payment_method: string | null
          phone: string | null
          pipeline_stage: string | null
          placement: string | null
          preferred_date: string | null
          priority: string | null
          reference_images: string[] | null
          references_received_at: string | null
          references_requested_at: string | null
          requested_city: string | null
          scheduled_date: string | null
          scheduled_time: string | null
          session_rate: number | null
          size: string | null
          source: string | null
          status: string
          tattoo_description: string
          tracking_code: string | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          city_id?: string | null
          created_at?: string
          customer_notes?: string | null
          deposit_amount?: number | null
          deposit_paid?: boolean | null
          deposit_paid_at?: string | null
          deposit_requested_at?: string | null
          email: string
          estimated_price?: string | null
          follow_up_date?: string | null
          full_name?: string | null
          id?: string
          last_contacted_at?: string | null
          name: string
          payment_method?: string | null
          phone?: string | null
          pipeline_stage?: string | null
          placement?: string | null
          preferred_date?: string | null
          priority?: string | null
          reference_images?: string[] | null
          references_received_at?: string | null
          references_requested_at?: string | null
          requested_city?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          session_rate?: number | null
          size?: string | null
          source?: string | null
          status?: string
          tattoo_description: string
          tracking_code?: string | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          city_id?: string | null
          created_at?: string
          customer_notes?: string | null
          deposit_amount?: number | null
          deposit_paid?: boolean | null
          deposit_paid_at?: string | null
          deposit_requested_at?: string | null
          email?: string
          estimated_price?: string | null
          follow_up_date?: string | null
          full_name?: string | null
          id?: string
          last_contacted_at?: string | null
          name?: string
          payment_method?: string | null
          phone?: string | null
          pipeline_stage?: string | null
          placement?: string | null
          preferred_date?: string | null
          priority?: string | null
          reference_images?: string[] | null
          references_received_at?: string | null
          references_requested_at?: string | null
          requested_city?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          session_rate?: number | null
          size?: string | null
          source?: string | null
          status?: string
          tattoo_description?: string
          tracking_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "city_configurations"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          ai_confidence: number | null
          ai_suggested: boolean | null
          all_day: boolean | null
          booking_id: string | null
          city_id: string | null
          created_at: string
          description: string | null
          end_time: string
          event_type: string
          external_calendar: string | null
          external_id: string | null
          id: string
          is_synced: boolean | null
          recurrence_rule: string | null
          start_time: string
          sync_direction: string | null
          title: string
          updated_at: string
        }
        Insert: {
          ai_confidence?: number | null
          ai_suggested?: boolean | null
          all_day?: boolean | null
          booking_id?: string | null
          city_id?: string | null
          created_at?: string
          description?: string | null
          end_time: string
          event_type?: string
          external_calendar?: string | null
          external_id?: string | null
          id?: string
          is_synced?: boolean | null
          recurrence_rule?: string | null
          start_time: string
          sync_direction?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          ai_confidence?: number | null
          ai_suggested?: boolean | null
          all_day?: boolean | null
          booking_id?: string | null
          city_id?: string | null
          created_at?: string
          description?: string | null
          end_time?: string
          event_type?: string
          external_calendar?: string | null
          external_id?: string | null
          id?: string
          is_synced?: boolean | null
          recurrence_rule?: string | null
          start_time?: string
          sync_direction?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "city_configurations"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_sync_tokens: {
        Row: {
          access_token: string
          calendar_id: string | null
          created_at: string
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          provider: string
          refresh_token: string | null
          sync_errors: string[] | null
          token_expiry: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          calendar_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          provider: string
          refresh_token?: string | null
          sync_errors?: string[] | null
          token_expiry?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          calendar_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          provider?: string
          refresh_token?: string | null
          sync_errors?: string[] | null
          token_expiry?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          conversion_type: string | null
          converted: boolean
          created_at: string
          ended_at: string | null
          id: string
          message_count: number
          session_id: string
          started_at: string
        }
        Insert: {
          conversion_type?: string | null
          converted?: boolean
          created_at?: string
          ended_at?: string | null
          id?: string
          message_count?: number
          session_id: string
          started_at?: string
        }
        Update: {
          conversion_type?: string | null
          converted?: boolean
          created_at?: string
          ended_at?: string | null
          id?: string
          message_count?: number
          session_id?: string
          started_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      city_configurations: {
        Row: {
          address: string | null
          city_name: string
          city_type: string
          color_hex: string | null
          created_at: string
          deposit_amount: number | null
          id: string
          is_active: boolean
          max_sessions_per_day: number | null
          min_sessions_per_trip: number | null
          notes: string | null
          session_rate: number | null
          studio_name: string | null
          timezone: string
          travel_buffer_days: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city_name: string
          city_type?: string
          color_hex?: string | null
          created_at?: string
          deposit_amount?: number | null
          id?: string
          is_active?: boolean
          max_sessions_per_day?: number | null
          min_sessions_per_trip?: number | null
          notes?: string | null
          session_rate?: number | null
          studio_name?: string | null
          timezone?: string
          travel_buffer_days?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city_name?: string
          city_type?: string
          color_hex?: string | null
          created_at?: string
          deposit_amount?: number | null
          id?: string
          is_active?: boolean
          max_sessions_per_day?: number | null
          min_sessions_per_trip?: number | null
          notes?: string | null
          session_rate?: number | null
          studio_name?: string | null
          timezone?: string
          travel_buffer_days?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      customer_emails: {
        Row: {
          booking_id: string | null
          created_at: string
          customer_email: string
          customer_name: string | null
          direction: string
          email_body: string
          id: string
          is_read: boolean | null
          sentiment: string | null
          subject: string | null
          tags: string[] | null
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          customer_email: string
          customer_name?: string | null
          direction?: string
          email_body: string
          id?: string
          is_read?: boolean | null
          sentiment?: string | null
          subject?: string | null
          tags?: string[] | null
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          customer_email?: string
          customer_name?: string | null
          direction?: string
          email_body?: string
          id?: string
          is_read?: boolean | null
          sentiment?: string | null
          subject?: string | null
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_emails_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          subject: string
          template_type: string
          updated_at: string | null
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          subject: string
          template_type: string
          updated_at?: string | null
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          subject?: string
          template_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      gallery_images: {
        Row: {
          created_at: string
          display_order: number
          id: string
          image_url: string
          is_visible: boolean
          section: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          image_url: string
          is_visible?: boolean
          section?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          is_visible?: boolean
          section?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      luna_knowledge: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          is_active: boolean | null
          priority: number | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          priority?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          priority?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      luna_settings: {
        Row: {
          description: string | null
          id: string
          setting_key: string
          setting_value: string
          updated_at: string
        }
        Insert: {
          description?: string | null
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string
        }
        Update: {
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string
        }
        Relationships: []
      }
      luna_training_pairs: {
        Row: {
          category: string | null
          created_at: string
          id: string
          ideal_response: string
          is_active: boolean | null
          question: string
          updated_at: string
          use_count: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          ideal_response: string
          is_active?: boolean | null
          question: string
          updated_at?: string
          use_count?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          ideal_response?: string
          is_active?: boolean | null
          question?: string
          updated_at?: string
          use_count?: number | null
        }
        Relationships: []
      }
      security_logs: {
        Row: {
          created_at: string
          details: Json | null
          email: string | null
          event_type: string
          id: string
          ip_address: string | null
          success: boolean | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          email?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          email?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
