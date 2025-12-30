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
      ai_design_suggestions: {
        Row: {
          ai_description: string | null
          booking_id: string | null
          client_reaction: string | null
          conversation_id: string | null
          created_at: string
          estimated_duration_minutes: number | null
          estimated_size: string | null
          generated_image_url: string | null
          id: string
          iteration_number: number | null
          parent_suggestion_id: string | null
          reaction_sentiment_score: number | null
          reference_images: string[] | null
          style_preferences: string[] | null
          suggested_placement: string | null
          user_prompt: string
          variation_urls: string[] | null
        }
        Insert: {
          ai_description?: string | null
          booking_id?: string | null
          client_reaction?: string | null
          conversation_id?: string | null
          created_at?: string
          estimated_duration_minutes?: number | null
          estimated_size?: string | null
          generated_image_url?: string | null
          id?: string
          iteration_number?: number | null
          parent_suggestion_id?: string | null
          reaction_sentiment_score?: number | null
          reference_images?: string[] | null
          style_preferences?: string[] | null
          suggested_placement?: string | null
          user_prompt: string
          variation_urls?: string[] | null
        }
        Update: {
          ai_description?: string | null
          booking_id?: string | null
          client_reaction?: string | null
          conversation_id?: string | null
          created_at?: string
          estimated_duration_minutes?: number | null
          estimated_size?: string | null
          generated_image_url?: string | null
          id?: string
          iteration_number?: number | null
          parent_suggestion_id?: string | null
          reaction_sentiment_score?: number | null
          reference_images?: string[] | null
          style_preferences?: string[] | null
          suggested_placement?: string | null
          user_prompt?: string
          variation_urls?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_design_suggestions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_design_suggestions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "customer_booking_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_design_suggestions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_design_suggestions_parent_suggestion_id_fkey"
            columns: ["parent_suggestion_id"]
            isOneToOne: false
            referencedRelation: "ai_design_suggestions"
            referencedColumns: ["id"]
          },
        ]
      }
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
      ai_session_predictions: {
        Row: {
          actual_duration_minutes: number | null
          analysis_details: Json | null
          booking_id: string | null
          confidence_score: number | null
          created_at: string
          id: string
          predicted_complexity: number | null
          predicted_duration_minutes: number | null
          predicted_price_range: Json | null
          predicted_sessions_needed: number | null
          prediction_accuracy: number | null
          reference_image_url: string | null
        }
        Insert: {
          actual_duration_minutes?: number | null
          analysis_details?: Json | null
          booking_id?: string | null
          confidence_score?: number | null
          created_at?: string
          id?: string
          predicted_complexity?: number | null
          predicted_duration_minutes?: number | null
          predicted_price_range?: Json | null
          predicted_sessions_needed?: number | null
          prediction_accuracy?: number | null
          reference_image_url?: string | null
        }
        Update: {
          actual_duration_minutes?: number | null
          analysis_details?: Json | null
          booking_id?: string | null
          confidence_score?: number | null
          created_at?: string
          id?: string
          predicted_complexity?: number | null
          predicted_duration_minutes?: number | null
          predicted_price_range?: Json | null
          predicted_sessions_needed?: number | null
          prediction_accuracy?: number | null
          reference_image_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_session_predictions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_session_predictions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "customer_booking_view"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_capabilities: {
        Row: {
          accepted_styles: string[] | null
          accepts_black_grey_only: boolean | null
          accepts_bodysuits: boolean | null
          accepts_color_work: boolean | null
          accepts_coverups: boolean | null
          accepts_first_timers: boolean | null
          accepts_full_back: boolean | null
          accepts_full_sleeves: boolean | null
          accepts_matching_tattoos: boolean | null
          accepts_reworks: boolean | null
          accepts_touchups: boolean | null
          accepts_walk_ins: boolean | null
          allows_design_changes: boolean | null
          artist_id: string
          created_at: string | null
          deposit_amount: number | null
          id: string
          internal_notes: string | null
          large_project_threshold_hours: number | null
          max_clients_per_day: number | null
          max_design_revisions: number | null
          max_revision_rounds: number | null
          max_session_hours: number | null
          max_size_inches: number | null
          min_session_hours: number | null
          min_size_inches: number | null
          offers_flash: boolean | null
          preferred_size_max: number | null
          preferred_size_min: number | null
          prefers_custom_only: boolean | null
          prefers_multi_session: boolean | null
          rejected_placements: string[] | null
          rejected_styles: string[] | null
          requires_consultation_for_large: boolean | null
          requires_consultation_placements: string[] | null
          requires_deposit: boolean | null
          requires_reference_images: boolean | null
          revision_consolidation_window_hours: number | null
          session_type: string | null
          signature_styles: string[] | null
          special_conditions: Json | null
          updated_at: string | null
          will_repeat_designs: boolean | null
        }
        Insert: {
          accepted_styles?: string[] | null
          accepts_black_grey_only?: boolean | null
          accepts_bodysuits?: boolean | null
          accepts_color_work?: boolean | null
          accepts_coverups?: boolean | null
          accepts_first_timers?: boolean | null
          accepts_full_back?: boolean | null
          accepts_full_sleeves?: boolean | null
          accepts_matching_tattoos?: boolean | null
          accepts_reworks?: boolean | null
          accepts_touchups?: boolean | null
          accepts_walk_ins?: boolean | null
          allows_design_changes?: boolean | null
          artist_id: string
          created_at?: string | null
          deposit_amount?: number | null
          id?: string
          internal_notes?: string | null
          large_project_threshold_hours?: number | null
          max_clients_per_day?: number | null
          max_design_revisions?: number | null
          max_revision_rounds?: number | null
          max_session_hours?: number | null
          max_size_inches?: number | null
          min_session_hours?: number | null
          min_size_inches?: number | null
          offers_flash?: boolean | null
          preferred_size_max?: number | null
          preferred_size_min?: number | null
          prefers_custom_only?: boolean | null
          prefers_multi_session?: boolean | null
          rejected_placements?: string[] | null
          rejected_styles?: string[] | null
          requires_consultation_for_large?: boolean | null
          requires_consultation_placements?: string[] | null
          requires_deposit?: boolean | null
          requires_reference_images?: boolean | null
          revision_consolidation_window_hours?: number | null
          session_type?: string | null
          signature_styles?: string[] | null
          special_conditions?: Json | null
          updated_at?: string | null
          will_repeat_designs?: boolean | null
        }
        Update: {
          accepted_styles?: string[] | null
          accepts_black_grey_only?: boolean | null
          accepts_bodysuits?: boolean | null
          accepts_color_work?: boolean | null
          accepts_coverups?: boolean | null
          accepts_first_timers?: boolean | null
          accepts_full_back?: boolean | null
          accepts_full_sleeves?: boolean | null
          accepts_matching_tattoos?: boolean | null
          accepts_reworks?: boolean | null
          accepts_touchups?: boolean | null
          accepts_walk_ins?: boolean | null
          allows_design_changes?: boolean | null
          artist_id?: string
          created_at?: string | null
          deposit_amount?: number | null
          id?: string
          internal_notes?: string | null
          large_project_threshold_hours?: number | null
          max_clients_per_day?: number | null
          max_design_revisions?: number | null
          max_revision_rounds?: number | null
          max_session_hours?: number | null
          max_size_inches?: number | null
          min_session_hours?: number | null
          min_size_inches?: number | null
          offers_flash?: boolean | null
          preferred_size_max?: number | null
          preferred_size_min?: number | null
          prefers_custom_only?: boolean | null
          prefers_multi_session?: boolean | null
          rejected_placements?: string[] | null
          rejected_styles?: string[] | null
          requires_consultation_for_large?: boolean | null
          requires_consultation_placements?: string[] | null
          requires_deposit?: boolean | null
          requires_reference_images?: boolean | null
          revision_consolidation_window_hours?: number | null
          session_type?: string | null
          signature_styles?: string[] | null
          special_conditions?: Json | null
          updated_at?: string | null
          will_repeat_designs?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "artist_capabilities_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: true
            referencedRelation: "studio_artists"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_pricing_models: {
        Row: {
          applies_to_styles: string[] | null
          artist_id: string | null
          city_id: string | null
          created_at: string | null
          deposit_amount: number | null
          deposit_percentage: number | null
          deposit_type: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          is_public: boolean | null
          max_price: number | null
          min_price: number | null
          minimum_amount: number | null
          minimum_applies_to: string | null
          notes: string | null
          pricing_type: string
          rate_amount: number
          rate_currency: string | null
          rate_type: string | null
          safe_messaging_blurb: string | null
          updated_at: string | null
        }
        Insert: {
          applies_to_styles?: string[] | null
          artist_id?: string | null
          city_id?: string | null
          created_at?: string | null
          deposit_amount?: number | null
          deposit_percentage?: number | null
          deposit_type?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          is_public?: boolean | null
          max_price?: number | null
          min_price?: number | null
          minimum_amount?: number | null
          minimum_applies_to?: string | null
          notes?: string | null
          pricing_type: string
          rate_amount: number
          rate_currency?: string | null
          rate_type?: string | null
          safe_messaging_blurb?: string | null
          updated_at?: string | null
        }
        Update: {
          applies_to_styles?: string[] | null
          artist_id?: string | null
          city_id?: string | null
          created_at?: string | null
          deposit_amount?: number | null
          deposit_percentage?: number | null
          deposit_type?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          is_public?: boolean | null
          max_price?: number | null
          min_price?: number | null
          minimum_amount?: number | null
          minimum_applies_to?: string | null
          notes?: string | null
          pricing_type?: string
          rate_amount?: number
          rate_currency?: string | null
          rate_type?: string | null
          safe_messaging_blurb?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artist_pricing_models_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "studio_artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artist_pricing_models_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "city_configurations"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_public_facts: {
        Row: {
          artist_id: string
          base_location: Json | null
          bookable_cities: Json | null
          booking_model: Json | null
          brand_positioning: Json | null
          created_at: string
          display_name: string
          id: string
          languages: Json | null
          legal_name: string | null
          location_notes: Json | null
          not_offered_styles: Json | null
          not_offered_work_types: Json | null
          portfolio_config: Json | null
          public_handle: string | null
          public_links: Json | null
          specialties: Json | null
          updated_at: string
        }
        Insert: {
          artist_id: string
          base_location?: Json | null
          bookable_cities?: Json | null
          booking_model?: Json | null
          brand_positioning?: Json | null
          created_at?: string
          display_name: string
          id?: string
          languages?: Json | null
          legal_name?: string | null
          location_notes?: Json | null
          not_offered_styles?: Json | null
          not_offered_work_types?: Json | null
          portfolio_config?: Json | null
          public_handle?: string | null
          public_links?: Json | null
          specialties?: Json | null
          updated_at?: string
        }
        Update: {
          artist_id?: string
          base_location?: Json | null
          bookable_cities?: Json | null
          booking_model?: Json | null
          brand_positioning?: Json | null
          created_at?: string
          display_name?: string
          id?: string
          languages?: Json | null
          legal_name?: string | null
          location_notes?: Json | null
          not_offered_styles?: Json | null
          not_offered_work_types?: Json | null
          portfolio_config?: Json | null
          public_handle?: string | null
          public_links?: Json | null
          specialties?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_public_facts_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: true
            referencedRelation: "studio_artists"
            referencedColumns: ["id"]
          },
        ]
      }
      availability: {
        Row: {
          artist_id: string | null
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
          artist_id?: string | null
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
          artist_id?: string | null
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
            foreignKeyName: "availability_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "studio_artists"
            referencedColumns: ["id"]
          },
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
      booking_waitlist: {
        Row: {
          client_email: string
          client_name: string | null
          client_phone: string | null
          converted_booking_id: string | null
          created_at: string
          discount_eligible: boolean | null
          expires_at: string | null
          flexibility_days: number | null
          id: string
          last_offer_sent_at: string | null
          match_score: number | null
          max_budget: number | null
          offers_sent_count: number | null
          preferred_cities: string[] | null
          preferred_dates: Json | null
          size_preference: string | null
          status: string | null
          style_preference: string | null
          tattoo_description: string | null
        }
        Insert: {
          client_email: string
          client_name?: string | null
          client_phone?: string | null
          converted_booking_id?: string | null
          created_at?: string
          discount_eligible?: boolean | null
          expires_at?: string | null
          flexibility_days?: number | null
          id?: string
          last_offer_sent_at?: string | null
          match_score?: number | null
          max_budget?: number | null
          offers_sent_count?: number | null
          preferred_cities?: string[] | null
          preferred_dates?: Json | null
          size_preference?: string | null
          status?: string | null
          style_preference?: string | null
          tattoo_description?: string | null
        }
        Update: {
          client_email?: string
          client_name?: string | null
          client_phone?: string | null
          converted_booking_id?: string | null
          created_at?: string
          discount_eligible?: boolean | null
          expires_at?: string | null
          flexibility_days?: number | null
          id?: string
          last_offer_sent_at?: string | null
          match_score?: number | null
          max_budget?: number | null
          offers_sent_count?: number | null
          preferred_cities?: string[] | null
          preferred_dates?: Json | null
          size_preference?: string | null
          status?: string | null
          style_preference?: string | null
          tattoo_description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_waitlist_converted_booking_id_fkey"
            columns: ["converted_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_waitlist_converted_booking_id_fkey"
            columns: ["converted_booking_id"]
            isOneToOne: false
            referencedRelation: "customer_booking_view"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          admin_notes: string | null
          artist_id: string | null
          city_id: string | null
          concierge_mode: string | null
          confirmed_24h: boolean | null
          confirmed_24h_at: string | null
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
          policy_acceptance_id: string | null
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
          tattoo_brief_id: string | null
          tattoo_description: string
          total_paid: number | null
          tracking_code: string | null
          tracking_code_expires_at: string | null
          unread_customer_messages: number | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          artist_id?: string | null
          city_id?: string | null
          concierge_mode?: string | null
          confirmed_24h?: boolean | null
          confirmed_24h_at?: string | null
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
          policy_acceptance_id?: string | null
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
          tattoo_brief_id?: string | null
          tattoo_description: string
          total_paid?: number | null
          tracking_code?: string | null
          tracking_code_expires_at?: string | null
          unread_customer_messages?: number | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          artist_id?: string | null
          city_id?: string | null
          concierge_mode?: string | null
          confirmed_24h?: boolean | null
          confirmed_24h_at?: string | null
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
          policy_acceptance_id?: string | null
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
          tattoo_brief_id?: string | null
          tattoo_description?: string
          total_paid?: number | null
          tracking_code?: string | null
          tracking_code_expires_at?: string | null
          unread_customer_messages?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "studio_artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "city_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_policy_acceptance_id_fkey"
            columns: ["policy_acceptance_id"]
            isOneToOne: false
            referencedRelation: "policy_acceptances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_tattoo_brief_id_fkey"
            columns: ["tattoo_brief_id"]
            isOneToOne: false
            referencedRelation: "tattoo_briefs"
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
          extended_properties: Json | null
          external_calendar: string | null
          external_id: string | null
          id: string
          is_synced: boolean | null
          recurrence_rule: string | null
          start_time: string
          state: string | null
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
          extended_properties?: Json | null
          external_calendar?: string | null
          external_id?: string | null
          id?: string
          is_synced?: boolean | null
          recurrence_rule?: string | null
          start_time: string
          state?: string | null
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
          extended_properties?: Json | null
          external_calendar?: string | null
          external_id?: string | null
          id?: string
          is_synced?: boolean | null
          recurrence_rule?: string | null
          start_time?: string
          state?: string | null
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
          client_email: string | null
          client_name: string | null
          collected_fields: Json | null
          concierge_mode: string | null
          conversion_type: string | null
          converted: boolean
          created_at: string
          ended_at: string | null
          facts_confidence: Json | null
          has_asked_about_guest_spots: boolean | null
          id: string
          journey_goal: string | null
          location_preference: string | null
          message_count: number
          selected_artist_id: string | null
          session_id: string
          started_at: string
          tattoo_brief_id: string | null
        }
        Insert: {
          client_email?: string | null
          client_name?: string | null
          collected_fields?: Json | null
          concierge_mode?: string | null
          conversion_type?: string | null
          converted?: boolean
          created_at?: string
          ended_at?: string | null
          facts_confidence?: Json | null
          has_asked_about_guest_spots?: boolean | null
          id?: string
          journey_goal?: string | null
          location_preference?: string | null
          message_count?: number
          selected_artist_id?: string | null
          session_id: string
          started_at?: string
          tattoo_brief_id?: string | null
        }
        Update: {
          client_email?: string | null
          client_name?: string | null
          collected_fields?: Json | null
          concierge_mode?: string | null
          conversion_type?: string | null
          converted?: boolean
          created_at?: string
          ended_at?: string | null
          facts_confidence?: Json | null
          has_asked_about_guest_spots?: boolean | null
          id?: string
          journey_goal?: string | null
          location_preference?: string | null
          message_count?: number
          selected_artist_id?: string | null
          session_id?: string
          started_at?: string
          tattoo_brief_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_tattoo_brief_id_fkey"
            columns: ["tattoo_brief_id"]
            isOneToOne: false
            referencedRelation: "tattoo_briefs"
            referencedColumns: ["id"]
          },
        ]
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
      client_documents: {
        Row: {
          booking_id: string
          description: string | null
          document_type: string
          file_name: string | null
          file_size: number | null
          file_url: string
          id: string
          mime_type: string | null
          uploaded_at: string
        }
        Insert: {
          booking_id: string
          description?: string | null
          document_type: string
          file_name?: string | null
          file_size?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          uploaded_at?: string
        }
        Update: {
          booking_id?: string
          description?: string | null
          document_type?: string
          file_name?: string | null
          file_size?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_documents_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_documents_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "customer_booking_view"
            referencedColumns: ["id"]
          },
        ]
      }
      client_fit_scores: {
        Row: {
          booking_id: string | null
          conversation_id: string | null
          created_at: string
          fit_level: string
          id: string
          reasoning: string | null
          recommendation: string | null
          redirect_reason: string | null
          score: number
          style_match_details: Json | null
          tattoo_brief_id: string | null
        }
        Insert: {
          booking_id?: string | null
          conversation_id?: string | null
          created_at?: string
          fit_level: string
          id?: string
          reasoning?: string | null
          recommendation?: string | null
          redirect_reason?: string | null
          score: number
          style_match_details?: Json | null
          tattoo_brief_id?: string | null
        }
        Update: {
          booking_id?: string | null
          conversation_id?: string | null
          created_at?: string
          fit_level?: string
          id?: string
          reasoning?: string | null
          recommendation?: string | null
          redirect_reason?: string | null
          score?: number
          style_match_details?: Json | null
          tattoo_brief_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_fit_scores_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_fit_scores_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "customer_booking_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_fit_scores_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_fit_scores_tattoo_brief_id_fkey"
            columns: ["tattoo_brief_id"]
            isOneToOne: false
            referencedRelation: "tattoo_briefs"
            referencedColumns: ["id"]
          },
        ]
      }
      client_profiles: {
        Row: {
          ai_persona: Json | null
          allergies: string[] | null
          booking_id: string | null
          communication_style: string | null
          created_at: string
          deposit_modifier: number | null
          dispute_count: number | null
          email: string
          email_hash: string
          full_name: string | null
          id: string
          instagram_handle: string | null
          last_risk_assessment: string | null
          last_session_date: string | null
          late_cancel_count: number | null
          lead_score: number | null
          lifetime_value: number | null
          medical_notes: string | null
          next_recommended_date: string | null
          no_show_count: number | null
          phone_encrypted: string | null
          predicted_preferences: Json | null
          preferred_styles: string[] | null
          requires_approval: boolean | null
          risk_flags: string[] | null
          risk_score: number | null
          sentiment_history: Json | null
          session_count: number | null
          skin_type: string | null
          social_verified: boolean | null
          trust_tier: string | null
          updated_at: string
        }
        Insert: {
          ai_persona?: Json | null
          allergies?: string[] | null
          booking_id?: string | null
          communication_style?: string | null
          created_at?: string
          deposit_modifier?: number | null
          dispute_count?: number | null
          email: string
          email_hash: string
          full_name?: string | null
          id?: string
          instagram_handle?: string | null
          last_risk_assessment?: string | null
          last_session_date?: string | null
          late_cancel_count?: number | null
          lead_score?: number | null
          lifetime_value?: number | null
          medical_notes?: string | null
          next_recommended_date?: string | null
          no_show_count?: number | null
          phone_encrypted?: string | null
          predicted_preferences?: Json | null
          preferred_styles?: string[] | null
          requires_approval?: boolean | null
          risk_flags?: string[] | null
          risk_score?: number | null
          sentiment_history?: Json | null
          session_count?: number | null
          skin_type?: string | null
          social_verified?: boolean | null
          trust_tier?: string | null
          updated_at?: string
        }
        Update: {
          ai_persona?: Json | null
          allergies?: string[] | null
          booking_id?: string | null
          communication_style?: string | null
          created_at?: string
          deposit_modifier?: number | null
          dispute_count?: number | null
          email?: string
          email_hash?: string
          full_name?: string | null
          id?: string
          instagram_handle?: string | null
          last_risk_assessment?: string | null
          last_session_date?: string | null
          late_cancel_count?: number | null
          lead_score?: number | null
          lifetime_value?: number | null
          medical_notes?: string | null
          next_recommended_date?: string | null
          no_show_count?: number | null
          phone_encrypted?: string | null
          predicted_preferences?: Json | null
          preferred_styles?: string[] | null
          requires_approval?: boolean | null
          risk_flags?: string[] | null
          risk_score?: number | null
          sentiment_history?: Json | null
          session_count?: number | null
          skin_type?: string | null
          social_verified?: boolean | null
          trust_tier?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_profiles_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_profiles_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "customer_booking_view"
            referencedColumns: ["id"]
          },
        ]
      }
      client_project_notes: {
        Row: {
          booking_id: string
          content: string
          created_at: string
          id: string
          is_acknowledged: boolean | null
          note_type: string
          updated_at: string
        }
        Insert: {
          booking_id: string
          content: string
          created_at?: string
          id?: string
          is_acknowledged?: boolean | null
          note_type: string
          updated_at?: string
        }
        Update: {
          booking_id?: string
          content?: string
          created_at?: string
          id?: string
          is_acknowledged?: boolean | null
          note_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_project_notes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_project_notes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "customer_booking_view"
            referencedColumns: ["id"]
          },
        ]
      }
      concierge_flow_config: {
        Row: {
          collects_field: string | null
          concierge_mode: string
          created_at: string | null
          default_question: string
          depends_on: string[] | null
          follow_up_on_unclear: boolean | null
          id: string
          is_active: boolean | null
          is_required: boolean | null
          max_follow_ups: number | null
          skip_if_known: boolean | null
          step_key: string
          step_name: string
          step_order: number
          updated_at: string | null
          valid_responses: string[] | null
          validation_regex: string | null
        }
        Insert: {
          collects_field?: string | null
          concierge_mode: string
          created_at?: string | null
          default_question: string
          depends_on?: string[] | null
          follow_up_on_unclear?: boolean | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          max_follow_ups?: number | null
          skip_if_known?: boolean | null
          step_key: string
          step_name: string
          step_order: number
          updated_at?: string | null
          valid_responses?: string[] | null
          validation_regex?: string | null
        }
        Update: {
          collects_field?: string | null
          concierge_mode?: string
          created_at?: string | null
          default_question?: string
          depends_on?: string[] | null
          follow_up_on_unclear?: boolean | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          max_follow_ups?: number | null
          skip_if_known?: boolean | null
          step_key?: string
          step_name?: string
          step_order?: number
          updated_at?: string | null
          valid_responses?: string[] | null
          validation_regex?: string | null
        }
        Relationships: []
      }
      concierge_knowledge: {
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
      concierge_message_templates: {
        Row: {
          allow_ai_variation: boolean | null
          available_variables: string[] | null
          category: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          is_required: boolean | null
          last_used_at: string | null
          message_content: string
          template_key: string
          template_name: string
          trigger_event: string | null
          trigger_mode: string | null
          updated_at: string | null
          use_count: number | null
        }
        Insert: {
          allow_ai_variation?: boolean | null
          available_variables?: string[] | null
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          last_used_at?: string | null
          message_content: string
          template_key: string
          template_name: string
          trigger_event?: string | null
          trigger_mode?: string | null
          updated_at?: string | null
          use_count?: number | null
        }
        Update: {
          allow_ai_variation?: boolean | null
          available_variables?: string[] | null
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          last_used_at?: string | null
          message_content?: string
          template_key?: string
          template_name?: string
          trigger_event?: string | null
          trigger_mode?: string | null
          updated_at?: string | null
          use_count?: number | null
        }
        Relationships: []
      }
      concierge_rejection_templates: {
        Row: {
          alternative_suggestions: string[] | null
          created_at: string | null
          id: string
          is_active: boolean | null
          referral_enabled: boolean | null
          rejection_reason: string
          rejection_type: string
          template_response: string
        }
        Insert: {
          alternative_suggestions?: string[] | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          referral_enabled?: boolean | null
          rejection_reason: string
          rejection_type: string
          template_response: string
        }
        Update: {
          alternative_suggestions?: string[] | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          referral_enabled?: boolean | null
          rejection_reason?: string
          rejection_type?: string
          template_response?: string
        }
        Relationships: []
      }
      concierge_settings: {
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
      concierge_test_cases: {
        Row: {
          assertions: Json
          category: string | null
          context: Json | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          last_passed: boolean | null
          last_result: Json | null
          last_run_at: string | null
          messages: Json
          name: string
          pass_count: number | null
          run_count: number | null
          updated_at: string
        }
        Insert: {
          assertions: Json
          category?: string | null
          context?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_passed?: boolean | null
          last_result?: Json | null
          last_run_at?: string | null
          messages?: Json
          name: string
          pass_count?: number | null
          run_count?: number | null
          updated_at?: string
        }
        Update: {
          assertions?: Json
          category?: string | null
          context?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_passed?: boolean | null
          last_result?: Json | null
          last_run_at?: string | null
          messages?: Json
          name?: string
          pass_count?: number | null
          run_count?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      concierge_training_pairs: {
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
      deposit_transactions: {
        Row: {
          amount_cents: number
          booking_id: string
          created_at: string | null
          credit_from_booking_id: string | null
          currency: string | null
          expires_at: string | null
          id: string
          notes: string | null
          processed_by: string | null
          reason: string | null
          state: Database["public"]["Enums"]["deposit_state"]
          stripe_payment_id: string | null
        }
        Insert: {
          amount_cents: number
          booking_id: string
          created_at?: string | null
          credit_from_booking_id?: string | null
          currency?: string | null
          expires_at?: string | null
          id?: string
          notes?: string | null
          processed_by?: string | null
          reason?: string | null
          state: Database["public"]["Enums"]["deposit_state"]
          stripe_payment_id?: string | null
        }
        Update: {
          amount_cents?: number
          booking_id?: string
          created_at?: string | null
          credit_from_booking_id?: string | null
          currency?: string | null
          expires_at?: string | null
          id?: string
          notes?: string | null
          processed_by?: string | null
          reason?: string | null
          state?: Database["public"]["Enums"]["deposit_state"]
          stripe_payment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deposit_transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposit_transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "customer_booking_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposit_transactions_credit_from_booking_id_fkey"
            columns: ["credit_from_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposit_transactions_credit_from_booking_id_fkey"
            columns: ["credit_from_booking_id"]
            isOneToOne: false
            referencedRelation: "customer_booking_view"
            referencedColumns: ["id"]
          },
        ]
      }
      design_revisions: {
        Row: {
          artist_response: string | null
          booking_id: string
          client_notes: string | null
          id: string
          is_consolidated: boolean | null
          reviewed_at: string | null
          reviewed_by: string | null
          revision_number: number
          status: string | null
          submitted_at: string | null
        }
        Insert: {
          artist_response?: string | null
          booking_id: string
          client_notes?: string | null
          id?: string
          is_consolidated?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision_number: number
          status?: string | null
          submitted_at?: string | null
        }
        Update: {
          artist_response?: string | null
          booking_id?: string
          client_notes?: string | null
          id?: string
          is_consolidated?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision_number?: number
          status?: string | null
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "design_revisions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_revisions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "customer_booking_view"
            referencedColumns: ["id"]
          },
        ]
      }
      design_similarity_checks: {
        Row: {
          compared_to_booking_id: string | null
          created_at: string | null
          flagged_as_repeat: boolean | null
          id: string
          matching_factors: Json | null
          review_decision: string | null
          review_notes: string | null
          reviewed_by_artist: boolean | null
          similarity_score: number | null
          tattoo_brief_id: string | null
        }
        Insert: {
          compared_to_booking_id?: string | null
          created_at?: string | null
          flagged_as_repeat?: boolean | null
          id?: string
          matching_factors?: Json | null
          review_decision?: string | null
          review_notes?: string | null
          reviewed_by_artist?: boolean | null
          similarity_score?: number | null
          tattoo_brief_id?: string | null
        }
        Update: {
          compared_to_booking_id?: string | null
          created_at?: string | null
          flagged_as_repeat?: boolean | null
          id?: string
          matching_factors?: Json | null
          review_decision?: string | null
          review_notes?: string | null
          reviewed_by_artist?: boolean | null
          similarity_score?: number | null
          tattoo_brief_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "design_similarity_checks_compared_to_booking_id_fkey"
            columns: ["compared_to_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_similarity_checks_compared_to_booking_id_fkey"
            columns: ["compared_to_booking_id"]
            isOneToOne: false
            referencedRelation: "customer_booking_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_similarity_checks_tattoo_brief_id_fkey"
            columns: ["tattoo_brief_id"]
            isOneToOne: false
            referencedRelation: "tattoo_briefs"
            referencedColumns: ["id"]
          },
        ]
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
      guest_spot_events: {
        Row: {
          announced_at: string | null
          artist_id: string
          booked_slots: number | null
          booking_opens_at: string | null
          booking_status: string | null
          city: string
          country: string
          created_at: string
          date_range_end: string
          date_range_start: string
          id: string
          internal_notes: string | null
          max_slots: number | null
          notes: string | null
          source_type: string | null
          source_url: string | null
          status: string
          updated_at: string
          venue_address: string | null
          venue_name: string | null
        }
        Insert: {
          announced_at?: string | null
          artist_id: string
          booked_slots?: number | null
          booking_opens_at?: string | null
          booking_status?: string | null
          city: string
          country: string
          created_at?: string
          date_range_end: string
          date_range_start: string
          id?: string
          internal_notes?: string | null
          max_slots?: number | null
          notes?: string | null
          source_type?: string | null
          source_url?: string | null
          status?: string
          updated_at?: string
          venue_address?: string | null
          venue_name?: string | null
        }
        Update: {
          announced_at?: string | null
          artist_id?: string
          booked_slots?: number | null
          booking_opens_at?: string | null
          booking_status?: string | null
          city?: string
          country?: string
          created_at?: string
          date_range_end?: string
          date_range_start?: string
          id?: string
          internal_notes?: string | null
          max_slots?: number | null
          notes?: string | null
          source_type?: string | null
          source_url?: string | null
          status?: string
          updated_at?: string
          venue_address?: string | null
          venue_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guest_spot_events_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "studio_artists"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_spot_subscriptions: {
        Row: {
          artist_id: string
          city: string | null
          client_name: string | null
          confirmation_sent_at: string | null
          confirmation_token: string | null
          confirmed_at: string | null
          conversation_id: string | null
          converted_booking_id: string | null
          country: string | null
          created_at: string
          email: string
          id: string
          last_notified_at: string | null
          notifications_sent: number | null
          phone: string | null
          placement: string | null
          pre_gate_responses: Json | null
          size: string | null
          source: string | null
          status: string
          style_preference: string | null
          subscription_type: string
          tattoo_brief_id: string | null
          updated_at: string
        }
        Insert: {
          artist_id: string
          city?: string | null
          client_name?: string | null
          confirmation_sent_at?: string | null
          confirmation_token?: string | null
          confirmed_at?: string | null
          conversation_id?: string | null
          converted_booking_id?: string | null
          country?: string | null
          created_at?: string
          email: string
          id?: string
          last_notified_at?: string | null
          notifications_sent?: number | null
          phone?: string | null
          placement?: string | null
          pre_gate_responses?: Json | null
          size?: string | null
          source?: string | null
          status?: string
          style_preference?: string | null
          subscription_type?: string
          tattoo_brief_id?: string | null
          updated_at?: string
        }
        Update: {
          artist_id?: string
          city?: string | null
          client_name?: string | null
          confirmation_sent_at?: string | null
          confirmation_token?: string | null
          confirmed_at?: string | null
          conversation_id?: string | null
          converted_booking_id?: string | null
          country?: string | null
          created_at?: string
          email?: string
          id?: string
          last_notified_at?: string | null
          notifications_sent?: number | null
          phone?: string | null
          placement?: string | null
          pre_gate_responses?: Json | null
          size?: string | null
          source?: string | null
          status?: string
          style_preference?: string | null
          subscription_type?: string
          tattoo_brief_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_spot_subscriptions_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "studio_artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_spot_subscriptions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_spot_subscriptions_converted_booking_id_fkey"
            columns: ["converted_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_spot_subscriptions_converted_booking_id_fkey"
            columns: ["converted_booking_id"]
            isOneToOne: false
            referencedRelation: "customer_booking_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_spot_subscriptions_tattoo_brief_id_fkey"
            columns: ["tattoo_brief_id"]
            isOneToOne: false
            referencedRelation: "tattoo_briefs"
            referencedColumns: ["id"]
          },
        ]
      }
      healing_certificates: {
        Row: {
          booking_id: string
          certificate_data: Json | null
          certificate_number: string | null
          created_at: string
          download_url: string | null
          final_health_score: number | null
          generated_at: string
          healing_duration_days: number | null
          id: string
          total_photos: number | null
        }
        Insert: {
          booking_id: string
          certificate_data?: Json | null
          certificate_number?: string | null
          created_at?: string
          download_url?: string | null
          final_health_score?: number | null
          generated_at?: string
          healing_duration_days?: number | null
          id?: string
          total_photos?: number | null
        }
        Update: {
          booking_id?: string
          certificate_data?: Json | null
          certificate_number?: string | null
          created_at?: string
          download_url?: string | null
          final_health_score?: number | null
          generated_at?: string
          healing_duration_days?: number | null
          id?: string
          total_photos?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "healing_certificates_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "healing_certificates_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "customer_booking_view"
            referencedColumns: ["id"]
          },
        ]
      }
      healing_progress: {
        Row: {
          ai_concerns: string[] | null
          ai_confidence: number | null
          ai_healing_stage: string | null
          ai_health_score: number | null
          ai_recommendations: string | null
          alert_acknowledged_at: string | null
          alert_sent_at: string | null
          artist_response: string | null
          booking_id: string | null
          client_notes: string | null
          client_profile_id: string | null
          created_at: string
          day_number: number
          id: string
          photo_url: string | null
          requires_attention: boolean | null
          session_id: string | null
        }
        Insert: {
          ai_concerns?: string[] | null
          ai_confidence?: number | null
          ai_healing_stage?: string | null
          ai_health_score?: number | null
          ai_recommendations?: string | null
          alert_acknowledged_at?: string | null
          alert_sent_at?: string | null
          artist_response?: string | null
          booking_id?: string | null
          client_notes?: string | null
          client_profile_id?: string | null
          created_at?: string
          day_number: number
          id?: string
          photo_url?: string | null
          requires_attention?: boolean | null
          session_id?: string | null
        }
        Update: {
          ai_concerns?: string[] | null
          ai_confidence?: number | null
          ai_healing_stage?: string | null
          ai_health_score?: number | null
          ai_recommendations?: string | null
          alert_acknowledged_at?: string | null
          alert_sent_at?: string | null
          artist_response?: string | null
          booking_id?: string | null
          client_notes?: string | null
          client_profile_id?: string | null
          created_at?: string
          day_number?: number
          id?: string
          photo_url?: string | null
          requires_attention?: boolean | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "healing_progress_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "healing_progress_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "customer_booking_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "healing_progress_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "healing_progress_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "session_history"
            referencedColumns: ["id"]
          },
        ]
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
      intake_windows: {
        Row: {
          artist_id: string | null
          closes_at: string
          created_at: string | null
          current_count: number | null
          description: string | null
          id: string
          is_active: boolean | null
          max_inquiries: number | null
          opens_at: string
          priority_access_emails: string[] | null
          updated_at: string | null
          window_name: string
        }
        Insert: {
          artist_id?: string | null
          closes_at: string
          created_at?: string | null
          current_count?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_inquiries?: number | null
          opens_at: string
          priority_access_emails?: string[] | null
          updated_at?: string | null
          window_name: string
        }
        Update: {
          artist_id?: string | null
          closes_at?: string
          created_at?: string | null
          current_count?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_inquiries?: number | null
          opens_at?: string
          priority_access_emails?: string[] | null
          updated_at?: string | null
          window_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "intake_windows_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "studio_artists"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_nurture_sequences: {
        Row: {
          ai_generated_content: Json | null
          client_email: string
          client_profile_id: string | null
          converted_booking_id: string | null
          created_at: string
          current_step: number | null
          id: string
          last_action_at: string | null
          next_action_at: string | null
          personalization_factors: Json | null
          sequence_type: string
          status: string | null
          total_steps: number | null
          unsubscribed_at: string | null
        }
        Insert: {
          ai_generated_content?: Json | null
          client_email: string
          client_profile_id?: string | null
          converted_booking_id?: string | null
          created_at?: string
          current_step?: number | null
          id?: string
          last_action_at?: string | null
          next_action_at?: string | null
          personalization_factors?: Json | null
          sequence_type: string
          status?: string | null
          total_steps?: number | null
          unsubscribed_at?: string | null
        }
        Update: {
          ai_generated_content?: Json | null
          client_email?: string
          client_profile_id?: string | null
          converted_booking_id?: string | null
          created_at?: string
          current_step?: number | null
          id?: string
          last_action_at?: string | null
          next_action_at?: string | null
          personalization_factors?: Json | null
          sequence_type?: string
          status?: string | null
          total_steps?: number | null
          unsubscribed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_nurture_sequences_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_nurture_sequences_converted_booking_id_fkey"
            columns: ["converted_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_nurture_sequences_converted_booking_id_fkey"
            columns: ["converted_booking_id"]
            isOneToOne: false
            referencedRelation: "customer_booking_view"
            referencedColumns: ["id"]
          },
        ]
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
      omnichannel_messages: {
        Row: {
          ai_entities_extracted: Json | null
          ai_intent_detected: string | null
          ai_processed: boolean | null
          ai_response_generated: boolean | null
          ai_sentiment: string | null
          booking_id: string | null
          channel: string
          channel_conversation_id: string | null
          channel_message_id: string | null
          client_profile_id: string | null
          content: string | null
          conversation_id: string | null
          created_at: string
          direction: string
          escalated_to_human: boolean | null
          escalation_reason: string | null
          id: string
          media_urls: string[] | null
          message_type: string | null
          status: string | null
        }
        Insert: {
          ai_entities_extracted?: Json | null
          ai_intent_detected?: string | null
          ai_processed?: boolean | null
          ai_response_generated?: boolean | null
          ai_sentiment?: string | null
          booking_id?: string | null
          channel: string
          channel_conversation_id?: string | null
          channel_message_id?: string | null
          client_profile_id?: string | null
          content?: string | null
          conversation_id?: string | null
          created_at?: string
          direction: string
          escalated_to_human?: boolean | null
          escalation_reason?: string | null
          id?: string
          media_urls?: string[] | null
          message_type?: string | null
          status?: string | null
        }
        Update: {
          ai_entities_extracted?: Json | null
          ai_intent_detected?: string | null
          ai_processed?: boolean | null
          ai_response_generated?: boolean | null
          ai_sentiment?: string | null
          booking_id?: string | null
          channel?: string
          channel_conversation_id?: string | null
          channel_message_id?: string | null
          client_profile_id?: string | null
          content?: string | null
          conversation_id?: string | null
          created_at?: string
          direction?: string
          escalated_to_human?: boolean | null
          escalation_reason?: string | null
          id?: string
          media_urls?: string[] | null
          message_type?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "omnichannel_messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "omnichannel_messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "customer_booking_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "omnichannel_messages_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "omnichannel_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_progress: {
        Row: {
          completed_at: string | null
          created_at: string | null
          current_step: string
          form_data: Json | null
          id: string
          steps_completed: string[] | null
          updated_at: string | null
          user_id: string | null
          wizard_type: string
          workspace_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          current_step: string
          form_data?: Json | null
          id?: string
          steps_completed?: string[] | null
          updated_at?: string | null
          user_id?: string | null
          wizard_type: string
          workspace_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          current_step?: string
          form_data?: Json | null
          id?: string
          steps_completed?: string[] | null
          updated_at?: string | null
          user_id?: string | null
          wizard_type?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_progress_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspace_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_acceptances: {
        Row: {
          acceptance_method: string | null
          accepted_at: string
          booking_id: string | null
          client_email: string
          id: string
          ip_address: string | null
          policy_version_id: string | null
          user_agent: string | null
        }
        Insert: {
          acceptance_method?: string | null
          accepted_at?: string
          booking_id?: string | null
          client_email: string
          id?: string
          ip_address?: string | null
          policy_version_id?: string | null
          user_agent?: string | null
        }
        Update: {
          acceptance_method?: string | null
          accepted_at?: string
          booking_id?: string | null
          client_email?: string
          id?: string
          ip_address?: string | null
          policy_version_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "policy_acceptances_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_acceptances_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "customer_booking_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_acceptances_policy_version_id_fkey"
            columns: ["policy_version_id"]
            isOneToOne: false
            referencedRelation: "studio_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_audit_log: {
        Row: {
          action: string
          changed_by: string | null
          changed_by_role: string | null
          changes_diff: Json | null
          entity_id: string
          entity_type: string
          id: string
          metadata: Json | null
          occurred_at: string | null
          reason: string | null
        }
        Insert: {
          action: string
          changed_by?: string | null
          changed_by_role?: string | null
          changes_diff?: Json | null
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json | null
          occurred_at?: string | null
          reason?: string | null
        }
        Update: {
          action?: string
          changed_by?: string | null
          changed_by_role?: string | null
          changes_diff?: Json | null
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json | null
          occurred_at?: string | null
          reason?: string | null
        }
        Relationships: []
      }
      policy_overrides: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          booking_id: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          original_decision: string
          overridden_rule_id: string
          override_decision: string
          reason: string
          requested_at: string | null
          requested_by: string | null
          tattoo_brief_id: string | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          booking_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          original_decision: string
          overridden_rule_id: string
          override_decision: string
          reason: string
          requested_at?: string | null
          requested_by?: string | null
          tattoo_brief_id?: string | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          booking_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          original_decision?: string
          overridden_rule_id?: string
          override_decision?: string
          reason?: string
          requested_at?: string | null
          requested_by?: string | null
          tattoo_brief_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "policy_overrides_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_overrides_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "customer_booking_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_overrides_tattoo_brief_id_fkey"
            columns: ["tattoo_brief_id"]
            isOneToOne: false
            referencedRelation: "tattoo_briefs"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_rules: {
        Row: {
          action: Json
          condition_json: Json
          created_at: string | null
          created_by: string | null
          description: string | null
          enabled: boolean | null
          explain_internal: string
          explain_public: string
          id: string
          name: string
          priority: number | null
          rule_id: string
          scope_id: string | null
          scope_type: string
          updated_at: string | null
          warning_key: string | null
        }
        Insert: {
          action: Json
          condition_json: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          enabled?: boolean | null
          explain_internal: string
          explain_public: string
          id?: string
          name: string
          priority?: number | null
          rule_id: string
          scope_id?: string | null
          scope_type: string
          updated_at?: string | null
          warning_key?: string | null
        }
        Update: {
          action?: Json
          condition_json?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          enabled?: boolean | null
          explain_internal?: string
          explain_public?: string
          id?: string
          name?: string
          priority?: number | null
          rule_id?: string
          scope_id?: string | null
          scope_type?: string
          updated_at?: string | null
          warning_key?: string | null
        }
        Relationships: []
      }
      policy_warnings: {
        Row: {
          artist_note: string | null
          client_message: string
          created_at: string | null
          id: string
          is_active: boolean | null
          severity: string | null
          updated_at: string | null
          warning_key: string
          warning_title: string
        }
        Insert: {
          artist_note?: string | null
          client_message: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          severity?: string | null
          updated_at?: string | null
          warning_key: string
          warning_title: string
        }
        Update: {
          artist_note?: string | null
          client_message?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          severity?: string | null
          updated_at?: string | null
          warning_key?: string
          warning_title?: string
        }
        Relationships: []
      }
      portfolio_exemplars: {
        Row: {
          artist_id: string
          created_at: string | null
          description: string | null
          display_order: number | null
          exemplar_type: string
          id: string
          image_url: string
          is_active: boolean | null
          mood_tags: string[] | null
          style_tags: string[] | null
          subject_tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          artist_id: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          exemplar_type: string
          id?: string
          image_url: string
          is_active?: boolean | null
          mood_tags?: string[] | null
          style_tags?: string[] | null
          subject_tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          artist_id?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          exemplar_type?: string
          id?: string
          image_url?: string
          is_active?: boolean | null
          mood_tags?: string[] | null
          style_tags?: string[] | null
          subject_tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_exemplars_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "studio_artists"
            referencedColumns: ["id"]
          },
        ]
      }
      pre_gate_questions: {
        Row: {
          artist_id: string | null
          block_on_value: boolean | null
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          is_required: boolean | null
          question_key: string
          question_text: string
          targets_field: string
          updated_at: string | null
        }
        Insert: {
          artist_id?: string | null
          block_on_value?: boolean | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          question_key: string
          question_text: string
          targets_field: string
          updated_at?: string | null
        }
        Update: {
          artist_id?: string | null
          block_on_value?: boolean | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          question_key?: string
          question_text?: string
          targets_field?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pre_gate_questions_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "studio_artists"
            referencedColumns: ["id"]
          },
        ]
      }
      pre_gate_responses: {
        Row: {
          block_reasons: Json | null
          blocked_by: string[] | null
          conversation_id: string | null
          created_at: string | null
          gate_passed: boolean | null
          id: string
          responses: Json
          session_id: string | null
        }
        Insert: {
          block_reasons?: Json | null
          blocked_by?: string[] | null
          conversation_id?: string | null
          created_at?: string | null
          gate_passed?: boolean | null
          id?: string
          responses?: Json
          session_id?: string | null
        }
        Update: {
          block_reasons?: Json | null
          blocked_by?: string[] | null
          conversation_id?: string | null
          created_at?: string | null
          gate_passed?: boolean | null
          id?: string
          responses?: Json
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pre_gate_responses_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      prep_reminders: {
        Row: {
          acknowledged_at: string | null
          booking_id: string
          content: string
          created_at: string
          id: string
          placement_specific: boolean | null
          reminder_type: string
          scheduled_for: string
          sent_at: string | null
          status: string | null
          title: string
        }
        Insert: {
          acknowledged_at?: string | null
          booking_id: string
          content: string
          created_at?: string
          id?: string
          placement_specific?: boolean | null
          reminder_type: string
          scheduled_for: string
          sent_at?: string | null
          status?: string | null
          title: string
        }
        Update: {
          acknowledged_at?: string | null
          booking_id?: string
          content?: string
          created_at?: string
          id?: string
          placement_specific?: boolean | null
          reminder_type?: string
          scheduled_for?: string
          sent_at?: string | null
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "prep_reminders_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prep_reminders_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "customer_booking_view"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_links: {
        Row: {
          booking_id: string | null
          client_profile_id: string | null
          code: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          reward_earned: number | null
          successful_bookings: number | null
          updated_at: string
          uses: number | null
        }
        Insert: {
          booking_id?: string | null
          client_profile_id?: string | null
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          reward_earned?: number | null
          successful_bookings?: number | null
          updated_at?: string
          uses?: number | null
        }
        Update: {
          booking_id?: string | null
          client_profile_id?: string | null
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          reward_earned?: number | null
          successful_bookings?: number | null
          updated_at?: string
          uses?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_links_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_links_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "customer_booking_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_links_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
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
      resource_bookings: {
        Row: {
          booking_id: string | null
          calendar_event_id: string | null
          created_at: string | null
          end_time: string
          id: string
          notes: string | null
          resource_id: string
          start_time: string
        }
        Insert: {
          booking_id?: string | null
          calendar_event_id?: string | null
          created_at?: string | null
          end_time: string
          id?: string
          notes?: string | null
          resource_id: string
          start_time: string
        }
        Update: {
          booking_id?: string | null
          calendar_event_id?: string | null
          created_at?: string | null
          end_time?: string
          id?: string
          notes?: string | null
          resource_id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_bookings_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_bookings_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "customer_booking_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_bookings_calendar_event_id_fkey"
            columns: ["calendar_event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_bookings_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "studio_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_events: {
        Row: {
          booking_id: string | null
          client_profile_id: string | null
          created_at: string | null
          description: string | null
          event_type: string
          id: string
          occurred_at: string | null
          resolved: boolean | null
          resolved_at: string | null
          severity: number | null
        }
        Insert: {
          booking_id?: string | null
          client_profile_id?: string | null
          created_at?: string | null
          description?: string | null
          event_type: string
          id?: string
          occurred_at?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          severity?: number | null
        }
        Update: {
          booking_id?: string | null
          client_profile_id?: string | null
          created_at?: string | null
          description?: string | null
          event_type?: string
          id?: string
          occurred_at?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          severity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "customer_booking_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_events_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_scores: {
        Row: {
          booking_id: string
          calculated_at: string
          created_at: string
          factors: Json | null
          id: string
          recommended_actions: string[] | null
          risk_level: string
          score: number
        }
        Insert: {
          booking_id: string
          calculated_at?: string
          created_at?: string
          factors?: Json | null
          id?: string
          recommended_actions?: string[] | null
          risk_level: string
          score: number
        }
        Update: {
          booking_id?: string
          calculated_at?: string
          created_at?: string
          factors?: Json | null
          id?: string
          recommended_actions?: string[] | null
          risk_level?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "risk_scores_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_scores_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "customer_booking_view"
            referencedColumns: ["id"]
          },
        ]
      }
      rule_evaluation_results: {
        Row: {
          booking_id: string | null
          context: Json
          conversation_id: string | null
          errors: string[] | null
          evaluated_at: string | null
          evaluated_rules: Json | null
          evaluation_id: string
          final_decision: string
          final_reasons: Json | null
          id: string
          input_snapshot: Json
          matching: Json | null
          next_actions: Json | null
          structured_intent_id: string | null
          tattoo_brief_id: string | null
        }
        Insert: {
          booking_id?: string | null
          context: Json
          conversation_id?: string | null
          errors?: string[] | null
          evaluated_at?: string | null
          evaluated_rules?: Json | null
          evaluation_id: string
          final_decision: string
          final_reasons?: Json | null
          id?: string
          input_snapshot: Json
          matching?: Json | null
          next_actions?: Json | null
          structured_intent_id?: string | null
          tattoo_brief_id?: string | null
        }
        Update: {
          booking_id?: string | null
          context?: Json
          conversation_id?: string | null
          errors?: string[] | null
          evaluated_at?: string | null
          evaluated_rules?: Json | null
          evaluation_id?: string
          final_decision?: string
          final_reasons?: Json | null
          id?: string
          input_snapshot?: Json
          matching?: Json | null
          next_actions?: Json | null
          structured_intent_id?: string | null
          tattoo_brief_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rule_evaluation_results_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rule_evaluation_results_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "customer_booking_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rule_evaluation_results_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rule_evaluation_results_structured_intent_id_fkey"
            columns: ["structured_intent_id"]
            isOneToOne: false
            referencedRelation: "structured_intents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rule_evaluation_results_tattoo_brief_id_fkey"
            columns: ["tattoo_brief_id"]
            isOneToOne: false
            referencedRelation: "tattoo_briefs"
            referencedColumns: ["id"]
          },
        ]
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
      services: {
        Row: {
          buffer_after_min: number
          buffer_before_min: number
          created_at: string
          deposit_amount: number
          description: string | null
          duration_minutes: number
          extra_after_buffer_min: number | null
          id: string
          is_active: boolean
          name: string
          service_key: string
          settings: Json | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          buffer_after_min?: number
          buffer_before_min?: number
          created_at?: string
          deposit_amount?: number
          description?: string | null
          duration_minutes: number
          extra_after_buffer_min?: number | null
          id?: string
          is_active?: boolean
          name: string
          service_key: string
          settings?: Json | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          buffer_after_min?: number
          buffer_before_min?: number
          created_at?: string
          deposit_amount?: number
          description?: string | null
          duration_minutes?: number
          extra_after_buffer_min?: number | null
          id?: string
          is_active?: boolean
          name?: string
          service_key?: string
          settings?: Json | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      session_history: {
        Row: {
          after_photos: string[] | null
          artist_notes: string | null
          before_photos: string[] | null
          booking_id: string | null
          client_feedback: string | null
          client_profile_id: string | null
          colors_used: string[] | null
          complexity_score: number | null
          created_at: string
          deposit_paid: number | null
          design_description: string | null
          design_style: string | null
          id: string
          placement: string | null
          predicted_healing_days: number | null
          reference_images: string[] | null
          satisfaction_score: number | null
          session_date: string
          session_duration_minutes: number | null
          session_rate: number | null
          size_inches: number | null
          tip_amount: number | null
          total_paid: number | null
          updated_at: string
        }
        Insert: {
          after_photos?: string[] | null
          artist_notes?: string | null
          before_photos?: string[] | null
          booking_id?: string | null
          client_feedback?: string | null
          client_profile_id?: string | null
          colors_used?: string[] | null
          complexity_score?: number | null
          created_at?: string
          deposit_paid?: number | null
          design_description?: string | null
          design_style?: string | null
          id?: string
          placement?: string | null
          predicted_healing_days?: number | null
          reference_images?: string[] | null
          satisfaction_score?: number | null
          session_date: string
          session_duration_minutes?: number | null
          session_rate?: number | null
          size_inches?: number | null
          tip_amount?: number | null
          total_paid?: number | null
          updated_at?: string
        }
        Update: {
          after_photos?: string[] | null
          artist_notes?: string | null
          before_photos?: string[] | null
          booking_id?: string | null
          client_feedback?: string | null
          client_profile_id?: string | null
          colors_used?: string[] | null
          complexity_score?: number | null
          created_at?: string
          deposit_paid?: number | null
          design_description?: string | null
          design_style?: string | null
          id?: string
          placement?: string | null
          predicted_healing_days?: number | null
          reference_images?: string[] | null
          satisfaction_score?: number | null
          session_date?: string
          session_duration_minutes?: number | null
          session_rate?: number | null
          size_inches?: number | null
          tip_amount?: number | null
          total_paid?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_history_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_history_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "customer_booking_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_history_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      slot_holds: {
        Row: {
          availability_id: string | null
          booking_id: string | null
          city_id: string | null
          client_name: string | null
          conversation_id: string | null
          converted_at: string | null
          created_at: string
          expires_at: string
          google_calendar_event_id: string | null
          held_at: string
          held_date: string
          held_time_slot: Json | null
          id: string
          status: string | null
        }
        Insert: {
          availability_id?: string | null
          booking_id?: string | null
          city_id?: string | null
          client_name?: string | null
          conversation_id?: string | null
          converted_at?: string | null
          created_at?: string
          expires_at?: string
          google_calendar_event_id?: string | null
          held_at?: string
          held_date: string
          held_time_slot?: Json | null
          id?: string
          status?: string | null
        }
        Update: {
          availability_id?: string | null
          booking_id?: string | null
          city_id?: string | null
          client_name?: string | null
          conversation_id?: string | null
          converted_at?: string | null
          created_at?: string
          expires_at?: string
          google_calendar_event_id?: string | null
          held_at?: string
          held_date?: string
          held_time_slot?: Json | null
          id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "slot_holds_availability_id_fkey"
            columns: ["availability_id"]
            isOneToOne: false
            referencedRelation: "availability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slot_holds_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slot_holds_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "customer_booking_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slot_holds_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "city_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slot_holds_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      structured_intents: {
        Row: {
          budget: Json | null
          complexity: Json | null
          contradictions: Json | null
          conversation_id: string | null
          created_at: string | null
          deadline: Json | null
          declared: Json | null
          estimated_hours: Json | null
          followup_questions: Json | null
          id: string
          inferred: Json | null
          language: string | null
          missing_fields: string[] | null
          notes: string | null
          overall_confidence: number | null
          risk_flags: Json | null
          styles_detected: Json | null
          tattoo_brief_id: string | null
          updated_at: string | null
          version: string | null
          work_type: Json | null
        }
        Insert: {
          budget?: Json | null
          complexity?: Json | null
          contradictions?: Json | null
          conversation_id?: string | null
          created_at?: string | null
          deadline?: Json | null
          declared?: Json | null
          estimated_hours?: Json | null
          followup_questions?: Json | null
          id?: string
          inferred?: Json | null
          language?: string | null
          missing_fields?: string[] | null
          notes?: string | null
          overall_confidence?: number | null
          risk_flags?: Json | null
          styles_detected?: Json | null
          tattoo_brief_id?: string | null
          updated_at?: string | null
          version?: string | null
          work_type?: Json | null
        }
        Update: {
          budget?: Json | null
          complexity?: Json | null
          contradictions?: Json | null
          conversation_id?: string | null
          created_at?: string | null
          deadline?: Json | null
          declared?: Json | null
          estimated_hours?: Json | null
          followup_questions?: Json | null
          id?: string
          inferred?: Json | null
          language?: string | null
          missing_fields?: string[] | null
          notes?: string | null
          overall_confidence?: number | null
          risk_flags?: Json | null
          styles_detected?: Json | null
          tattoo_brief_id?: string | null
          updated_at?: string | null
          version?: string | null
          work_type?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "structured_intents_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "structured_intents_tattoo_brief_id_fkey"
            columns: ["tattoo_brief_id"]
            isOneToOne: false
            referencedRelation: "tattoo_briefs"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_artists: {
        Row: {
          availability_mode: string | null
          bio: string | null
          books_open_until: string | null
          books_status: string | null
          buffer_minutes: number | null
          created_at: string | null
          current_queue_size: number | null
          default_session_hours: number | null
          display_name: string | null
          email: string | null
          id: string
          instagram_handle: string | null
          is_active: boolean | null
          is_guest_artist: boolean | null
          is_primary: boolean | null
          max_queue_size: number | null
          max_sessions_per_day: number | null
          name: string
          phone: string | null
          portfolio_url: string | null
          profile_image_url: string | null
          specialty_styles: string[] | null
          updated_at: string | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          availability_mode?: string | null
          bio?: string | null
          books_open_until?: string | null
          books_status?: string | null
          buffer_minutes?: number | null
          created_at?: string | null
          current_queue_size?: number | null
          default_session_hours?: number | null
          display_name?: string | null
          email?: string | null
          id?: string
          instagram_handle?: string | null
          is_active?: boolean | null
          is_guest_artist?: boolean | null
          is_primary?: boolean | null
          max_queue_size?: number | null
          max_sessions_per_day?: number | null
          name: string
          phone?: string | null
          portfolio_url?: string | null
          profile_image_url?: string | null
          specialty_styles?: string[] | null
          updated_at?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          availability_mode?: string | null
          bio?: string | null
          books_open_until?: string | null
          books_status?: string | null
          buffer_minutes?: number | null
          created_at?: string | null
          current_queue_size?: number | null
          default_session_hours?: number | null
          display_name?: string | null
          email?: string | null
          id?: string
          instagram_handle?: string | null
          is_active?: boolean | null
          is_guest_artist?: boolean | null
          is_primary?: boolean | null
          max_queue_size?: number | null
          max_sessions_per_day?: number | null
          name?: string
          phone?: string | null
          portfolio_url?: string | null
          profile_image_url?: string | null
          specialty_styles?: string[] | null
          updated_at?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "studio_artists_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspace_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_booking_rules: {
        Row: {
          applies_to_artists: string[] | null
          created_at: string | null
          error_message: string | null
          id: string
          is_active: boolean | null
          priority: number | null
          rule_category: string
          rule_description: string
          rule_key: string
          rule_name: string
          rule_value: Json
          updated_at: string | null
        }
        Insert: {
          applies_to_artists?: string[] | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          rule_category: string
          rule_description: string
          rule_key: string
          rule_name: string
          rule_value: Json
          updated_at?: string | null
        }
        Update: {
          applies_to_artists?: string[] | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          rule_category?: string
          rule_description?: string
          rule_key?: string
          rule_name?: string
          rule_value?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      studio_permissions: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_granted: boolean | null
          permission_key: string
          permission_name: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_granted?: boolean | null
          permission_key: string
          permission_name: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_granted?: boolean | null
          permission_key?: string
          permission_name?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      studio_policies: {
        Row: {
          artist_id: string | null
          created_at: string
          full_policy_text: string | null
          id: string
          is_active: boolean
          settings: Json
          summary_text: string | null
          updated_at: string
          version: number
        }
        Insert: {
          artist_id?: string | null
          created_at?: string
          full_policy_text?: string | null
          id?: string
          is_active?: boolean
          settings?: Json
          summary_text?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          artist_id?: string | null
          created_at?: string
          full_policy_text?: string | null
          id?: string
          is_active?: boolean
          settings?: Json
          summary_text?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "studio_policies_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "studio_artists"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_resources: {
        Row: {
          capacity: number | null
          city_id: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          resource_name: string
          resource_type: string
          updated_at: string | null
        }
        Insert: {
          capacity?: number | null
          city_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          resource_name: string
          resource_type: string
          updated_at?: string | null
        }
        Update: {
          capacity?: number | null
          city_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          resource_name?: string
          resource_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "studio_resources_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "city_configurations"
            referencedColumns: ["id"]
          },
        ]
      }
      style_fit_scores: {
        Row: {
          artist_id: string
          booking_id: string | null
          calculated_at: string | null
          conflicting_exemplars: string[] | null
          detailed_analysis: Json | null
          explanation: string | null
          id: string
          matched_exemplars: string[] | null
          mood_match_score: number | null
          overall_score: number
          style_match_score: number | null
          subject_match_score: number | null
          tattoo_brief_id: string | null
        }
        Insert: {
          artist_id: string
          booking_id?: string | null
          calculated_at?: string | null
          conflicting_exemplars?: string[] | null
          detailed_analysis?: Json | null
          explanation?: string | null
          id?: string
          matched_exemplars?: string[] | null
          mood_match_score?: number | null
          overall_score: number
          style_match_score?: number | null
          subject_match_score?: number | null
          tattoo_brief_id?: string | null
        }
        Update: {
          artist_id?: string
          booking_id?: string | null
          calculated_at?: string | null
          conflicting_exemplars?: string[] | null
          detailed_analysis?: Json | null
          explanation?: string | null
          id?: string
          matched_exemplars?: string[] | null
          mood_match_score?: number | null
          overall_score?: number
          style_match_score?: number | null
          subject_match_score?: number | null
          tattoo_brief_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "style_fit_scores_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "studio_artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "style_fit_scores_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "style_fit_scores_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "customer_booking_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "style_fit_scores_tattoo_brief_id_fkey"
            columns: ["tattoo_brief_id"]
            isOneToOne: false
            referencedRelation: "tattoo_briefs"
            referencedColumns: ["id"]
          },
        ]
      }
      tattoo_briefs: {
        Row: {
          assigned_artist_id: string | null
          booking_id: string | null
          client_profile_id: string | null
          color_type: string | null
          constraints: Json | null
          conversation_id: string | null
          created_at: string
          estimated_sessions_needed: number | null
          fit_reasoning: string | null
          fit_score: number | null
          id: string
          missing_info: string[] | null
          mood_keywords: string[] | null
          placement: string | null
          placement_photo_url: string | null
          reference_image_urls: string[] | null
          session_estimate_hours_max: number | null
          session_estimate_hours_min: number | null
          size_estimate_inches_max: number | null
          size_estimate_inches_min: number | null
          status: string | null
          style: string | null
          style_confidence: number | null
          subject: string | null
          updated_at: string
        }
        Insert: {
          assigned_artist_id?: string | null
          booking_id?: string | null
          client_profile_id?: string | null
          color_type?: string | null
          constraints?: Json | null
          conversation_id?: string | null
          created_at?: string
          estimated_sessions_needed?: number | null
          fit_reasoning?: string | null
          fit_score?: number | null
          id?: string
          missing_info?: string[] | null
          mood_keywords?: string[] | null
          placement?: string | null
          placement_photo_url?: string | null
          reference_image_urls?: string[] | null
          session_estimate_hours_max?: number | null
          session_estimate_hours_min?: number | null
          size_estimate_inches_max?: number | null
          size_estimate_inches_min?: number | null
          status?: string | null
          style?: string | null
          style_confidence?: number | null
          subject?: string | null
          updated_at?: string
        }
        Update: {
          assigned_artist_id?: string | null
          booking_id?: string | null
          client_profile_id?: string | null
          color_type?: string | null
          constraints?: Json | null
          conversation_id?: string | null
          created_at?: string
          estimated_sessions_needed?: number | null
          fit_reasoning?: string | null
          fit_score?: number | null
          id?: string
          missing_info?: string[] | null
          mood_keywords?: string[] | null
          placement?: string | null
          placement_photo_url?: string | null
          reference_image_urls?: string[] | null
          session_estimate_hours_max?: number | null
          session_estimate_hours_min?: number | null
          size_estimate_inches_max?: number | null
          size_estimate_inches_min?: number | null
          status?: string | null
          style?: string | null
          style_confidence?: number | null
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tattoo_briefs_assigned_artist_id_fkey"
            columns: ["assigned_artist_id"]
            isOneToOne: false
            referencedRelation: "studio_artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tattoo_briefs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tattoo_briefs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "customer_booking_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tattoo_briefs_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tattoo_briefs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      tattoo_style_catalog: {
        Row: {
          category: string
          complexity_level: number | null
          created_at: string | null
          description: string | null
          display_name: string
          id: string
          is_active: boolean | null
          parent_style_key: string | null
          related_styles: string[] | null
          requires_color: boolean | null
          style_key: string
          typical_duration_hours_max: number | null
          typical_duration_hours_min: number | null
        }
        Insert: {
          category?: string
          complexity_level?: number | null
          created_at?: string | null
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          parent_style_key?: string | null
          related_styles?: string[] | null
          requires_color?: boolean | null
          style_key: string
          typical_duration_hours_max?: number | null
          typical_duration_hours_min?: number | null
        }
        Update: {
          category?: string
          complexity_level?: number | null
          created_at?: string | null
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          parent_style_key?: string | null
          related_styles?: string[] | null
          requires_color?: boolean | null
          style_key?: string
          typical_duration_hours_max?: number | null
          typical_duration_hours_min?: number | null
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
      voice_profiles: {
        Row: {
          artist_id: string
          created_at: string
          default_language: string | null
          do_rules: Json | null
          dont_rules: Json | null
          id: string
          is_active: boolean | null
          max_questions_per_message: number | null
          signature_phrases: Json | null
          tone: string[] | null
          updated_at: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          default_language?: string | null
          do_rules?: Json | null
          dont_rules?: Json | null
          id?: string
          is_active?: boolean | null
          max_questions_per_message?: number | null
          signature_phrases?: Json | null
          tone?: string[] | null
          updated_at?: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          default_language?: string | null
          do_rules?: Json | null
          dont_rules?: Json | null
          id?: string
          is_active?: boolean | null
          max_questions_per_message?: number | null
          signature_phrases?: Json | null
          tone?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_profiles_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: true
            referencedRelation: "studio_artists"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          accepted_at: string | null
          artist_id: string | null
          created_at: string | null
          id: string
          invited_at: string | null
          invited_by: string | null
          is_active: boolean | null
          permissions: Json | null
          role: string
          updated_at: string | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          artist_id?: string | null
          created_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          permissions?: Json | null
          role: string
          updated_at?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          artist_id?: string | null
          created_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          permissions?: Json | null
          role?: string
          updated_at?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "studio_artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspace_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_settings: {
        Row: {
          brand_tone: string
          created_at: string
          currency: string
          id: string
          locale: string
          onboarding_completed: boolean | null
          owner_user_id: string | null
          primary_timezone: string | null
          settings: Json
          setup_step: string | null
          updated_at: string
          workspace_name: string
          workspace_type: string | null
        }
        Insert: {
          brand_tone?: string
          created_at?: string
          currency?: string
          id?: string
          locale?: string
          onboarding_completed?: boolean | null
          owner_user_id?: string | null
          primary_timezone?: string | null
          settings?: Json
          setup_step?: string | null
          updated_at?: string
          workspace_name?: string
          workspace_type?: string | null
        }
        Update: {
          brand_tone?: string
          created_at?: string
          currency?: string
          id?: string
          locale?: string
          onboarding_completed?: boolean | null
          owner_user_id?: string | null
          primary_timezone?: string | null
          settings?: Json
          setup_step?: string | null
          updated_at?: string
          workspace_name?: string
          workspace_type?: string | null
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
      check_user_onboarding: {
        Args: { p_user_id: string }
        Returns: {
          current_step: string
          needs_onboarding: boolean
          wizard_type: string
        }[]
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
      expire_slot_holds: { Args: never; Returns: undefined }
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
      get_user_workspace_role: {
        Args: { p_user_id: string }
        Returns: {
          artist_id: string
          permissions: Json
          role: string
          workspace_id: string
          workspace_type: string
        }[]
      }
      has_permission: {
        Args: { _permission_key: string; _user_id: string }
        Returns: boolean
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
      app_role: "admin" | "user" | "artist" | "manager" | "assistant"
      decision_type: "ALLOW" | "REVIEW" | "BLOCK"
      decline_reason_code:
        | "style_mismatch"
        | "color_requested"
        | "coverup_not_offered"
        | "touchup_not_offered"
        | "rework_not_offered"
        | "repeat_not_offered"
        | "too_small_for_detail"
        | "outside_specialty"
        | "budget_mismatch"
        | "deadline_mismatch"
        | "medical_review_required"
        | "content_policy_review"
        | "age_verification_required"
        | "schedule_full"
        | "insufficient_info"
        | "other"
      deposit_state:
        | "required"
        | "pending"
        | "paid"
        | "credited"
        | "applied"
        | "forfeited"
        | "refunded"
        | "waived"
      next_action_type:
        | "ASK_FOLLOWUPS"
        | "REQUEST_REFERENCE_IMAGES"
        | "REQUEST_PLACEMENT_PHOTO"
        | "REQUEST_ID"
        | "REQUEST_CONSENT"
        | "OFFER_CONSULT"
        | "OFFER_WAITLIST"
        | "ROUTE_TO_ARTIST"
        | "ROUTE_TO_ADMIN"
        | "REROUTE_TO_OTHER_ARTIST"
        | "SHOW_AVAILABILITY"
        | "BOOK_DAY"
        | "BOOK_SLOT"
        | "COLLECT_DEPOSIT"
        | "SEND_DEPOSIT_LINK"
        | "CLOSE_OUT"
      policy_decision: "ALLOW" | "REVIEW" | "BLOCK" | "ALLOW_WITH_WARNING"
      risk_flag_enum:
        | "low_confidence"
        | "contradiction_detected"
        | "unclear_placement_photo"
        | "missing_reference_images"
        | "tiny_size_for_detail"
        | "deadline_urgent"
        | "budget_low"
        | "medical_review_required"
        | "content_policy_review"
        | "age_verification_required"
        | "possible_coverup_hidden"
        | "possible_repeat"
        | "possible_touchup"
        | "high_complexity"
        | "calendar_conflict"
        | "requires_artist_review"
      scope_type: "studio" | "location" | "artist" | "serviceType" | "resource"
      session_model_type:
        | "timed_slots"
        | "day_session"
        | "consult_first"
        | "multi_session_plan"
      style_tag_enum:
        | "black_and_grey_realism"
        | "micro_realism"
        | "portrait_realism"
        | "realism"
        | "fine_line"
        | "single_needle"
        | "blackwork"
        | "dotwork"
        | "script"
        | "geometric"
        | "illustrative"
        | "anime"
        | "american_traditional"
        | "neo_traditional"
        | "irezumi"
        | "watercolor"
        | "new_school"
        | "color_realism"
        | "tribal"
        | "ornamental"
        | "minimalist"
        | "surrealism"
        | "chicano"
        | "unknown"
      trust_tier_enum: "new" | "standard" | "trusted" | "restricted"
      work_type_enum:
        | "new_original"
        | "cover_up"
        | "touch_up_own_work"
        | "touch_up_other_artist"
        | "rework"
        | "repeat_design"
        | "flash"
        | "consult_only"
        | "unknown"
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
      app_role: ["admin", "user", "artist", "manager", "assistant"],
      decision_type: ["ALLOW", "REVIEW", "BLOCK"],
      decline_reason_code: [
        "style_mismatch",
        "color_requested",
        "coverup_not_offered",
        "touchup_not_offered",
        "rework_not_offered",
        "repeat_not_offered",
        "too_small_for_detail",
        "outside_specialty",
        "budget_mismatch",
        "deadline_mismatch",
        "medical_review_required",
        "content_policy_review",
        "age_verification_required",
        "schedule_full",
        "insufficient_info",
        "other",
      ],
      deposit_state: [
        "required",
        "pending",
        "paid",
        "credited",
        "applied",
        "forfeited",
        "refunded",
        "waived",
      ],
      next_action_type: [
        "ASK_FOLLOWUPS",
        "REQUEST_REFERENCE_IMAGES",
        "REQUEST_PLACEMENT_PHOTO",
        "REQUEST_ID",
        "REQUEST_CONSENT",
        "OFFER_CONSULT",
        "OFFER_WAITLIST",
        "ROUTE_TO_ARTIST",
        "ROUTE_TO_ADMIN",
        "REROUTE_TO_OTHER_ARTIST",
        "SHOW_AVAILABILITY",
        "BOOK_DAY",
        "BOOK_SLOT",
        "COLLECT_DEPOSIT",
        "SEND_DEPOSIT_LINK",
        "CLOSE_OUT",
      ],
      policy_decision: ["ALLOW", "REVIEW", "BLOCK", "ALLOW_WITH_WARNING"],
      risk_flag_enum: [
        "low_confidence",
        "contradiction_detected",
        "unclear_placement_photo",
        "missing_reference_images",
        "tiny_size_for_detail",
        "deadline_urgent",
        "budget_low",
        "medical_review_required",
        "content_policy_review",
        "age_verification_required",
        "possible_coverup_hidden",
        "possible_repeat",
        "possible_touchup",
        "high_complexity",
        "calendar_conflict",
        "requires_artist_review",
      ],
      scope_type: ["studio", "location", "artist", "serviceType", "resource"],
      session_model_type: [
        "timed_slots",
        "day_session",
        "consult_first",
        "multi_session_plan",
      ],
      style_tag_enum: [
        "black_and_grey_realism",
        "micro_realism",
        "portrait_realism",
        "realism",
        "fine_line",
        "single_needle",
        "blackwork",
        "dotwork",
        "script",
        "geometric",
        "illustrative",
        "anime",
        "american_traditional",
        "neo_traditional",
        "irezumi",
        "watercolor",
        "new_school",
        "color_realism",
        "tribal",
        "ornamental",
        "minimalist",
        "surrealism",
        "chicano",
        "unknown",
      ],
      trust_tier_enum: ["new", "standard", "trusted", "restricted"],
      work_type_enum: [
        "new_original",
        "cover_up",
        "touch_up_own_work",
        "touch_up_other_artist",
        "rework",
        "repeat_design",
        "flash",
        "consult_only",
        "unknown",
      ],
    },
  },
} as const
