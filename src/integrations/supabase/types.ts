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
      ab_rollouts: {
        Row: {
          created_at: string | null
          id: string
          key: string
          status: string | null
          traffic_split_json: Json | null
          variants_json: Json
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          status?: string | null
          traffic_split_json?: Json | null
          variants_json: Json
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          status?: string | null
          traffic_split_json?: Json | null
          variants_json?: Json
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ab_rollouts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspace_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_decisions_log: {
        Row: {
          artist_correction: string | null
          artist_review_status: string | null
          artist_reviewed_at: string | null
          artist_reviewer_id: string | null
          client_satisfaction_signals: string | null
          conversation_id: string | null
          created_at: string
          decision_type: string
          id: string
          match_score: number | null
          reasoning: string
          risk_score: number | null
          training_vector: Json | null
          updated_at: string
          used_for_training: boolean | null
        }
        Insert: {
          artist_correction?: string | null
          artist_review_status?: string | null
          artist_reviewed_at?: string | null
          artist_reviewer_id?: string | null
          client_satisfaction_signals?: string | null
          conversation_id?: string | null
          created_at?: string
          decision_type: string
          id?: string
          match_score?: number | null
          reasoning: string
          risk_score?: number | null
          training_vector?: Json | null
          updated_at?: string
          used_for_training?: boolean | null
        }
        Update: {
          artist_correction?: string | null
          artist_review_status?: string | null
          artist_reviewed_at?: string | null
          artist_reviewer_id?: string | null
          client_satisfaction_signals?: string | null
          conversation_id?: string | null
          created_at?: string
          decision_type?: string
          id?: string
          match_score?: number | null
          reasoning?: string
          risk_score?: number | null
          training_vector?: Json | null
          updated_at?: string
          used_for_training?: boolean | null
        }
        Relationships: []
      }
      agent_learning_data: {
        Row: {
          applied_at: string | null
          created_at: string | null
          feedback_score: number | null
          id: string
          input_data: Json
          interaction_type: string
          learned_patterns: Json | null
          outcome: string | null
          outcome_value: number | null
          output_data: Json
          workspace_id: string | null
        }
        Insert: {
          applied_at?: string | null
          created_at?: string | null
          feedback_score?: number | null
          id?: string
          input_data?: Json
          interaction_type: string
          learned_patterns?: Json | null
          outcome?: string | null
          outcome_value?: number | null
          output_data?: Json
          workspace_id?: string | null
        }
        Update: {
          applied_at?: string | null
          created_at?: string | null
          feedback_score?: number | null
          id?: string
          input_data?: Json
          interaction_type?: string
          learned_patterns?: Json | null
          outcome?: string | null
          outcome_value?: number | null
          output_data?: Json
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_learning_data_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspace_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_self_reflections: {
        Row: {
          confidence_delta: number | null
          conversation_id: string | null
          created_at: string | null
          emotion_detected: Json | null
          id: string
          improved_response: string | null
          learning_insights: Json | null
          original_response: string | null
          parallel_factor: number | null
          processing_time_ms: number | null
          reflection_type: string
          workspace_id: string | null
        }
        Insert: {
          confidence_delta?: number | null
          conversation_id?: string | null
          created_at?: string | null
          emotion_detected?: Json | null
          id?: string
          improved_response?: string | null
          learning_insights?: Json | null
          original_response?: string | null
          parallel_factor?: number | null
          processing_time_ms?: number | null
          reflection_type?: string
          workspace_id?: string | null
        }
        Update: {
          confidence_delta?: number | null
          conversation_id?: string | null
          created_at?: string | null
          emotion_detected?: Json | null
          id?: string
          improved_response?: string | null
          learning_insights?: Json | null
          original_response?: string | null
          parallel_factor?: number | null
          processing_time_ms?: number | null
          reflection_type?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_self_reflections_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspace_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_avatar_clones: {
        Row: {
          artist_id: string | null
          avatar_photo_url: string | null
          avatar_style: string | null
          background_preset: string | null
          consent_video_url: string | null
          created_at: string
          display_name: string
          elevenlabs_voice_id: string | null
          id: string
          last_trained_at: string | null
          status: string | null
          synthesia_avatar_id: string | null
          training_progress: number | null
          training_video_url: string | null
          updated_at: string
          voice_clone_status: string | null
          voice_preview_url: string | null
          voice_sample_url: string | null
          voice_samples_urls: string[] | null
          workspace_id: string | null
        }
        Insert: {
          artist_id?: string | null
          avatar_photo_url?: string | null
          avatar_style?: string | null
          background_preset?: string | null
          consent_video_url?: string | null
          created_at?: string
          display_name: string
          elevenlabs_voice_id?: string | null
          id?: string
          last_trained_at?: string | null
          status?: string | null
          synthesia_avatar_id?: string | null
          training_progress?: number | null
          training_video_url?: string | null
          updated_at?: string
          voice_clone_status?: string | null
          voice_preview_url?: string | null
          voice_sample_url?: string | null
          voice_samples_urls?: string[] | null
          workspace_id?: string | null
        }
        Update: {
          artist_id?: string | null
          avatar_photo_url?: string | null
          avatar_style?: string | null
          background_preset?: string | null
          consent_video_url?: string | null
          created_at?: string
          display_name?: string
          elevenlabs_voice_id?: string | null
          id?: string
          last_trained_at?: string | null
          status?: string | null
          synthesia_avatar_id?: string | null
          training_progress?: number | null
          training_video_url?: string | null
          updated_at?: string
          voice_clone_status?: string | null
          voice_preview_url?: string | null
          voice_sample_url?: string | null
          voice_samples_urls?: string[] | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_avatar_clones_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "studio_artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_avatar_clones_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspace_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_avatar_videos: {
        Row: {
          avatar_clone_id: string | null
          booking_id: string | null
          causal_optimization: Json | null
          conversation_id: string | null
          conversion_impact: number | null
          created_at: string
          duration_seconds: number | null
          engagement_score: number | null
          id: string
          qaoa_score: number | null
          resolution: string | null
          script_emotion: string | null
          script_text: string
          status: string | null
          synthesia_video_id: string | null
          thumbnail_url: string | null
          updated_at: string
          video_url: string | null
          views_count: number | null
        }
        Insert: {
          avatar_clone_id?: string | null
          booking_id?: string | null
          causal_optimization?: Json | null
          conversation_id?: string | null
          conversion_impact?: number | null
          created_at?: string
          duration_seconds?: number | null
          engagement_score?: number | null
          id?: string
          qaoa_score?: number | null
          resolution?: string | null
          script_emotion?: string | null
          script_text: string
          status?: string | null
          synthesia_video_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          video_url?: string | null
          views_count?: number | null
        }
        Update: {
          avatar_clone_id?: string | null
          booking_id?: string | null
          causal_optimization?: Json | null
          conversation_id?: string | null
          conversion_impact?: number | null
          created_at?: string
          duration_seconds?: number | null
          engagement_score?: number | null
          id?: string
          qaoa_score?: number | null
          resolution?: string | null
          script_emotion?: string | null
          script_text?: string
          status?: string | null
          synthesia_video_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          video_url?: string | null
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_avatar_videos_avatar_clone_id_fkey"
            columns: ["avatar_clone_id"]
            isOneToOne: false
            referencedRelation: "ai_avatar_clones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_avatar_videos_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_avatar_videos_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "customer_booking_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_avatar_videos_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
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
      ai_runs: {
        Row: {
          cost_estimate: number | null
          created_at: string | null
          error: string | null
          id: string
          latency_ms: number | null
          model: string | null
          provider: string | null
          session_id: string | null
          success: boolean | null
          task_type: string
          tokens_in: number | null
          tokens_out: number | null
          workspace_id: string | null
        }
        Insert: {
          cost_estimate?: number | null
          created_at?: string | null
          error?: string | null
          id?: string
          latency_ms?: number | null
          model?: string | null
          provider?: string | null
          session_id?: string | null
          success?: boolean | null
          task_type: string
          tokens_in?: number | null
          tokens_out?: number | null
          workspace_id?: string | null
        }
        Update: {
          cost_estimate?: number | null
          created_at?: string | null
          error?: string | null
          id?: string
          latency_ms?: number | null
          model?: string | null
          provider?: string | null
          session_id?: string | null
          success?: boolean | null
          task_type?: string
          tokens_in?: number | null
          tokens_out?: number | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_runs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "concierge_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_runs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspace_settings"
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
      appointments: {
        Row: {
          artist_notes: string | null
          artist_profile_id: string
          client_notes: string | null
          created_at: string
          deposit_amount: number | null
          deposit_paid_at: string | null
          deposit_status: string
          duration_minutes: number | null
          end_at: string | null
          external_calendar_synced: boolean | null
          google_event_id: string | null
          hold_expires_at: string | null
          id: string
          policies_accepted_at: string | null
          policies_version: string | null
          request_id: string | null
          start_at: string | null
          state: string
          studio_notes: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          artist_notes?: string | null
          artist_profile_id: string
          client_notes?: string | null
          created_at?: string
          deposit_amount?: number | null
          deposit_paid_at?: string | null
          deposit_status?: string
          duration_minutes?: number | null
          end_at?: string | null
          external_calendar_synced?: boolean | null
          google_event_id?: string | null
          hold_expires_at?: string | null
          id?: string
          policies_accepted_at?: string | null
          policies_version?: string | null
          request_id?: string | null
          start_at?: string | null
          state?: string
          studio_notes?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          artist_notes?: string | null
          artist_profile_id?: string
          client_notes?: string | null
          created_at?: string
          deposit_amount?: number | null
          deposit_paid_at?: string | null
          deposit_status?: string
          duration_minutes?: number | null
          end_at?: string | null
          external_calendar_synced?: boolean | null
          google_event_id?: string | null
          hold_expires_at?: string | null
          id?: string
          policies_accepted_at?: string | null
          policies_version?: string | null
          request_id?: string | null
          start_at?: string | null
          state?: string
          studio_notes?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_artist_profile_id_fkey"
            columns: ["artist_profile_id"]
            isOneToOne: false
            referencedRelation: "artist_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "booking_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspace_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      ar_live_calibrations: {
        Row: {
          calibration_json: Json | null
          created_at: string | null
          device_caps_json: Json | null
          id: string
          session_id: string
        }
        Insert: {
          calibration_json?: Json | null
          created_at?: string | null
          device_caps_json?: Json | null
          id?: string
          session_id: string
        }
        Update: {
          calibration_json?: Json | null
          created_at?: string | null
          device_caps_json?: Json | null
          id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ar_live_calibrations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "concierge_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ar_live_records: {
        Row: {
          ar_live_session_id: string
          created_at: string | null
          duration_seconds: number | null
          id: string
          video_url: string | null
        }
        Insert: {
          ar_live_session_id: string
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          video_url?: string | null
        }
        Update: {
          ar_live_session_id?: string
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ar_live_records_ar_live_session_id_fkey"
            columns: ["ar_live_session_id"]
            isOneToOne: false
            referencedRelation: "ar_live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ar_live_renders: {
        Row: {
          created_at: string | null
          id: string
          mode: string | null
          session_id: string
          thumbnail_url: string | null
          video_url: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          mode?: string | null
          session_id: string
          thumbnail_url?: string | null
          video_url?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          mode?: string | null
          session_id?: string
          thumbnail_url?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ar_live_renders_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "concierge_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ar_live_sessions: {
        Row: {
          ar_pack_id: string | null
          calibration_json: Json | null
          created_at: string | null
          device_caps_json: Json | null
          id: string
          mode: string | null
          session_id: string
        }
        Insert: {
          ar_pack_id?: string | null
          calibration_json?: Json | null
          created_at?: string | null
          device_caps_json?: Json | null
          id?: string
          mode?: string | null
          session_id: string
        }
        Update: {
          ar_pack_id?: string | null
          calibration_json?: Json | null
          created_at?: string | null
          device_caps_json?: Json | null
          id?: string
          mode?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ar_live_sessions_ar_pack_id_fkey"
            columns: ["ar_pack_id"]
            isOneToOne: false
            referencedRelation: "ar_packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ar_live_sessions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "concierge_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ar_packs: {
        Row: {
          assets_json: Json | null
          created_at: string | null
          final_sketch_id: string | null
          id: string
          session_id: string
          status: string
        }
        Insert: {
          assets_json?: Json | null
          created_at?: string | null
          final_sketch_id?: string | null
          id?: string
          session_id: string
          status?: string
        }
        Update: {
          assets_json?: Json | null
          created_at?: string | null
          final_sketch_id?: string | null
          id?: string
          session_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ar_packs_final_sketch_id_fkey"
            columns: ["final_sketch_id"]
            isOneToOne: false
            referencedRelation: "final_sketches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ar_packs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "concierge_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ar_preview_sessions: {
        Row: {
          body_part: string | null
          conversation_id: string | null
          created_at: string | null
          design_url: string | null
          final_placement: Json | null
          final_rotation: number | null
          final_scale: number | null
          id: string
          perspective_matrix: Json | null
          updated_at: string | null
          user_image_url: string | null
        }
        Insert: {
          body_part?: string | null
          conversation_id?: string | null
          created_at?: string | null
          design_url?: string | null
          final_placement?: Json | null
          final_rotation?: number | null
          final_scale?: number | null
          id?: string
          perspective_matrix?: Json | null
          updated_at?: string | null
          user_image_url?: string | null
        }
        Update: {
          body_part?: string | null
          conversation_id?: string | null
          created_at?: string | null
          design_url?: string | null
          final_placement?: Json | null
          final_rotation?: number | null
          final_scale?: number | null
          id?: string
          perspective_matrix?: Json | null
          updated_at?: string | null
          user_image_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ar_preview_sessions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ar_shader_presets: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          key: string
          name: string | null
          params_json: Json | null
          workspace_id: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          key: string
          name?: string | null
          params_json?: Json | null
          workspace_id?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          key?: string
          name?: string | null
          params_json?: Json | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ar_shader_presets_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspace_settings"
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
          concessions: Json | null
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
          concessions?: Json | null
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
          concessions?: Json | null
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
      artist_portfolio_assets: {
        Row: {
          analyzed_at: string | null
          artist_id: string
          created_at: string | null
          embedding_json: Json | null
          id: string
          image_url: string
          tags_json: Json | null
        }
        Insert: {
          analyzed_at?: string | null
          artist_id: string
          created_at?: string | null
          embedding_json?: Json | null
          id?: string
          image_url: string
          tags_json?: Json | null
        }
        Update: {
          analyzed_at?: string | null
          artist_id?: string
          created_at?: string | null
          embedding_json?: Json | null
          id?: string
          image_url?: string
          tags_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "artist_portfolio_assets_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "studio_artists"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_portfolio_embeddings: {
        Row: {
          analyzed_at: string | null
          artist_id: string | null
          created_at: string | null
          embedding: Json | null
          id: string
          image_url: string
          style_tags: string[] | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          analyzed_at?: string | null
          artist_id?: string | null
          created_at?: string | null
          embedding?: Json | null
          id?: string
          image_url: string
          style_tags?: string[] | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          analyzed_at?: string | null
          artist_id?: string | null
          created_at?: string | null
          embedding?: Json | null
          id?: string
          image_url?: string
          style_tags?: string[] | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artist_portfolio_embeddings_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "studio_artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artist_portfolio_embeddings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspace_settings"
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
      artist_profiles: {
        Row: {
          accepts: string[] | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          google_calendar_connected: boolean
          google_calendar_id: string | null
          id: string
          public_slug: string | null
          styles: string[] | null
          timezone: string | null
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          accepts?: string[] | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          google_calendar_connected?: boolean
          google_calendar_id?: string | null
          id?: string
          public_slug?: string | null
          styles?: string[] | null
          timezone?: string | null
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          accepts?: string[] | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          google_calendar_connected?: boolean
          google_calendar_id?: string | null
          id?: string
          public_slug?: string | null
          styles?: string[] | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_profiles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspace_settings"
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
      artist_services: {
        Row: {
          artist_id: string
          buffer_after_min: number
          buffer_before_min: number
          created_at: string
          deposit_amount: number
          description: string | null
          duration_minutes: number
          hourly_rate: number | null
          id: string
          is_active: boolean
          name: string
          service_key: string
          sort_order: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          artist_id: string
          buffer_after_min?: number
          buffer_before_min?: number
          created_at?: string
          deposit_amount?: number
          description?: string | null
          duration_minutes?: number
          hourly_rate?: number | null
          id?: string
          is_active?: boolean
          name: string
          service_key: string
          sort_order?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          artist_id?: string
          buffer_after_min?: number
          buffer_before_min?: number
          created_at?: string
          deposit_amount?: number
          description?: string | null
          duration_minutes?: number
          hourly_rate?: number | null
          id?: string
          is_active?: boolean
          name?: string
          service_key?: string
          sort_order?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_services_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "studio_artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artist_services_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspace_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_session_config: {
        Row: {
          aged_skin_multiplier: number | null
          artist_id: string | null
          break_duration_minutes: number | null
          break_frequency_hours: number | null
          color_speed_cm2_hour: number | null
          coverup_multiplier: number | null
          created_at: string
          dark_skin_multiplier: number | null
          default_speed_cm2_hour: number | null
          deposit_percentage: number | null
          fine_line_speed_cm2_hour: number | null
          geometric_speed_cm2_hour: number | null
          hourly_rate: number | null
          id: string
          keloid_prone_multiplier: number | null
          max_clients_per_day: number | null
          max_session_hours: number | null
          micro_realism_speed_cm2_hour: number | null
          min_session_hours: number | null
          ml_learning_enabled: boolean | null
          preferred_session_hours: number | null
          rework_multiplier: number | null
          sensitive_area_multiplier: number | null
          updated_at: string
          upsell_threshold_sessions: number | null
          workspace_id: string | null
        }
        Insert: {
          aged_skin_multiplier?: number | null
          artist_id?: string | null
          break_duration_minutes?: number | null
          break_frequency_hours?: number | null
          color_speed_cm2_hour?: number | null
          coverup_multiplier?: number | null
          created_at?: string
          dark_skin_multiplier?: number | null
          default_speed_cm2_hour?: number | null
          deposit_percentage?: number | null
          fine_line_speed_cm2_hour?: number | null
          geometric_speed_cm2_hour?: number | null
          hourly_rate?: number | null
          id?: string
          keloid_prone_multiplier?: number | null
          max_clients_per_day?: number | null
          max_session_hours?: number | null
          micro_realism_speed_cm2_hour?: number | null
          min_session_hours?: number | null
          ml_learning_enabled?: boolean | null
          preferred_session_hours?: number | null
          rework_multiplier?: number | null
          sensitive_area_multiplier?: number | null
          updated_at?: string
          upsell_threshold_sessions?: number | null
          workspace_id?: string | null
        }
        Update: {
          aged_skin_multiplier?: number | null
          artist_id?: string | null
          break_duration_minutes?: number | null
          break_frequency_hours?: number | null
          color_speed_cm2_hour?: number | null
          coverup_multiplier?: number | null
          created_at?: string
          dark_skin_multiplier?: number | null
          default_speed_cm2_hour?: number | null
          deposit_percentage?: number | null
          fine_line_speed_cm2_hour?: number | null
          geometric_speed_cm2_hour?: number | null
          hourly_rate?: number | null
          id?: string
          keloid_prone_multiplier?: number | null
          max_clients_per_day?: number | null
          max_session_hours?: number | null
          micro_realism_speed_cm2_hour?: number | null
          min_session_hours?: number | null
          ml_learning_enabled?: boolean | null
          preferred_session_hours?: number | null
          rework_multiplier?: number | null
          sensitive_area_multiplier?: number | null
          updated_at?: string
          upsell_threshold_sessions?: number | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artist_session_config_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: true
            referencedRelation: "studio_artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artist_session_config_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspace_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_style_models: {
        Row: {
          artist_id: string
          created_at: string | null
          id: string
          metrics_json: Json | null
          model_ref: string | null
          model_type: string | null
          provider: string | null
          status: string
          version: number | null
        }
        Insert: {
          artist_id: string
          created_at?: string | null
          id?: string
          metrics_json?: Json | null
          model_ref?: string | null
          model_type?: string | null
          provider?: string | null
          status?: string
          version?: number | null
        }
        Update: {
          artist_id?: string
          created_at?: string | null
          id?: string
          metrics_json?: Json | null
          model_ref?: string | null
          model_type?: string | null
          provider?: string | null
          status?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "artist_style_models_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
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
      avatar_script_templates: {
        Row: {
          a_b_test_variant: string | null
          causal_variables: Json | null
          conversion_rate: number | null
          created_at: string
          emotion_preset: string | null
          id: string
          is_active: boolean | null
          optimal_duration_seconds: number | null
          script_template: string
          template_name: string
          template_type: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          a_b_test_variant?: string | null
          causal_variables?: Json | null
          conversion_rate?: number | null
          created_at?: string
          emotion_preset?: string | null
          id?: string
          is_active?: boolean | null
          optimal_duration_seconds?: number | null
          script_template: string
          template_name: string
          template_type: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          a_b_test_variant?: string | null
          causal_variables?: Json | null
          conversion_rate?: number | null
          created_at?: string
          emotion_preset?: string | null
          id?: string
          is_active?: boolean | null
          optimal_duration_seconds?: number | null
          script_template?: string
          template_name?: string
          template_type?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "avatar_script_templates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspace_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      avatar_video_analytics: {
        Row: {
          completion_rate: number | null
          conversion_type: string | null
          converted: boolean | null
          created_at: string
          device_type: string | null
          differential_privacy_noise: number | null
          emotion_detected: string | null
          federated_node_id: string | null
          id: string
          platform: string | null
          video_id: string | null
          viewer_fingerprint: string | null
          watch_duration_seconds: number | null
        }
        Insert: {
          completion_rate?: number | null
          conversion_type?: string | null
          converted?: boolean | null
          created_at?: string
          device_type?: string | null
          differential_privacy_noise?: number | null
          emotion_detected?: string | null
          federated_node_id?: string | null
          id?: string
          platform?: string | null
          video_id?: string | null
          viewer_fingerprint?: string | null
          watch_duration_seconds?: number | null
        }
        Update: {
          completion_rate?: number | null
          conversion_type?: string | null
          converted?: boolean | null
          created_at?: string
          device_type?: string | null
          differential_privacy_noise?: number | null
          emotion_detected?: string | null
          federated_node_id?: string | null
          id?: string
          platform?: string | null
          video_id?: string | null
          viewer_fingerprint?: string | null
          watch_duration_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "avatar_video_analytics_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "ai_avatar_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      body_landmarks: {
        Row: {
          body_profile_id: string
          confidence: number | null
          created_at: string | null
          id: string
          landmark_key: string
          position_json: Json | null
        }
        Insert: {
          body_profile_id: string
          confidence?: number | null
          created_at?: string | null
          id?: string
          landmark_key: string
          position_json?: Json | null
        }
        Update: {
          body_profile_id?: string
          confidence?: number | null
          created_at?: string | null
          id?: string
          landmark_key?: string
          position_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "body_landmarks_body_profile_id_fkey"
            columns: ["body_profile_id"]
            isOneToOne: false
            referencedRelation: "body_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      body_profiles: {
        Row: {
          body_part: string
          client_id: string | null
          created_at: string | null
          geometry_type: string | null
          id: string
          profile_json: Json | null
          session_id: string | null
        }
        Insert: {
          body_part: string
          client_id?: string | null
          created_at?: string | null
          geometry_type?: string | null
          id?: string
          profile_json?: Json | null
          session_id?: string | null
        }
        Update: {
          body_part?: string
          client_id?: string | null
          created_at?: string | null
          geometry_type?: string | null
          id?: string
          profile_json?: Json | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "body_profiles_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "concierge_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      body_uv_maps: {
        Row: {
          body_profile_id: string
          created_at: string | null
          id: string
          resolution_json: Json | null
          unwrap_type: string | null
          uv_map_url: string | null
        }
        Insert: {
          body_profile_id: string
          created_at?: string | null
          id?: string
          resolution_json?: Json | null
          unwrap_type?: string | null
          uv_map_url?: string | null
        }
        Update: {
          body_profile_id?: string
          created_at?: string | null
          id?: string
          resolution_json?: Json | null
          unwrap_type?: string | null
          uv_map_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "body_uv_maps_body_profile_id_fkey"
            columns: ["body_profile_id"]
            isOneToOne: false
            referencedRelation: "body_profiles"
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
      booking_requests: {
        Row: {
          assigned_artist_id: string | null
          assigned_at: string | null
          assigned_by: string | null
          brief: Json
          client_email: string | null
          client_name: string | null
          client_phone: string | null
          created_at: string
          created_by: string
          estimated_hours: number | null
          fit_score: number | null
          id: string
          preferred_dates: Json | null
          preferred_time_notes: string | null
          reference_images: string[] | null
          route: string
          service_type: string
          source_booking_id: string | null
          status: string
          updated_at: string
          urgency: string | null
          workspace_id: string
        }
        Insert: {
          assigned_artist_id?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          brief?: Json
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          created_by?: string
          estimated_hours?: number | null
          fit_score?: number | null
          id?: string
          preferred_dates?: Json | null
          preferred_time_notes?: string | null
          reference_images?: string[] | null
          route?: string
          service_type?: string
          source_booking_id?: string | null
          status?: string
          updated_at?: string
          urgency?: string | null
          workspace_id: string
        }
        Update: {
          assigned_artist_id?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          brief?: Json
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          created_by?: string
          estimated_hours?: number | null
          fit_score?: number | null
          id?: string
          preferred_dates?: Json | null
          preferred_time_notes?: string | null
          reference_images?: string[] | null
          route?: string
          service_type?: string
          source_booking_id?: string | null
          status?: string
          updated_at?: string
          urgency?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_requests_assigned_artist_id_fkey"
            columns: ["assigned_artist_id"]
            isOneToOne: false
            referencedRelation: "artist_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_requests_source_booking_id_fkey"
            columns: ["source_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_requests_source_booking_id_fkey"
            columns: ["source_booking_id"]
            isOneToOne: false
            referencedRelation: "customer_booking_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_requests_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspace_settings"
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
      change_proposals: {
        Row: {
          appointment_id: string
          artist_profile_id: string
          counter_proposal: Json | null
          created_at: string
          expires_at: string | null
          id: string
          message: string | null
          proposed_by_user_id: string
          proposed_options: Json
          reason: string | null
          responded_at: string | null
          response_message: string | null
          status: string
          type: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          appointment_id: string
          artist_profile_id: string
          counter_proposal?: Json | null
          created_at?: string
          expires_at?: string | null
          id?: string
          message?: string | null
          proposed_by_user_id: string
          proposed_options?: Json
          reason?: string | null
          responded_at?: string | null
          response_message?: string | null
          status?: string
          type: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          appointment_id?: string
          artist_profile_id?: string
          counter_proposal?: Json | null
          created_at?: string
          expires_at?: string | null
          id?: string
          message?: string | null
          proposed_by_user_id?: string
          proposed_options?: Json
          reason?: string | null
          responded_at?: string | null
          response_message?: string | null
          status?: string
          type?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_proposals_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_proposals_artist_profile_id_fkey"
            columns: ["artist_profile_id"]
            isOneToOne: false
            referencedRelation: "artist_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_proposals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspace_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      chaos_rules: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          id: string
          job_type: string
          simulate_fail_rate: number | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          job_type: string
          simulate_fail_rate?: number | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          job_type?: string
          simulate_fail_rate?: number | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chaos_rules_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspace_settings"
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
          first_booking_at: string | null
          full_name: string | null
          id: string
          instagram_handle: string | null
          last_booking_at: string | null
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
          source: string | null
          total_bookings: number | null
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
          first_booking_at?: string | null
          full_name?: string | null
          id?: string
          instagram_handle?: string | null
          last_booking_at?: string | null
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
          source?: string | null
          total_bookings?: number | null
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
          first_booking_at?: string | null
          full_name?: string | null
          id?: string
          instagram_handle?: string | null
          last_booking_at?: string | null
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
          source?: string | null
          total_bookings?: number | null
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
      codesign_events: {
        Row: {
          codesign_session_id: string
          created_at: string | null
          event_type: string
          id: string
          payload_json: Json | null
        }
        Insert: {
          codesign_session_id: string
          created_at?: string | null
          event_type: string
          id?: string
          payload_json?: Json | null
        }
        Update: {
          codesign_session_id?: string
          created_at?: string | null
          event_type?: string
          id?: string
          payload_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "codesign_events_codesign_session_id_fkey"
            columns: ["codesign_session_id"]
            isOneToOne: false
            referencedRelation: "codesign_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      codesign_sessions: {
        Row: {
          created_at: string | null
          current_vector_json: Json | null
          id: string
          locked_axes: Json | null
          session_id: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          current_vector_json?: Json | null
          id?: string
          locked_axes?: Json | null
          session_id: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          current_vector_json?: Json | null
          id?: string
          locked_axes?: Json | null
          session_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "codesign_sessions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "concierge_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      codesign_variants: {
        Row: {
          chosen: boolean | null
          codesign_session_id: string
          created_at: string | null
          id: string
          idx: number
          image_url: string | null
          params_json: Json | null
          scores_json: Json | null
        }
        Insert: {
          chosen?: boolean | null
          codesign_session_id: string
          created_at?: string | null
          id?: string
          idx: number
          image_url?: string | null
          params_json?: Json | null
          scores_json?: Json | null
        }
        Update: {
          chosen?: boolean | null
          codesign_session_id?: string
          created_at?: string | null
          id?: string
          idx?: number
          image_url?: string | null
          params_json?: Json | null
          scores_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "codesign_variants_codesign_session_id_fkey"
            columns: ["codesign_session_id"]
            isOneToOne: false
            referencedRelation: "codesign_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      collab_ops: {
        Row: {
          author_id: string | null
          created_at: string | null
          id: string
          op_json: Json
          room_id: string
        }
        Insert: {
          author_id?: string | null
          created_at?: string | null
          id?: string
          op_json: Json
          room_id: string
        }
        Update: {
          author_id?: string | null
          created_at?: string | null
          id?: string
          op_json?: Json
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collab_ops_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "collab_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      collab_rooms: {
        Row: {
          created_at: string | null
          id: string
          participants_json: Json | null
          room_id: string | null
          session_id: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          participants_json?: Json | null
          room_id?: string | null
          session_id: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          participants_json?: Json | null
          room_id?: string | null
          session_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collab_rooms_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "concierge_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      concept_jobs: {
        Row: {
          created_at: string | null
          id: string
          inputs_json: Json | null
          model_used: string | null
          outputs_json: Json | null
          provider_used: string | null
          session_id: string
          status: string
          strategy_used: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          inputs_json?: Json | null
          model_used?: string | null
          outputs_json?: Json | null
          provider_used?: string | null
          session_id: string
          status?: string
          strategy_used?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          inputs_json?: Json | null
          model_used?: string | null
          outputs_json?: Json | null
          provider_used?: string | null
          session_id?: string
          status?: string
          strategy_used?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "concept_jobs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "concierge_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      concept_variants: {
        Row: {
          chosen: boolean | null
          created_at: string | null
          id: string
          idx: number
          image_url: string | null
          job_id: string
          scores_json: Json | null
          session_id: string | null
          thumbnail_url: string | null
        }
        Insert: {
          chosen?: boolean | null
          created_at?: string | null
          id?: string
          idx: number
          image_url?: string | null
          job_id: string
          scores_json?: Json | null
          session_id?: string | null
          thumbnail_url?: string | null
        }
        Update: {
          chosen?: boolean | null
          created_at?: string | null
          id?: string
          idx?: number
          image_url?: string | null
          job_id?: string
          scores_json?: Json | null
          session_id?: string | null
          thumbnail_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "concept_variants_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "concept_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concept_variants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "concierge_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      concierge_actions_log: {
        Row: {
          action_key: string
          created_at: string | null
          id: string
          payload_json: Json | null
          session_id: string
        }
        Insert: {
          action_key: string
          created_at?: string | null
          id?: string
          payload_json?: Json | null
          session_id: string
        }
        Update: {
          action_key?: string
          created_at?: string | null
          id?: string
          payload_json?: Json | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "concierge_actions_log_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "concierge_sessions"
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
      concierge_jobs: {
        Row: {
          created_at: string | null
          error_code: string | null
          error_message: string | null
          id: string
          inputs_json: Json | null
          job_type: string
          max_retries: number | null
          outputs_json: Json | null
          progress: number | null
          provider: string | null
          retry_count: number | null
          session_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          inputs_json?: Json | null
          job_type: string
          max_retries?: number | null
          outputs_json?: Json | null
          progress?: number | null
          provider?: string | null
          retry_count?: number | null
          session_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          inputs_json?: Json | null
          job_type?: string
          max_retries?: number | null
          outputs_json?: Json | null
          progress?: number | null
          provider?: string | null
          retry_count?: number | null
          session_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "concierge_jobs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "concierge_sessions"
            referencedColumns: ["id"]
          },
        ]
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
      concierge_messages: {
        Row: {
          attachments_json: Json | null
          content: string | null
          created_at: string | null
          id: string
          intent_detected: Json | null
          role: string
          session_id: string
        }
        Insert: {
          attachments_json?: Json | null
          content?: string | null
          created_at?: string | null
          id?: string
          intent_detected?: Json | null
          role: string
          session_id: string
        }
        Update: {
          attachments_json?: Json | null
          content?: string | null
          created_at?: string | null
          id?: string
          intent_detected?: Json | null
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "concierge_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "concierge_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      concierge_offer_policy: {
        Row: {
          id: string
          policy_json: Json | null
          preset: string | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          id?: string
          policy_json?: Json | null
          preset?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          id?: string
          policy_json?: Json | null
          preset?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "concierge_offer_policy_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspace_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      concierge_referral_requests: {
        Row: {
          client_email: string
          client_name: string | null
          conversation_id: string | null
          created_at: string
          id: string
          preferred_city: string | null
          request_summary: string | null
          request_type: string
          status: string
          updated_at: string
        }
        Insert: {
          client_email: string
          client_name?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          preferred_city?: string | null
          request_summary?: string | null
          request_type?: string
          status?: string
          updated_at?: string
        }
        Update: {
          client_email?: string
          client_name?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          preferred_city?: string | null
          request_summary?: string | null
          request_type?: string
          status?: string
          updated_at?: string
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
      concierge_sessions: {
        Row: {
          artist_id: string | null
          client_id: string | null
          conversation_id: string | null
          created_at: string | null
          design_brief_json: Json | null
          id: string
          intent_flags_json: Json | null
          last_sketch_offer_at: string | null
          max_offers_reached: boolean | null
          message_count: number | null
          readiness_score: number | null
          sketch_offer_cooldown_until: string | null
          sketch_offer_declined_count: number | null
          stage: string
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          artist_id?: string | null
          client_id?: string | null
          conversation_id?: string | null
          created_at?: string | null
          design_brief_json?: Json | null
          id?: string
          intent_flags_json?: Json | null
          last_sketch_offer_at?: string | null
          max_offers_reached?: boolean | null
          message_count?: number | null
          readiness_score?: number | null
          sketch_offer_cooldown_until?: string | null
          sketch_offer_declined_count?: number | null
          stage?: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          artist_id?: string | null
          client_id?: string | null
          conversation_id?: string | null
          created_at?: string | null
          design_brief_json?: Json | null
          id?: string
          intent_flags_json?: Json | null
          last_sketch_offer_at?: string | null
          max_offers_reached?: boolean | null
          message_count?: number | null
          readiness_score?: number | null
          sketch_offer_cooldown_until?: string | null
          sketch_offer_declined_count?: number | null
          stage?: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "concierge_sessions_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "studio_artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concierge_sessions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concierge_sessions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspace_settings"
            referencedColumns: ["id"]
          },
        ]
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
      content_creations: {
        Row: {
          artist_id: string | null
          caption: string | null
          clips: Json | null
          created_at: string | null
          edit_settings: Json | null
          hashtags: string[] | null
          id: string
          performance_metrics: Json | null
          platforms: string[] | null
          published_at: string | null
          scheduled_at: string | null
          status: string | null
          title: string
          trend_id: string | null
          updated_at: string | null
        }
        Insert: {
          artist_id?: string | null
          caption?: string | null
          clips?: Json | null
          created_at?: string | null
          edit_settings?: Json | null
          hashtags?: string[] | null
          id?: string
          performance_metrics?: Json | null
          platforms?: string[] | null
          published_at?: string | null
          scheduled_at?: string | null
          status?: string | null
          title: string
          trend_id?: string | null
          updated_at?: string | null
        }
        Update: {
          artist_id?: string | null
          caption?: string | null
          clips?: Json | null
          created_at?: string | null
          edit_settings?: Json | null
          hashtags?: string[] | null
          id?: string
          performance_metrics?: Json | null
          platforms?: string[] | null
          published_at?: string | null
          scheduled_at?: string | null
          status?: string | null
          title?: string
          trend_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_creations_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "studio_artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_creations_trend_id_fkey"
            columns: ["trend_id"]
            isOneToOne: false
            referencedRelation: "social_trends"
            referencedColumns: ["id"]
          },
        ]
      }
      conversion_bandit_state: {
        Row: {
          id: string
          state_json: Json | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          id?: string
          state_json?: Json | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          id?: string
          state_json?: Json | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversion_bandit_state_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspace_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      conversion_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          metadata_json: Json | null
          session_id: string
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          metadata_json?: Json | null
          session_id: string
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          metadata_json?: Json | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversion_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "concierge_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      conversion_state: {
        Row: {
          id: string
          state_json: Json | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          id?: string
          state_json?: Json | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          id?: string
          state_json?: Json | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversion_state_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspace_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      copy_variants: {
        Row: {
          active: boolean | null
          context_key: string
          created_at: string | null
          id: string
          variants_json: Json
          workspace_id: string | null
        }
        Insert: {
          active?: boolean | null
          context_key: string
          created_at?: string | null
          id?: string
          variants_json: Json
          workspace_id?: string | null
        }
        Update: {
          active?: boolean | null
          context_key?: string
          created_at?: string | null
          id?: string
          variants_json?: Json
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "copy_variants_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspace_settings"
            referencedColumns: ["id"]
          },
        ]
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
      deformation_zones: {
        Row: {
          body_profile_id: string
          created_at: string | null
          deformation_score: number | null
          id: string
          notes: string | null
          risk_level: string | null
          zone_key: string
        }
        Insert: {
          body_profile_id: string
          created_at?: string | null
          deformation_score?: number | null
          id?: string
          notes?: string | null
          risk_level?: string | null
          zone_key: string
        }
        Update: {
          body_profile_id?: string
          created_at?: string | null
          deformation_score?: number | null
          id?: string
          notes?: string | null
          risk_level?: string | null
          zone_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "deformation_zones_body_profile_id_fkey"
            columns: ["body_profile_id"]
            isOneToOne: false
            referencedRelation: "body_profiles"
            referencedColumns: ["id"]
          },
        ]
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
      design_comments: {
        Row: {
          anchor_json: Json | null
          author_id: string | null
          comment_text: string | null
          created_at: string | null
          id: string
          resolved: boolean | null
          session_id: string
          version_id: string | null
        }
        Insert: {
          anchor_json?: Json | null
          author_id?: string | null
          comment_text?: string | null
          created_at?: string | null
          id?: string
          resolved?: boolean | null
          session_id: string
          version_id?: string | null
        }
        Update: {
          anchor_json?: Json | null
          author_id?: string | null
          comment_text?: string | null
          created_at?: string | null
          id?: string
          resolved?: boolean | null
          session_id?: string
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "design_comments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "concierge_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_comments_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "design_versions"
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
      design_versions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          id: string
          image_url: string | null
          params_json: Json | null
          session_id: string
          version_num: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          params_json?: Json | null
          session_id: string
          version_num: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          params_json?: Json | null
          session_id?: string
          version_num?: number
        }
        Relationships: [
          {
            foreignKeyName: "design_versions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "concierge_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      device_caps: {
        Row: {
          caps_json: Json | null
          fingerprint_hash: string | null
          id: string
          updated_at: string | null
          user_id: string | null
          webgpu_supported: boolean | null
          webxr_supported: boolean | null
        }
        Insert: {
          caps_json?: Json | null
          fingerprint_hash?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string | null
          webgpu_supported?: boolean | null
          webxr_supported?: boolean | null
        }
        Update: {
          caps_json?: Json | null
          fingerprint_hash?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string | null
          webgpu_supported?: boolean | null
          webxr_supported?: boolean | null
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
      ensemble_candidates: {
        Row: {
          created_at: string | null
          id: string
          image_url: string | null
          model: string | null
          provider: string | null
          rank: number | null
          run_id: string
          scores_json: Json | null
          verdict: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          model?: string | null
          provider?: string | null
          rank?: number | null
          run_id: string
          scores_json?: Json | null
          verdict?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          model?: string | null
          provider?: string | null
          rank?: number | null
          run_id?: string
          scores_json?: Json | null
          verdict?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ensemble_candidates_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ensemble_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      ensemble_runs: {
        Row: {
          created_at: string | null
          id: string
          session_id: string
          status: string | null
          strategy_json: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          session_id: string
          status?: string | null
          strategy_json?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          session_id?: string
          status?: string | null
          strategy_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ensemble_runs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "concierge_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      escalation_events: {
        Row: {
          assigned_to: string | null
          created_at: string
          id: string
          reason: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          source_id: string | null
          source_type: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          reason: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          source_id?: string | null
          source_type: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          reason?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          source_id?: string | null
          source_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      eval_results: {
        Row: {
          candidate_id: string
          created_at: string | null
          id: string
          passed: boolean | null
          results_json: Json | null
          suite_key: string | null
        }
        Insert: {
          candidate_id: string
          created_at?: string | null
          id?: string
          passed?: boolean | null
          results_json?: Json | null
          suite_key?: string | null
        }
        Update: {
          candidate_id?: string
          created_at?: string | null
          id?: string
          passed?: boolean | null
          results_json?: Json | null
          suite_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eval_results_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "ensemble_candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      eval_suites: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          id: string
          key: string
          thresholds_json: Json | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          thresholds_json?: Json | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          thresholds_json?: Json | null
        }
        Relationships: []
      }
      feasibility_runs: {
        Row: {
          aged_previews_json: Json | null
          created_at: string | null
          id: string
          results_json: Json | null
          session_id: string
          status: string | null
          variant_id: string | null
        }
        Insert: {
          aged_previews_json?: Json | null
          created_at?: string | null
          id?: string
          results_json?: Json | null
          session_id: string
          status?: string | null
          variant_id?: string | null
        }
        Update: {
          aged_previews_json?: Json | null
          created_at?: string | null
          id?: string
          results_json?: Json | null
          session_id?: string
          status?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feasibility_runs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "concierge_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feasibility_runs_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "concept_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          config_json: Json | null
          enabled: boolean | null
          id: string
          key: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          config_json?: Json | null
          enabled?: boolean | null
          id?: string
          key: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          config_json?: Json | null
          enabled?: boolean | null
          id?: string
          key?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspace_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      final_sketches: {
        Row: {
          chosen_variant_id: string | null
          created_at: string | null
          id: string
          lineart_png_url: string | null
          metadata_json: Json | null
          overlay_png_url: string | null
          session_id: string
          svg_url: string | null
        }
        Insert: {
          chosen_variant_id?: string | null
          created_at?: string | null
          id?: string
          lineart_png_url?: string | null
          metadata_json?: Json | null
          overlay_png_url?: string | null
          session_id: string
          svg_url?: string | null
        }
        Update: {
          chosen_variant_id?: string | null
          created_at?: string | null
          id?: string
          lineart_png_url?: string | null
          metadata_json?: Json | null
          overlay_png_url?: string | null
          session_id?: string
          svg_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "final_sketches_chosen_variant_id_fkey"
            columns: ["chosen_variant_id"]
            isOneToOne: false
            referencedRelation: "concept_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "final_sketches_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "concierge_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_up_queue: {
        Row: {
          booking_id: string | null
          created_at: string
          error: string | null
          id: string
          metadata: Json | null
          priority: number | null
          scheduled_at: string
          sent_at: string | null
          status: string
          template_key: string
          trigger: string
          updated_at: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          metadata?: Json | null
          priority?: number | null
          scheduled_at: string
          sent_at?: string | null
          status?: string
          template_key: string
          trigger: string
          updated_at?: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          metadata?: Json | null
          priority?: number | null
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          template_key?: string
          trigger?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_up_queue_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_queue_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "customer_booking_view"
            referencedColumns: ["id"]
          },
        ]
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
      image_embeddings: {
        Row: {
          created_at: string | null
          embedding_json: Json
          entity_id: string
          entity_type: string
          id: string
          model: string | null
        }
        Insert: {
          created_at?: string | null
          embedding_json: Json
          entity_id: string
          entity_type: string
          id?: string
          model?: string | null
        }
        Update: {
          created_at?: string | null
          embedding_json?: Json
          entity_id?: string
          entity_type?: string
          id?: string
          model?: string | null
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
      job_errors: {
        Row: {
          created_at: string | null
          error_code: string | null
          id: string
          inputs_hash: string | null
          job_id: string
          message: string | null
          provider: string | null
          retryable: boolean | null
        }
        Insert: {
          created_at?: string | null
          error_code?: string | null
          id?: string
          inputs_hash?: string | null
          job_id: string
          message?: string | null
          provider?: string | null
          retryable?: boolean | null
        }
        Update: {
          created_at?: string | null
          error_code?: string | null
          id?: string
          inputs_hash?: string | null
          job_id?: string
          message?: string | null
          provider?: string | null
          retryable?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "job_errors_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "concierge_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_traces: {
        Row: {
          id: string
          info_json: Json | null
          job_id: string
          stage: string
          timestamp: string | null
        }
        Insert: {
          id?: string
          info_json?: Json | null
          job_id: string
          stage: string
          timestamp?: string | null
        }
        Update: {
          id?: string
          info_json?: Json | null
          job_id?: string
          stage?: string
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_traces_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "concierge_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      layout_jobs: {
        Row: {
          canvas_id: string | null
          constraints_json: Json | null
          created_at: string | null
          elements_json: Json | null
          flow_score: number | null
          id: string
          mode: string | null
          outputs_json: Json | null
          session_id: string
          status: string
        }
        Insert: {
          canvas_id?: string | null
          constraints_json?: Json | null
          created_at?: string | null
          elements_json?: Json | null
          flow_score?: number | null
          id?: string
          mode?: string | null
          outputs_json?: Json | null
          session_id: string
          status?: string
        }
        Update: {
          canvas_id?: string | null
          constraints_json?: Json | null
          created_at?: string | null
          elements_json?: Json | null
          flow_score?: number | null
          id?: string
          mode?: string | null
          outputs_json?: Json | null
          session_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "layout_jobs_canvas_id_fkey"
            columns: ["canvas_id"]
            isOneToOne: false
            referencedRelation: "sleeve_canvases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "layout_jobs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "concierge_sessions"
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
      marketing_campaigns: {
        Row: {
          ai_generated: boolean | null
          ai_optimization_data: Json | null
          bookings_attributed: number | null
          campaign_type: string
          content: Json
          created_at: string | null
          created_by: string | null
          engagement_score: number | null
          id: string
          media_urls: string[] | null
          name: string
          performance_metrics: Json | null
          published_at: string | null
          revenue_attributed: number | null
          scheduled_at: string | null
          status: string | null
          target_channels: string[] | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          ai_generated?: boolean | null
          ai_optimization_data?: Json | null
          bookings_attributed?: number | null
          campaign_type: string
          content?: Json
          created_at?: string | null
          created_by?: string | null
          engagement_score?: number | null
          id?: string
          media_urls?: string[] | null
          name: string
          performance_metrics?: Json | null
          published_at?: string | null
          revenue_attributed?: number | null
          scheduled_at?: string | null
          status?: string | null
          target_channels?: string[] | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          ai_generated?: boolean | null
          ai_optimization_data?: Json | null
          bookings_attributed?: number | null
          campaign_type?: string
          content?: Json
          created_at?: string | null
          created_by?: string | null
          engagement_score?: number | null
          id?: string
          media_urls?: string[] | null
          name?: string
          performance_metrics?: Json | null
          published_at?: string | null
          revenue_attributed?: number | null
          scheduled_at?: string | null
          status?: string | null
          target_channels?: string[] | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaigns_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspace_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      model_registry: {
        Row: {
          active: boolean | null
          artist_id: string | null
          created_at: string | null
          id: string
          metrics_json: Json | null
          model_ref: string | null
          model_type: string
          version: number
          workspace_id: string | null
        }
        Insert: {
          active?: boolean | null
          artist_id?: string | null
          created_at?: string | null
          id?: string
          metrics_json?: Json | null
          model_ref?: string | null
          model_type: string
          version: number
          workspace_id?: string | null
        }
        Update: {
          active?: boolean | null
          artist_id?: string | null
          created_at?: string | null
          id?: string
          metrics_json?: Json | null
          model_ref?: string | null
          model_type?: string
          version?: number
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "model_registry_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "studio_artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_registry_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspace_settings"
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
      offer_strategies: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          strategies_json: Json
          workspace_id: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          strategies_json: Json
          workspace_id?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          strategies_json?: Json
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offer_strategies_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspace_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      offline_queues: {
        Row: {
          created_at: string | null
          id: string
          queued_events_json: Json | null
          session_id: string
          synced_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          queued_events_json?: Json | null
          session_id: string
          synced_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          queued_events_json?: Json | null
          session_id?: string
          synced_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offline_queues_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "concierge_sessions"
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
      originality_checks: {
        Row: {
          concept_id: string | null
          created_at: string | null
          details_json: Json | null
          id: string
          reference_id: string | null
          session_id: string | null
          similarity_score: number | null
          verdict: string | null
        }
        Insert: {
          concept_id?: string | null
          created_at?: string | null
          details_json?: Json | null
          id?: string
          reference_id?: string | null
          session_id?: string | null
          similarity_score?: number | null
          verdict?: string | null
        }
        Update: {
          concept_id?: string | null
          created_at?: string | null
          details_json?: Json | null
          id?: string
          reference_id?: string | null
          session_id?: string | null
          similarity_score?: number | null
          verdict?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "originality_checks_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "concierge_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      originality_reports: {
        Row: {
          created_at: string | null
          final_variant_id: string | null
          id: string
          report_json: Json | null
          session_id: string
          verdict: string | null
        }
        Insert: {
          created_at?: string | null
          final_variant_id?: string | null
          id?: string
          report_json?: Json | null
          session_id: string
          verdict?: string | null
        }
        Update: {
          created_at?: string | null
          final_variant_id?: string | null
          id?: string
          report_json?: Json | null
          session_id?: string
          verdict?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "originality_reports_final_variant_id_fkey"
            columns: ["final_variant_id"]
            isOneToOne: false
            referencedRelation: "concept_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "originality_reports_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "concierge_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      past_sessions: {
        Row: {
          actual_hours: number | null
          actual_revenue: number | null
          actual_sessions: number | null
          artist_id: string | null
          blowout_risk: number | null
          booking_id: string | null
          client_age_range: string | null
          color_type: string | null
          completed_at: string | null
          created_at: string
          curvature_score: number | null
          design_complexity: number | null
          design_size_cm2: number | null
          design_style: string | null
          estimated_hours_max: number | null
          estimated_hours_min: number | null
          estimated_sessions: number | null
          estimation_accuracy: number | null
          estimation_confidence: number | null
          id: string
          is_first_tattoo: boolean | null
          movement_distortion_risk: number | null
          pain_tolerance: string | null
          placement: string | null
          revenue_per_hour: number | null
          session_dates: Json | null
          skin_tone: string | null
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          actual_hours?: number | null
          actual_revenue?: number | null
          actual_sessions?: number | null
          artist_id?: string | null
          blowout_risk?: number | null
          booking_id?: string | null
          client_age_range?: string | null
          color_type?: string | null
          completed_at?: string | null
          created_at?: string
          curvature_score?: number | null
          design_complexity?: number | null
          design_size_cm2?: number | null
          design_style?: string | null
          estimated_hours_max?: number | null
          estimated_hours_min?: number | null
          estimated_sessions?: number | null
          estimation_accuracy?: number | null
          estimation_confidence?: number | null
          id?: string
          is_first_tattoo?: boolean | null
          movement_distortion_risk?: number | null
          pain_tolerance?: string | null
          placement?: string | null
          revenue_per_hour?: number | null
          session_dates?: Json | null
          skin_tone?: string | null
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          actual_hours?: number | null
          actual_revenue?: number | null
          actual_sessions?: number | null
          artist_id?: string | null
          blowout_risk?: number | null
          booking_id?: string | null
          client_age_range?: string | null
          color_type?: string | null
          completed_at?: string | null
          created_at?: string
          curvature_score?: number | null
          design_complexity?: number | null
          design_size_cm2?: number | null
          design_style?: string | null
          estimated_hours_max?: number | null
          estimated_hours_min?: number | null
          estimated_sessions?: number | null
          estimation_accuracy?: number | null
          estimation_confidence?: number | null
          id?: string
          is_first_tattoo?: boolean | null
          movement_distortion_risk?: number | null
          pain_tolerance?: string | null
          placement?: string | null
          revenue_per_hour?: number | null
          session_dates?: Json | null
          skin_tone?: string | null
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "past_sessions_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "studio_artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "past_sessions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "past_sessions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "customer_booking_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "past_sessions_workspace_id_fkey"
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
      preference_model_state: {
        Row: {
          codesign_session_id: string | null
          id: string
          model_type: string | null
          state_json: Json | null
          updated_at: string | null
        }
        Insert: {
          codesign_session_id?: string | null
          id?: string
          model_type?: string | null
          state_json?: Json | null
          updated_at?: string | null
        }
        Update: {
          codesign_session_id?: string | null
          id?: string
          model_type?: string | null
          state_json?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "preference_model_state_codesign_session_id_fkey"
            columns: ["codesign_session_id"]
            isOneToOne: true
            referencedRelation: "codesign_sessions"
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
      prompt_versions: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          key: string
          metrics_json: Json | null
          prompt_text: string | null
          version: number
          workspace_id: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          key: string
          metrics_json?: Json | null
          prompt_text?: string | null
          version: number
          workspace_id?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          key?: string
          metrics_json?: Json | null
          prompt_text?: string | null
          version?: number
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prompt_versions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspace_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      provenance_chain: {
        Row: {
          created_at: string | null
          id: string
          input_hash: string | null
          output_hash: string | null
          session_id: string
          step_key: string
          step_num: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          input_hash?: string | null
          output_hash?: string | null
          session_id: string
          step_key: string
          step_num?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          input_hash?: string | null
          output_hash?: string | null
          session_id?: string
          step_key?: string
          step_num?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "provenance_chain_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "concierge_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_health: {
        Row: {
          error_rate: number | null
          id: string
          last_checked_at: string | null
          latency_ms: number | null
          provider_key: string
          status: string | null
        }
        Insert: {
          error_rate?: number | null
          id?: string
          last_checked_at?: string | null
          latency_ms?: number | null
          provider_key: string
          status?: string | null
        }
        Update: {
          error_rate?: number | null
          id?: string
          last_checked_at?: string | null
          latency_ms?: number | null
          provider_key?: string
          status?: string | null
        }
        Relationships: []
      }
      provider_routes: {
        Row: {
          config_json: Json | null
          created_at: string | null
          id: string
          job_type: string
          providers_json: Json
        }
        Insert: {
          config_json?: Json | null
          created_at?: string | null
          id?: string
          job_type: string
          providers_json: Json
        }
        Update: {
          config_json?: Json | null
          created_at?: string | null
          id?: string
          job_type?: string
          providers_json?: Json
        }
        Relationships: []
      }
      quantum_runs: {
        Row: {
          created_at: string | null
          id: string
          inputs_json: Json | null
          metrics_json: Json | null
          mode: string
          outputs_json: Json | null
          problem_type: string
          session_id: string | null
          status: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          inputs_json?: Json | null
          metrics_json?: Json | null
          mode: string
          outputs_json?: Json | null
          problem_type: string
          session_id?: string | null
          status?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          inputs_json?: Json | null
          metrics_json?: Json | null
          mode?: string
          outputs_json?: Json | null
          problem_type?: string
          session_id?: string | null
          status?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quantum_runs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "concierge_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quantum_runs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspace_settings"
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
      relight_profiles: {
        Row: {
          created_at: string | null
          id: string
          params_json: Json | null
          session_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          params_json?: Json | null
          session_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          params_json?: Json | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "relight_profiles_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "concierge_sessions"
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
      revenue_analytics: {
        Row: {
          ai_predictions: Json | null
          avg_booking_value: number | null
          bookings_count: number | null
          causal_insights: Json | null
          channel: string | null
          conversion_rate: number | null
          created_at: string | null
          date: string
          deposits_amount: number | null
          id: string
          revenue_amount: number | null
          source: string
          workspace_id: string | null
        }
        Insert: {
          ai_predictions?: Json | null
          avg_booking_value?: number | null
          bookings_count?: number | null
          causal_insights?: Json | null
          channel?: string | null
          conversion_rate?: number | null
          created_at?: string | null
          date: string
          deposits_amount?: number | null
          id?: string
          revenue_amount?: number | null
          source: string
          workspace_id?: string | null
        }
        Update: {
          ai_predictions?: Json | null
          avg_booking_value?: number | null
          bookings_count?: number | null
          causal_insights?: Json | null
          channel?: string | null
          conversion_rate?: number | null
          created_at?: string | null
          date?: string
          deposits_amount?: number | null
          id?: string
          revenue_amount?: number | null
          source?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "revenue_analytics_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspace_settings"
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
      session_estimation_logs: {
        Row: {
          artist_id: string | null
          audit_hash: string | null
          booking_id: string | null
          confidence_score: number | null
          conversation_id: string | null
          created_at: string
          estimation_result: Json
          id: string
          input_data: Json
          ml_adjustments: Json | null
          override_by: string | null
          override_reason: string | null
          override_values: Json | null
          reasoning_steps: Json | null
          revenue_forecast: Json | null
          was_overridden: boolean | null
        }
        Insert: {
          artist_id?: string | null
          audit_hash?: string | null
          booking_id?: string | null
          confidence_score?: number | null
          conversation_id?: string | null
          created_at?: string
          estimation_result: Json
          id?: string
          input_data: Json
          ml_adjustments?: Json | null
          override_by?: string | null
          override_reason?: string | null
          override_values?: Json | null
          reasoning_steps?: Json | null
          revenue_forecast?: Json | null
          was_overridden?: boolean | null
        }
        Update: {
          artist_id?: string | null
          audit_hash?: string | null
          booking_id?: string | null
          confidence_score?: number | null
          conversation_id?: string | null
          created_at?: string
          estimation_result?: Json
          id?: string
          input_data?: Json
          ml_adjustments?: Json | null
          override_by?: string | null
          override_reason?: string | null
          override_values?: Json | null
          reasoning_steps?: Json | null
          revenue_forecast?: Json | null
          was_overridden?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "session_estimation_logs_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "studio_artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_estimation_logs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_estimation_logs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "customer_booking_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_estimation_logs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
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
      sketch_approvals: {
        Row: {
          approved: boolean | null
          approved_by: string | null
          ar_screenshot_url: string | null
          body_part: string | null
          booking_id: string | null
          conversation_id: string | null
          created_at: string | null
          feedback: string | null
          id: string
          iteration_number: number | null
          parent_sketch_id: string | null
          prompt_used: string | null
          reference_url: string | null
          similarity_score: number | null
          sketch_url: string
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          approved?: boolean | null
          approved_by?: string | null
          ar_screenshot_url?: string | null
          body_part?: string | null
          booking_id?: string | null
          conversation_id?: string | null
          created_at?: string | null
          feedback?: string | null
          id?: string
          iteration_number?: number | null
          parent_sketch_id?: string | null
          prompt_used?: string | null
          reference_url?: string | null
          similarity_score?: number | null
          sketch_url: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          approved?: boolean | null
          approved_by?: string | null
          ar_screenshot_url?: string | null
          body_part?: string | null
          booking_id?: string | null
          conversation_id?: string | null
          created_at?: string | null
          feedback?: string | null
          id?: string
          iteration_number?: number | null
          parent_sketch_id?: string | null
          prompt_used?: string | null
          reference_url?: string | null
          similarity_score?: number | null
          sketch_url?: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sketch_approvals_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sketch_approvals_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "customer_booking_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sketch_approvals_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sketch_approvals_parent_sketch_id_fkey"
            columns: ["parent_sketch_id"]
            isOneToOne: false
            referencedRelation: "sketch_approvals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sketch_approvals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspace_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      sketch_learning_feedback: {
        Row: {
          artist_sentiment: number | null
          client_sentiment: number | null
          conversion_outcome: boolean | null
          created_at: string | null
          feedback_type: string
          id: string
          learned_patterns: Json | null
          marketing_engagement: Json | null
          sketch_id: string | null
        }
        Insert: {
          artist_sentiment?: number | null
          client_sentiment?: number | null
          conversion_outcome?: boolean | null
          created_at?: string | null
          feedback_type: string
          id?: string
          learned_patterns?: Json | null
          marketing_engagement?: Json | null
          sketch_id?: string | null
        }
        Update: {
          artist_sentiment?: number | null
          client_sentiment?: number | null
          conversion_outcome?: boolean | null
          created_at?: string | null
          feedback_type?: string
          id?: string
          learned_patterns?: Json | null
          marketing_engagement?: Json | null
          sketch_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sketch_learning_feedback_sketch_id_fkey"
            columns: ["sketch_id"]
            isOneToOne: false
            referencedRelation: "sketch_approvals"
            referencedColumns: ["id"]
          },
        ]
      }
      sleeve_canvases: {
        Row: {
          body_part: string
          canvas_url: string | null
          created_at: string | null
          id: string
          resolution_px: Json | null
          session_id: string
          unwrap_map_json: Json | null
        }
        Insert: {
          body_part: string
          canvas_url?: string | null
          created_at?: string | null
          id?: string
          resolution_px?: Json | null
          session_id: string
          unwrap_map_json?: Json | null
        }
        Update: {
          body_part?: string
          canvas_url?: string | null
          created_at?: string | null
          id?: string
          resolution_px?: Json | null
          session_id?: string
          unwrap_map_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "sleeve_canvases_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "concierge_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sleeve_concepts: {
        Row: {
          concept_canvas_url: string | null
          created_at: string | null
          id: string
          layout_job_id: string | null
          seams_fixed: boolean | null
          session_id: string
          status: string
          tiles_json: Json | null
        }
        Insert: {
          concept_canvas_url?: string | null
          created_at?: string | null
          id?: string
          layout_job_id?: string | null
          seams_fixed?: boolean | null
          session_id: string
          status?: string
          tiles_json?: Json | null
        }
        Update: {
          concept_canvas_url?: string | null
          created_at?: string | null
          id?: string
          layout_job_id?: string | null
          seams_fixed?: boolean | null
          session_id?: string
          status?: string
          tiles_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "sleeve_concepts_layout_job_id_fkey"
            columns: ["layout_job_id"]
            isOneToOne: false
            referencedRelation: "layout_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sleeve_concepts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "concierge_sessions"
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
      social_channels: {
        Row: {
          access_token_encrypted: string | null
          account_id: string | null
          account_username: string | null
          channel_name: string
          channel_type: string
          config: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          refresh_token_encrypted: string | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          access_token_encrypted?: string | null
          account_id?: string | null
          account_username?: string | null
          channel_name: string
          channel_type: string
          config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          refresh_token_encrypted?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          access_token_encrypted?: string | null
          account_id?: string | null
          account_username?: string | null
          channel_name?: string
          channel_type?: string
          config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          refresh_token_encrypted?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_channels_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspace_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      social_messages: {
        Row: {
          agent_confidence: number | null
          agent_response: string | null
          ai_insights: Json | null
          booking_intent_score: number | null
          channel_id: string | null
          content: string | null
          created_at: string | null
          direction: string
          escalation_reason: string | null
          external_id: string | null
          id: string
          media_urls: string[] | null
          message_type: string | null
          metadata: Json | null
          replied_at: string | null
          replied_by: string | null
          revenue_prediction: number | null
          sender_avatar: string | null
          sender_id: string | null
          sender_name: string | null
          sentiment_score: number | null
          status: string | null
          thread_id: string | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          agent_confidence?: number | null
          agent_response?: string | null
          ai_insights?: Json | null
          booking_intent_score?: number | null
          channel_id?: string | null
          content?: string | null
          created_at?: string | null
          direction: string
          escalation_reason?: string | null
          external_id?: string | null
          id?: string
          media_urls?: string[] | null
          message_type?: string | null
          metadata?: Json | null
          replied_at?: string | null
          replied_by?: string | null
          revenue_prediction?: number | null
          sender_avatar?: string | null
          sender_id?: string | null
          sender_name?: string | null
          sentiment_score?: number | null
          status?: string | null
          thread_id?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          agent_confidence?: number | null
          agent_response?: string | null
          ai_insights?: Json | null
          booking_intent_score?: number | null
          channel_id?: string | null
          content?: string | null
          created_at?: string | null
          direction?: string
          escalation_reason?: string | null
          external_id?: string | null
          id?: string
          media_urls?: string[] | null
          message_type?: string | null
          metadata?: Json | null
          replied_at?: string | null
          replied_by?: string | null
          revenue_prediction?: number | null
          sender_avatar?: string | null
          sender_id?: string | null
          sender_name?: string | null
          sentiment_score?: number | null
          status?: string | null
          thread_id?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "social_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_messages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspace_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      social_trends: {
        Row: {
          adaptability_score: number | null
          audio_name: string | null
          audio_url: string | null
          best_posting_times: string[] | null
          created_at: string | null
          description: string | null
          detected_at: string | null
          engagement_rate: number | null
          example_urls: string[] | null
          expires_estimate: string | null
          hashtags: string[] | null
          id: string
          platform: string
          status: string | null
          suggested_script: Json | null
          tattoo_relevance: string | null
          title: string
          trend_type: string
          updated_at: string | null
          views_estimate: string | null
          viral_score: number | null
        }
        Insert: {
          adaptability_score?: number | null
          audio_name?: string | null
          audio_url?: string | null
          best_posting_times?: string[] | null
          created_at?: string | null
          description?: string | null
          detected_at?: string | null
          engagement_rate?: number | null
          example_urls?: string[] | null
          expires_estimate?: string | null
          hashtags?: string[] | null
          id?: string
          platform: string
          status?: string | null
          suggested_script?: Json | null
          tattoo_relevance?: string | null
          title: string
          trend_type: string
          updated_at?: string | null
          views_estimate?: string | null
          viral_score?: number | null
        }
        Update: {
          adaptability_score?: number | null
          audio_name?: string | null
          audio_url?: string | null
          best_posting_times?: string[] | null
          created_at?: string | null
          description?: string | null
          detected_at?: string | null
          engagement_rate?: number | null
          example_urls?: string[] | null
          expires_estimate?: string | null
          hashtags?: string[] | null
          id?: string
          platform?: string
          status?: string | null
          suggested_script?: Json | null
          tattoo_relevance?: string | null
          title?: string
          trend_type?: string
          updated_at?: string | null
          views_estimate?: string | null
          viral_score?: number | null
        }
        Relationships: []
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
          workspace_id: string | null
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
          workspace_id?: string | null
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
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "studio_policies_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "studio_artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_policies_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspace_settings"
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
      style_token_events: {
        Row: {
          created_at: string | null
          id: string
          new_value: number | null
          old_value: number | null
          session_id: string | null
          source: string | null
          token_key: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          new_value?: number | null
          old_value?: number | null
          session_id?: string | null
          source?: string | null
          token_key: string
        }
        Update: {
          created_at?: string | null
          id?: string
          new_value?: number | null
          old_value?: number | null
          session_id?: string | null
          source?: string | null
          token_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "style_token_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "concierge_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      style_token_sets: {
        Row: {
          active: boolean | null
          artist_id: string
          created_at: string | null
          id: string
          name: string
          tokens_json: Json | null
        }
        Insert: {
          active?: boolean | null
          artist_id: string
          created_at?: string | null
          id?: string
          name: string
          tokens_json?: Json | null
        }
        Update: {
          active?: boolean | null
          artist_id?: string
          created_at?: string | null
          id?: string
          name?: string
          tokens_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "style_token_sets_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "studio_artists"
            referencedColumns: ["id"]
          },
        ]
      }
      style_tokens: {
        Row: {
          artist_id: string
          created_at: string | null
          current_value: number | null
          id: string
          locked: boolean | null
          max_value: number | null
          min_value: number | null
          semantic_label: string | null
          token_key: string
          vector_json: Json | null
        }
        Insert: {
          artist_id: string
          created_at?: string | null
          current_value?: number | null
          id?: string
          locked?: boolean | null
          max_value?: number | null
          min_value?: number | null
          semantic_label?: string | null
          token_key: string
          vector_json?: Json | null
        }
        Update: {
          artist_id?: string
          created_at?: string | null
          current_value?: number | null
          id?: string
          locked?: boolean | null
          max_value?: number | null
          min_value?: number | null
          semantic_label?: string | null
          token_key?: string
          vector_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "style_tokens_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "studio_artists"
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
      tattoo_references: {
        Row: {
          analysis_report: Json | null
          analysis_status: string | null
          artist_notes: string | null
          body_part_detected: Json | null
          booking_id: string | null
          client_email: string | null
          client_summary: string | null
          color_palette: string[] | null
          color_usage: string | null
          complexity_score: number | null
          created_at: string
          estimated_hours: number | null
          guidelines_compliance: Json | null
          id: string
          image_quality: string | null
          images: string[]
          low_confidence: boolean | null
          overall_decision: string | null
          placement_suggestions: string[] | null
          processing_stage: string | null
          recommendations: Json | null
          size_estimate: Json | null
          skin_analysis: Json | null
          style_detected: string[] | null
          style_match_ferunda: Json | null
          technical_viability: Json | null
          updated_at: string
          validation_errors: Json | null
        }
        Insert: {
          analysis_report?: Json | null
          analysis_status?: string | null
          artist_notes?: string | null
          body_part_detected?: Json | null
          booking_id?: string | null
          client_email?: string | null
          client_summary?: string | null
          color_palette?: string[] | null
          color_usage?: string | null
          complexity_score?: number | null
          created_at?: string
          estimated_hours?: number | null
          guidelines_compliance?: Json | null
          id?: string
          image_quality?: string | null
          images?: string[]
          low_confidence?: boolean | null
          overall_decision?: string | null
          placement_suggestions?: string[] | null
          processing_stage?: string | null
          recommendations?: Json | null
          size_estimate?: Json | null
          skin_analysis?: Json | null
          style_detected?: string[] | null
          style_match_ferunda?: Json | null
          technical_viability?: Json | null
          updated_at?: string
          validation_errors?: Json | null
        }
        Update: {
          analysis_report?: Json | null
          analysis_status?: string | null
          artist_notes?: string | null
          body_part_detected?: Json | null
          booking_id?: string | null
          client_email?: string | null
          client_summary?: string | null
          color_palette?: string[] | null
          color_usage?: string | null
          complexity_score?: number | null
          created_at?: string
          estimated_hours?: number | null
          guidelines_compliance?: Json | null
          id?: string
          image_quality?: string | null
          images?: string[]
          low_confidence?: boolean | null
          overall_decision?: string | null
          placement_suggestions?: string[] | null
          processing_stage?: string | null
          recommendations?: Json | null
          size_estimate?: Json | null
          skin_analysis?: Json | null
          style_detected?: string[] | null
          style_match_ferunda?: Json | null
          technical_viability?: Json | null
          updated_at?: string
          validation_errors?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "tattoo_references_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tattoo_references_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "customer_booking_view"
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
      training_examples: {
        Row: {
          created_at: string | null
          id: string
          inputs_json: Json | null
          outcome_json: Json | null
          outputs_json: Json | null
          quality_score: number | null
          session_id: string | null
          used_for_training: boolean | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          inputs_json?: Json | null
          outcome_json?: Json | null
          outputs_json?: Json | null
          quality_score?: number | null
          session_id?: string | null
          used_for_training?: boolean | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          inputs_json?: Json | null
          outcome_json?: Json | null
          outputs_json?: Json | null
          quality_score?: number | null
          session_id?: string | null
          used_for_training?: boolean | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_examples_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "concierge_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_examples_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspace_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_events: {
        Row: {
          amount: number | null
          created_at: string | null
          id: string
          metadata_json: Json | null
          metric: string
          module_key: string
          workspace_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          id?: string
          metadata_json?: Json | null
          metric: string
          module_key?: string
          workspace_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          id?: string
          metadata_json?: Json | null
          metric?: string
          module_key?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspace_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          user_id?: string
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
      vision_3d_jobs: {
        Row: {
          created_at: string | null
          id: string
          input_video_url: string | null
          outputs_json: Json | null
          provider: string | null
          session_id: string
          status: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          input_video_url?: string | null
          outputs_json?: Json | null
          provider?: string | null
          session_id: string
          status?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          input_video_url?: string | null
          outputs_json?: Json | null
          provider?: string | null
          session_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "vision_3d_jobs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "concierge_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      vision_assets: {
        Row: {
          asset_type: string
          created_at: string | null
          id: string
          metadata_json: Json | null
          quality_issues: Json | null
          quality_score: number | null
          session_id: string
          storage_url: string
          thumbnail_url: string | null
        }
        Insert: {
          asset_type: string
          created_at?: string | null
          id?: string
          metadata_json?: Json | null
          quality_issues?: Json | null
          quality_score?: number | null
          session_id: string
          storage_url: string
          thumbnail_url?: string | null
        }
        Update: {
          asset_type?: string
          created_at?: string | null
          id?: string
          metadata_json?: Json | null
          quality_issues?: Json | null
          quality_score?: number | null
          session_id?: string
          storage_url?: string
          thumbnail_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vision_assets_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "concierge_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      vision_extractions: {
        Row: {
          asset_id: string
          body_part: string | null
          created_at: string | null
          id: string
          issues_json: Json | null
          landmarks_json: Json | null
          quality_score: number | null
          session_id: string | null
          status: string
          tattoo_cutout_png_url: string | null
          tattoo_mask_url: string | null
          tattoo_unwarped_png_url: string | null
        }
        Insert: {
          asset_id: string
          body_part?: string | null
          created_at?: string | null
          id?: string
          issues_json?: Json | null
          landmarks_json?: Json | null
          quality_score?: number | null
          session_id?: string | null
          status?: string
          tattoo_cutout_png_url?: string | null
          tattoo_mask_url?: string | null
          tattoo_unwarped_png_url?: string | null
        }
        Update: {
          asset_id?: string
          body_part?: string | null
          created_at?: string | null
          id?: string
          issues_json?: Json | null
          landmarks_json?: Json | null
          quality_score?: number | null
          session_id?: string | null
          status?: string
          tattoo_cutout_png_url?: string | null
          tattoo_mask_url?: string | null
          tattoo_unwarped_png_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vision_extractions_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "vision_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vision_extractions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "concierge_sessions"
            referencedColumns: ["id"]
          },
        ]
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
          allow_direct_consult: boolean
          allow_direct_flash: boolean
          allow_direct_touchup: boolean
          ar_auto_generate: boolean | null
          ar_require_approval: boolean | null
          ar_similarity_threshold: number | null
          ar_sketch_enabled: boolean | null
          brand_tone: string
          coverup_always_request: boolean
          created_at: string
          currency: string
          custom_always_request: boolean
          hold_minutes: number
          hold_slot_minutes: number
          id: string
          late_threshold_minutes: number
          locale: string
          mix_mode: boolean
          notice_window_hours: number
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
          allow_direct_consult?: boolean
          allow_direct_flash?: boolean
          allow_direct_touchup?: boolean
          ar_auto_generate?: boolean | null
          ar_require_approval?: boolean | null
          ar_similarity_threshold?: number | null
          ar_sketch_enabled?: boolean | null
          brand_tone?: string
          coverup_always_request?: boolean
          created_at?: string
          currency?: string
          custom_always_request?: boolean
          hold_minutes?: number
          hold_slot_minutes?: number
          id?: string
          late_threshold_minutes?: number
          locale?: string
          mix_mode?: boolean
          notice_window_hours?: number
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
          allow_direct_consult?: boolean
          allow_direct_flash?: boolean
          allow_direct_touchup?: boolean
          ar_auto_generate?: boolean | null
          ar_require_approval?: boolean | null
          ar_similarity_threshold?: number | null
          ar_sketch_enabled?: boolean | null
          brand_tone?: string
          coverup_always_request?: boolean
          created_at?: string
          currency?: string
          custom_always_request?: boolean
          hold_minutes?: number
          hold_slot_minutes?: number
          id?: string
          late_threshold_minutes?: number
          locale?: string
          mix_mode?: boolean
          notice_window_hours?: number
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
      finance_dashboard_metrics: {
        Row: {
          confirmed_bookings: number | null
          month: string | null
          pending_bookings: number | null
          pending_deposit_amount: number | null
          pending_deposits: number | null
          total_deposit_amount: number | null
          total_deposits_received: number | null
          total_revenue: number | null
        }
        Relationships: []
      }
      studio_analytics_view: {
        Row: {
          cancelled: number | null
          completed: number | null
          confirmed: number | null
          deposit_conversion_rate: number | null
          month: string | null
          revenue: number | null
          total_bookings: number | null
          unique_clients: number | null
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
      calculate_readiness_score: {
        Args: { p_session_id: string }
        Returns: number
      }
      can_offer_sketch: { Args: { p_session_id: string }; Returns: Json }
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
      check_workspace_access: {
        Args: { p_required_roles?: string[]; p_workspace_id: string }
        Returns: boolean
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
      detect_concierge_intent: { Args: { p_message: string }; Returns: Json }
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
      is_workspace_member: { Args: { w_id: string }; Returns: boolean }
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
      workspace_has_members: {
        Args: { p_workspace_id: string }
        Returns: boolean
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
