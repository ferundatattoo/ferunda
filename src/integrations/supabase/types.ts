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
            foreignKeyName: "ai_scheduling_suggestions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "customer_booking_view"
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
          {
            foreignKeyName: "booking_activities_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "customer_booking_view"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_status_rate_limits: {
        Row: {
          attempts: number | null
          first_attempt_at: string | null
          id: string
          ip_hash: string
          last_attempt_at: string | null
        }
        Insert: {
          attempts?: number | null
          first_attempt_at?: string | null
          id?: string
          ip_hash: string
          last_attempt_at?: string | null
        }
        Update: {
          attempts?: number | null
          first_attempt_at?: string | null
          id?: string
          ip_hash?: string
          last_attempt_at?: string | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          admin_notes: string | null
          city_id: string | null
          created_at: string
          customer_notes: string | null
          customer_portal_enabled: boolean | null
          deposit_amount: number | null
          deposit_paid: boolean | null
          deposit_paid_at: string | null
          deposit_requested_at: string | null
          email: string
          email_hash: string | null
          estimated_price: string | null
          follow_up_date: string | null
          full_name: string | null
          id: string
          last_contacted_at: string | null
          last_customer_activity: string | null
          name: string
          payment_method: string | null
          phone: string | null
          phone_encrypted: string | null
          pipeline_stage: string | null
          placement: string | null
          preferred_date: string | null
          priority: string | null
          reference_images: string[] | null
          reference_images_customer: Json | null
          references_received_at: string | null
          references_requested_at: string | null
          requested_city: string | null
          scheduled_date: string | null
          scheduled_time: string | null
          security_flags: Json | null
          session_rate: number | null
          size: string | null
          source: string | null
          status: string
          tattoo_description: string
          total_paid: number | null
          tracking_code: string | null
          tracking_code_expires_at: string | null
          unread_customer_messages: number | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          city_id?: string | null
          created_at?: string
          customer_notes?: string | null
          customer_portal_enabled?: boolean | null
          deposit_amount?: number | null
          deposit_paid?: boolean | null
          deposit_paid_at?: string | null
          deposit_requested_at?: string | null
          email: string
          email_hash?: string | null
          estimated_price?: string | null
          follow_up_date?: string | null
          full_name?: string | null
          id?: string
          last_contacted_at?: string | null
          last_customer_activity?: string | null
          name: string
          payment_method?: string | null
          phone?: string | null
          phone_encrypted?: string | null
          pipeline_stage?: string | null
          placement?: string | null
          preferred_date?: string | null
          priority?: string | null
          reference_images?: string[] | null
          reference_images_customer?: Json | null
          references_received_at?: string | null
          references_requested_at?: string | null
          requested_city?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          security_flags?: Json | null
          session_rate?: number | null
          size?: string | null
          source?: string | null
          status?: string
          tattoo_description: string
          total_paid?: number | null
          tracking_code?: string | null
          tracking_code_expires_at?: string | null
          unread_customer_messages?: number | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          city_id?: string | null
          created_at?: string
          customer_notes?: string | null
          customer_portal_enabled?: boolean | null
          deposit_amount?: number | null
          deposit_paid?: boolean | null
          deposit_paid_at?: string | null
          deposit_requested_at?: string | null
          email?: string
          email_hash?: string | null
          estimated_price?: string | null
          follow_up_date?: string | null
          full_name?: string | null
          id?: string
          last_contacted_at?: string | null
          last_customer_activity?: string | null
          name?: string
          payment_method?: string | null
          phone?: string | null
          phone_encrypted?: string | null
          pipeline_stage?: string | null
          placement?: string | null
          preferred_date?: string | null
          priority?: string | null
          reference_images?: string[] | null
          reference_images_customer?: Json | null
          references_received_at?: string | null
          references_requested_at?: string | null
          requested_city?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          security_flags?: Json | null
          session_rate?: number | null
          size?: string | null
          source?: string | null
          status?: string
          tattoo_description?: string
          total_paid?: number | null
          tracking_code?: string | null
          tracking_code_expires_at?: string | null
          unread_customer_messages?: number | null
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
            foreignKeyName: "calendar_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "customer_booking_view"
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
          last_rotated_at: string | null
          last_sync_at: string | null
          needs_rotation: boolean | null
          provider: string
          refresh_token: string | null
          rotation_count: number | null
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
          last_rotated_at?: string | null
          last_sync_at?: string | null
          needs_rotation?: boolean | null
          provider: string
          refresh_token?: string | null
          rotation_count?: number | null
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
          last_rotated_at?: string | null
          last_sync_at?: string | null
          needs_rotation?: boolean | null
          provider?: string
          refresh_token?: string | null
          rotation_count?: number | null
          sync_errors?: string[] | null
          token_expiry?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      campaign_sends: {
        Row: {
          bounced_at: string | null
          campaign_id: string
          clicked_at: string | null
          created_at: string
          delivered_at: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          opened_at: string | null
          resend_message_id: string | null
          sent_at: string | null
          status: string
          subscriber_id: string
        }
        Insert: {
          bounced_at?: string | null
          campaign_id: string
          clicked_at?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          resend_message_id?: string | null
          sent_at?: string | null
          status?: string
          subscriber_id: string
        }
        Update: {
          bounced_at?: string | null
          campaign_id?: string
          clicked_at?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          resend_message_id?: string | null
          sent_at?: string | null
          status?: string
          subscriber_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_sends_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_sends_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "newsletter_subscribers"
            referencedColumns: ["id"]
          },
        ]
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
      chat_rate_limits: {
        Row: {
          blocked_until: string | null
          id: string
          is_blocked: boolean | null
          last_message_at: string
          message_count: number | null
          session_id: string
          window_start: string
        }
        Insert: {
          blocked_until?: string | null
          id?: string
          is_blocked?: boolean | null
          last_message_at?: string
          message_count?: number | null
          session_id: string
          window_start?: string
        }
        Update: {
          blocked_until?: string | null
          id?: string
          is_blocked?: boolean | null
          last_message_at?: string
          message_count?: number | null
          session_id?: string
          window_start?: string
        }
        Relationships: []
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
          {
            foreignKeyName: "customer_emails_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "customer_booking_view"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_messages: {
        Row: {
          booking_id: string
          content: string
          created_at: string
          fingerprint_hash: string | null
          id: string
          ip_address: string | null
          is_read: boolean | null
          sender_type: string
        }
        Insert: {
          booking_id: string
          content: string
          created_at?: string
          fingerprint_hash?: string | null
          id?: string
          ip_address?: string | null
          is_read?: boolean | null
          sender_type: string
        }
        Update: {
          booking_id?: string
          content?: string
          created_at?: string
          fingerprint_hash?: string | null
          id?: string
          ip_address?: string | null
          is_read?: boolean | null
          sender_type?: string
        }
        Relationships: []
      }
      customer_payments: {
        Row: {
          amount: number
          booking_id: string
          completed_at: string | null
          created_at: string
          external_transaction_id: string | null
          fingerprint_hash: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          payment_link_expires_at: string | null
          payment_link_id: string | null
          payment_link_url: string | null
          payment_type: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          booking_id: string
          completed_at?: string | null
          created_at?: string
          external_transaction_id?: string | null
          fingerprint_hash?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          payment_link_expires_at?: string | null
          payment_link_id?: string | null
          payment_link_url?: string | null
          payment_type: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          booking_id?: string
          completed_at?: string | null
          created_at?: string
          external_transaction_id?: string | null
          fingerprint_hash?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          payment_link_expires_at?: string | null
          payment_link_id?: string | null
          payment_link_url?: string | null
          payment_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer_portal_rate_limits: {
        Row: {
          action_count: number | null
          action_type: string
          blocked_until: string | null
          booking_id: string
          id: string
          is_blocked: boolean | null
          window_start: string
        }
        Insert: {
          action_count?: number | null
          action_type: string
          blocked_until?: string | null
          booking_id: string
          id?: string
          is_blocked?: boolean | null
          window_start?: string
        }
        Update: {
          action_count?: number | null
          action_type?: string
          blocked_until?: string | null
          booking_id?: string
          id?: string
          is_blocked?: boolean | null
          window_start?: string
        }
        Relationships: []
      }
      customer_portal_sessions: {
        Row: {
          booking_id: string
          created_at: string
          expires_at: string
          fingerprint_hash: string
          id: string
          invalidated_at: string | null
          invalidation_reason: string | null
          ip_address: string | null
          is_active: boolean | null
          last_activity_at: string | null
          session_token_hash: string
          user_agent: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string
          expires_at: string
          fingerprint_hash: string
          id?: string
          invalidated_at?: string | null
          invalidation_reason?: string | null
          ip_address?: string | null
          is_active?: boolean | null
          last_activity_at?: string | null
          session_token_hash: string
          user_agent?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string
          expires_at?: string
          fingerprint_hash?: string
          id?: string
          invalidated_at?: string | null
          invalidation_reason?: string | null
          ip_address?: string | null
          is_active?: boolean | null
          last_activity_at?: string | null
          session_token_hash?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      device_fingerprints: {
        Row: {
          fingerprint_hash: string
          first_seen_at: string
          id: string
          is_suspicious: boolean | null
          last_seen_at: string
          request_count: number | null
          risk_score: number | null
          session_ids: string[] | null
        }
        Insert: {
          fingerprint_hash: string
          first_seen_at?: string
          id?: string
          is_suspicious?: boolean | null
          last_seen_at?: string
          request_count?: number | null
          risk_score?: number | null
          session_ids?: string[] | null
        }
        Update: {
          fingerprint_hash?: string
          first_seen_at?: string
          id?: string
          is_suspicious?: boolean | null
          last_seen_at?: string
          request_count?: number | null
          risk_score?: number | null
          session_ids?: string[] | null
        }
        Relationships: []
      }
      email_campaigns: {
        Row: {
          body: string
          bounce_count: number | null
          campaign_type: string | null
          click_count: number | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          delivered_count: number | null
          exclude_tags: string[] | null
          id: string
          name: string
          open_count: number | null
          preview_text: string | null
          scheduled_at: string | null
          sent_at: string | null
          sent_count: number | null
          status: string
          subject: string
          target_cities: string[] | null
          target_lead_score_max: number | null
          target_lead_score_min: number | null
          target_segments: string[] | null
          total_recipients: number | null
          unsubscribe_count: number | null
          updated_at: string
        }
        Insert: {
          body: string
          bounce_count?: number | null
          campaign_type?: string | null
          click_count?: number | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          delivered_count?: number | null
          exclude_tags?: string[] | null
          id?: string
          name: string
          open_count?: number | null
          preview_text?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          subject: string
          target_cities?: string[] | null
          target_lead_score_max?: number | null
          target_lead_score_min?: number | null
          target_segments?: string[] | null
          total_recipients?: number | null
          unsubscribe_count?: number | null
          updated_at?: string
        }
        Update: {
          body?: string
          bounce_count?: number | null
          campaign_type?: string | null
          click_count?: number | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          delivered_count?: number | null
          exclude_tags?: string[] | null
          id?: string
          name?: string
          open_count?: number | null
          preview_text?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          subject?: string
          target_cities?: string[] | null
          target_lead_score_max?: number | null
          target_lead_score_min?: number | null
          target_segments?: string[] | null
          total_recipients?: number | null
          unsubscribe_count?: number | null
          updated_at?: string
        }
        Relationships: []
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
      global_rate_limits: {
        Row: {
          action_count: number | null
          action_type: string
          blocked_until: string | null
          created_at: string | null
          id: string
          identifier_hash: string
          is_blocked: boolean | null
          last_action_at: string | null
          metadata: Json | null
          window_start: string | null
        }
        Insert: {
          action_count?: number | null
          action_type: string
          blocked_until?: string | null
          created_at?: string | null
          id?: string
          identifier_hash: string
          is_blocked?: boolean | null
          last_action_at?: string | null
          metadata?: Json | null
          window_start?: string | null
        }
        Update: {
          action_count?: number | null
          action_type?: string
          blocked_until?: string | null
          created_at?: string | null
          id?: string
          identifier_hash?: string
          is_blocked?: boolean | null
          last_action_at?: string | null
          metadata?: Json | null
          window_start?: string | null
        }
        Relationships: []
      }
      honeypot_triggers: {
        Row: {
          created_at: string
          id: string
          ip_address: string
          trigger_details: Json | null
          trigger_type: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address: string
          trigger_details?: Json | null
          trigger_type: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string
          trigger_details?: Json | null
          trigger_type?: string
          user_agent?: string | null
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
      magic_link_rate_limits: {
        Row: {
          blocked_until: string | null
          failed_attempts: number | null
          first_attempt_at: string | null
          id: string
          ip_address: string
          last_attempt_at: string | null
        }
        Insert: {
          blocked_until?: string | null
          failed_attempts?: number | null
          first_attempt_at?: string | null
          id?: string
          ip_address: string
          last_attempt_at?: string | null
        }
        Update: {
          blocked_until?: string | null
          failed_attempts?: number | null
          first_attempt_at?: string | null
          id?: string
          ip_address?: string
          last_attempt_at?: string | null
        }
        Relationships: []
      }
      magic_link_tokens: {
        Row: {
          booking_id: string
          created_at: string
          expires_at: string
          fingerprint_hash: string | null
          id: string
          ip_address: string | null
          is_used: boolean | null
          token_hash: string
          used_at: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string
          expires_at?: string
          fingerprint_hash?: string | null
          id?: string
          ip_address?: string | null
          is_used?: boolean | null
          token_hash: string
          used_at?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string
          expires_at?: string
          fingerprint_hash?: string | null
          id?: string
          ip_address?: string | null
          is_used?: boolean | null
          token_hash?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "magic_link_tokens_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "magic_link_tokens_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "customer_booking_view"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          booking_id: string | null
          click_count: number | null
          created_at: string
          email: string
          email_count: number | null
          id: string
          last_email_sent_at: string | null
          lead_score: number | null
          name: string | null
          open_count: number | null
          phone: string | null
          preferences: Json | null
          source: string | null
          status: string
          subscribed_at: string | null
          tags: string[] | null
          unsubscribed_at: string | null
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          verified_at: string | null
        }
        Insert: {
          booking_id?: string | null
          click_count?: number | null
          created_at?: string
          email: string
          email_count?: number | null
          id?: string
          last_email_sent_at?: string | null
          lead_score?: number | null
          name?: string | null
          open_count?: number | null
          phone?: string | null
          preferences?: Json | null
          source?: string | null
          status?: string
          subscribed_at?: string | null
          tags?: string[] | null
          unsubscribed_at?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          verified_at?: string | null
        }
        Update: {
          booking_id?: string | null
          click_count?: number | null
          created_at?: string
          email?: string
          email_count?: number | null
          id?: string
          last_email_sent_at?: string | null
          lead_score?: number | null
          name?: string | null
          open_count?: number | null
          phone?: string | null
          preferences?: Json | null
          source?: string | null
          status?: string
          subscribed_at?: string | null
          tags?: string[] | null
          unsubscribed_at?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_subscribers_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_subscribers_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "customer_booking_view"
            referencedColumns: ["id"]
          },
        ]
      }
      reschedule_requests: {
        Row: {
          admin_notes: string | null
          booking_id: string
          created_at: string
          fingerprint_hash: string | null
          id: string
          ip_address: string | null
          original_date: string | null
          original_time: string | null
          reason: string
          requested_date: string | null
          requested_time: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          admin_notes?: string | null
          booking_id: string
          created_at?: string
          fingerprint_hash?: string | null
          id?: string
          ip_address?: string | null
          original_date?: string | null
          original_time?: string | null
          reason: string
          requested_date?: string | null
          requested_time?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          admin_notes?: string | null
          booking_id?: string
          created_at?: string
          fingerprint_hash?: string | null
          id?: string
          ip_address?: string | null
          original_date?: string | null
          original_time?: string | null
          reason?: string
          requested_date?: string | null
          requested_time?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: []
      }
      security_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_type: string | null
          created_at: string | null
          details: Json | null
          entry_hash: string | null
          event_type: string
          fingerprint_hash: string | null
          id: string
          ip_address: string | null
          previous_hash: string | null
          resource_id: string | null
          resource_type: string | null
          timestamp: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_type?: string | null
          created_at?: string | null
          details?: Json | null
          entry_hash?: string | null
          event_type: string
          fingerprint_hash?: string | null
          id?: string
          ip_address?: string | null
          previous_hash?: string | null
          resource_id?: string | null
          resource_type?: string | null
          timestamp?: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_type?: string | null
          created_at?: string | null
          details?: Json | null
          entry_hash?: string | null
          event_type?: string
          fingerprint_hash?: string | null
          id?: string
          ip_address?: string | null
          previous_hash?: string | null
          resource_id?: string | null
          resource_type?: string | null
          timestamp?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      security_logs: {
        Row: {
          created_at: string
          details: Json | null
          email: string | null
          entry_hash: string | null
          event_type: string
          id: string
          ip_address: string | null
          is_flagged: boolean | null
          previous_hash: string | null
          success: boolean | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          email?: string | null
          entry_hash?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          is_flagged?: boolean | null
          previous_hash?: string | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          email?: string | null
          entry_hash?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          is_flagged?: boolean | null
          previous_hash?: string | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      tracking_code_rate_limits: {
        Row: {
          blocked_until: string | null
          id: string
          identifier_hash: string
          invalid_code_count: number | null
          is_blocked: boolean | null
          last_lookup_at: string | null
          lookup_count: number | null
          window_start: string | null
        }
        Insert: {
          blocked_until?: string | null
          id?: string
          identifier_hash: string
          invalid_code_count?: number | null
          is_blocked?: boolean | null
          last_lookup_at?: string | null
          lookup_count?: number | null
          window_start?: string | null
        }
        Update: {
          blocked_until?: string | null
          id?: string
          identifier_hash?: string
          invalid_code_count?: number | null
          is_blocked?: boolean | null
          last_lookup_at?: string | null
          lookup_count?: number | null
          window_start?: string | null
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
      verification_otps: {
        Row: {
          attempt_count: number | null
          created_at: string
          email: string
          expires_at: string
          fingerprint_hash: string | null
          id: string
          ip_address: string | null
          otp_hash: string
          phone: string | null
          verification_token_hash: string | null
          verified_at: string | null
        }
        Insert: {
          attempt_count?: number | null
          created_at?: string
          email: string
          expires_at?: string
          fingerprint_hash?: string | null
          id?: string
          ip_address?: string | null
          otp_hash: string
          phone?: string | null
          verification_token_hash?: string | null
          verified_at?: string | null
        }
        Update: {
          attempt_count?: number | null
          created_at?: string
          email?: string
          expires_at?: string
          fingerprint_hash?: string | null
          id?: string
          ip_address?: string | null
          otp_hash?: string
          phone?: string | null
          verification_token_hash?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      customer_booking_view: {
        Row: {
          created_at: string | null
          deposit_amount: number | null
          deposit_paid: boolean | null
          first_name: string | null
          id: string | null
          pipeline_stage: string | null
          placement: string | null
          reference_count: number | null
          requested_city: string | null
          scheduled_date: string | null
          scheduled_time: string | null
          size: string | null
          status: string | null
          tattoo_description: string | null
          tracking_code: string | null
        }
        Insert: {
          created_at?: string | null
          deposit_amount?: number | null
          deposit_paid?: boolean | null
          first_name?: never
          id?: string | null
          pipeline_stage?: string | null
          placement?: string | null
          reference_count?: never
          requested_city?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          size?: string | null
          status?: string | null
          tattoo_description?: never
          tracking_code?: string | null
        }
        Update: {
          created_at?: string | null
          deposit_amount?: number | null
          deposit_paid?: boolean | null
          first_name?: never
          id?: string | null
          pipeline_stage?: string | null
          placement?: string | null
          reference_count?: never
          requested_city?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          size?: string | null
          status?: string | null
          tattoo_description?: never
          tracking_code?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      append_security_audit: {
        Args: {
          p_action: string
          p_actor_id?: string
          p_actor_type?: string
          p_details?: Json
          p_event_type: string
          p_fingerprint_hash?: string
          p_ip_address?: string
          p_resource_id?: string
          p_resource_type?: string
          p_user_agent?: string
        }
        Returns: string
      }
      append_security_log: {
        Args: {
          p_details?: Json
          p_email?: string
          p_event_type: string
          p_ip_address?: string
          p_success?: boolean
          p_user_agent?: string
          p_user_id?: string
        }
        Returns: string
      }
      check_chat_rate_limit: { Args: { p_session_id: string }; Returns: Json }
      check_customer_rate_limit: {
        Args: {
          p_action_type: string
          p_booking_id: string
          p_max_actions: number
          p_window_minutes: number
        }
        Returns: {
          allowed: boolean
          current_count: number
          reset_at: string
        }[]
      }
      check_global_rate_limit: {
        Args: {
          p_action_type: string
          p_block_minutes?: number
          p_identifier: string
          p_max_actions?: number
          p_window_minutes?: number
        }
        Returns: Json
      }
      check_magic_link_rate_limit: {
        Args: { p_ip_address: string }
        Returns: Json
      }
      check_message_rate_limit: {
        Args: { p_booking_id: string; p_max?: number; p_window?: number }
        Returns: Json
      }
      check_newsletter_rate_limit: {
        Args: { p_email: string; p_ip_hash: string }
        Returns: Json
      }
      check_payment_rate_limit: {
        Args: { p_booking_id: string; p_max?: number; p_window?: number }
        Returns: Json
      }
      check_tracking_code_rate_limit: {
        Args: { p_ip_hash: string; p_tracking_code_prefix?: string }
        Returns: Json
      }
      cleanup_expired_sessions: { Args: never; Returns: number }
      cleanup_old_rate_limits: { Args: never; Returns: number }
      cleanup_tracking_rate_limits: { Args: never; Returns: number }
      clear_magic_link_rate_limit: {
        Args: { p_ip_address: string }
        Returns: undefined
      }
      create_magic_link_token: {
        Args: { p_booking_id: string; p_token_hash: string }
        Returns: string
      }
      decrypt_token: { Args: { encrypted_token: string }; Returns: string }
      detect_security_anomalies: {
        Args: never
        Returns: {
          affected_count: number
          anomaly_type: string
          description: string
          details: Json
          severity: string
        }[]
      }
      encrypt_token: { Args: { plain_token: string }; Returns: string }
      flag_suspicious_booking: {
        Args: { p_booking_id: string; p_details?: Json; p_flag_type: string }
        Returns: undefined
      }
      get_customer_permissions: {
        Args: { p_pipeline_stage: string }
        Returns: Json
      }
      get_safe_booking_by_tracking_code: {
        Args: { p_tracking_code: string }
        Returns: {
          created_at: string
          deposit_amount: number
          deposit_paid: boolean
          first_name: string
          id: string
          pipeline_stage: string
          placement: string
          requested_city: string
          scheduled_date: string
          scheduled_time: string
          size: string
          status: string
          tattoo_description: string
          total_paid: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hash_email: { Args: { p_email: string }; Returns: string }
      invalidate_suspicious_sessions: {
        Args: {
          p_booking_id: string
          p_except_session_id?: string
          p_reason: string
        }
        Returns: number
      }
      log_honeypot_trigger: {
        Args: {
          p_ip_address: string
          p_trigger_details?: Json
          p_trigger_type: string
          p_user_agent: string
        }
        Returns: undefined
      }
      record_magic_link_failure: {
        Args: { p_ip_address: string }
        Returns: undefined
      }
      secure_tracking_lookup: {
        Args: {
          p_fingerprint_hash?: string
          p_ip_hash: string
          p_tracking_code: string
        }
        Returns: Json
      }
      track_device_fingerprint: {
        Args: { p_fingerprint_hash: string; p_session_id: string }
        Returns: Json
      }
      update_lead_score: {
        Args: { points: number; reason?: string; subscriber_email: string }
        Returns: undefined
      }
      validate_email_verification: {
        Args: { p_email: string; p_verification_token: string }
        Returns: boolean
      }
      validate_magic_link: {
        Args: {
          p_fingerprint_hash?: string
          p_ip_address?: string
          p_token_hash: string
        }
        Returns: Json
      }
      validate_session_access: {
        Args: {
          p_booking_id: string
          p_fingerprint_hash?: string
          p_session_token_hash: string
        }
        Returns: boolean
      }
      validate_session_with_ip: {
        Args: {
          p_booking_id: string
          p_fingerprint_hash?: string
          p_ip_hash: string
          p_session_token_hash: string
        }
        Returns: Json
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
