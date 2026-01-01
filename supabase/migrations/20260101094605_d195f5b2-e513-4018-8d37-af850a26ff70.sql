
-- =====================================================
-- CONCIERGE DESIGN COMPILER - COMPLETE SCHEMA
-- =====================================================

-- 1) CORE CONCIERGE TABLES
-- =====================================================

-- Main session tracking with stage machine
CREATE TABLE public.concierge_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id),
  client_id UUID,
  artist_id UUID REFERENCES public.studio_artists(id),
  conversation_id UUID REFERENCES public.chat_conversations(id),
  
  -- Stage machine
  stage TEXT NOT NULL DEFAULT 'discovery' CHECK (stage IN ('discovery', 'brief_building', 'design_alignment', 'preview_ready', 'scheduling', 'deposit', 'confirmed')),
  
  -- Structured brief
  design_brief_json JSONB DEFAULT '{
    "placement_zone": null,
    "size_category": null,
    "size_cm": null,
    "style_tags": [],
    "color_mode": null,
    "accent_color": null,
    "concept_summary": null,
    "is_sleeve": false,
    "sleeve_type": null,
    "sleeve_theme": null,
    "elements_json": {"hero": [], "secondary": [], "fillers": []},
    "references_count": 0,
    "placement_photo_present": false,
    "existing_tattoos_present": false,
    "timeline_preference": null,
    "budget_range": null
  }'::jsonb,
  
  -- Readiness scoring
  readiness_score NUMERIC(3,2) DEFAULT 0 CHECK (readiness_score >= 0 AND readiness_score <= 1),
  
  -- Intent detection
  intent_flags_json JSONB DEFAULT '{"preview_request": false, "doubt": false, "urgency": false, "comparison": false}'::jsonb,
  
  -- Anti-spam gating
  sketch_offer_cooldown_until TIMESTAMPTZ,
  sketch_offer_declined_count INT DEFAULT 0,
  last_sketch_offer_at TIMESTAMPTZ,
  max_offers_reached BOOLEAN DEFAULT false,
  
  -- Metadata
  message_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Messages with attachments
CREATE TABLE public.concierge_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.concierge_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT,
  attachments_json JSONB DEFAULT '[]'::jsonb,
  intent_detected JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Job tracking for all async operations
CREATE TABLE public.concierge_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.concierge_sessions(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL CHECK (job_type IN ('vision', 'extract', '3d', 'concept', 'style', 'sketch', 'ar_pack', 'ar_live', 'ensemble', 'feasibility', 'codesign', 'relight')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'done', 'failed')),
  provider TEXT,
  progress INT DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  inputs_json JSONB,
  outputs_json JSONB,
  error_code TEXT,
  error_message TEXT,
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 2,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Actions log for analytics
CREATE TABLE public.concierge_actions_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.concierge_sessions(id) ON DELETE CASCADE,
  action_key TEXT NOT NULL,
  payload_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- AI usage tracking
CREATE TABLE public.ai_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id),
  session_id UUID REFERENCES public.concierge_sessions(id),
  task_type TEXT NOT NULL,
  provider TEXT,
  model TEXT,
  tokens_in INT,
  tokens_out INT,
  latency_ms INT,
  cost_estimate NUMERIC(10,6),
  success BOOLEAN DEFAULT true,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Usage events for billing/analytics
CREATE TABLE public.usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id),
  module_key TEXT NOT NULL DEFAULT 'concierge_design_compiler',
  metric TEXT NOT NULL,
  amount NUMERIC,
  metadata_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2) VISION STACK TABLES
-- =====================================================

CREATE TABLE public.vision_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.concierge_sessions(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('reference_image', 'placement_photo', 'body_ref', 'video', 'cutout', 'unwarped')),
  storage_url TEXT NOT NULL,
  thumbnail_url TEXT,
  metadata_json JSONB DEFAULT '{}'::jsonb,
  quality_score NUMERIC(3,2),
  quality_issues JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.vision_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.vision_assets(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.concierge_sessions(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  body_part TEXT,
  landmarks_json JSONB,
  quality_score NUMERIC(3,2),
  issues_json JSONB,
  tattoo_cutout_png_url TEXT,
  tattoo_mask_url TEXT,
  tattoo_unwarped_png_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.vision_3d_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.concierge_sessions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  input_video_url TEXT,
  outputs_json JSONB,
  provider TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3) ARTIST STYLE DNA TABLES
-- =====================================================

CREATE TABLE public.artist_portfolio_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES public.studio_artists(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  tags_json JSONB DEFAULT '[]'::jsonb,
  embedding_json JSONB,
  analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.artist_style_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES public.studio_artists(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'training', 'ready', 'failed')),
  model_type TEXT DEFAULT 'lora',
  provider TEXT,
  model_ref TEXT,
  version INT DEFAULT 1,
  metrics_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.image_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('portfolio', 'reference', 'concept', 'final')),
  entity_id UUID NOT NULL,
  embedding_json JSONB NOT NULL,
  model TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.originality_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.concierge_sessions(id),
  concept_id UUID,
  reference_id UUID,
  similarity_score NUMERIC(4,3),
  verdict TEXT CHECK (verdict IN ('pass', 'too_close', 'needs_review')),
  details_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4) SLEEVE COMPILER TABLES
-- =====================================================

CREATE TABLE public.sleeve_canvases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.concierge_sessions(id) ON DELETE CASCADE,
  body_part TEXT NOT NULL,
  unwrap_map_json JSONB,
  canvas_url TEXT,
  resolution_px JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.layout_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.concierge_sessions(id) ON DELETE CASCADE,
  canvas_id UUID REFERENCES public.sleeve_canvases(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'done', 'failed')),
  elements_json JSONB,
  constraints_json JSONB,
  mode TEXT DEFAULT 'classical' CHECK (mode IN ('classical', 'quantum_inspired', 'quantum_remote')),
  outputs_json JSONB,
  flow_score NUMERIC(3,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.sleeve_concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.concierge_sessions(id) ON DELETE CASCADE,
  layout_job_id UUID REFERENCES public.layout_jobs(id),
  status TEXT NOT NULL DEFAULT 'pending',
  concept_canvas_url TEXT,
  seams_fixed BOOLEAN DEFAULT false,
  tiles_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5) CONCEPT GENERATOR TABLES
-- =====================================================

CREATE TABLE public.concept_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.concierge_sessions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  provider_used TEXT,
  model_used TEXT,
  inputs_json JSONB,
  outputs_json JSONB,
  strategy_used TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.concept_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.concept_jobs(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.concierge_sessions(id),
  idx INT NOT NULL,
  image_url TEXT,
  thumbnail_url TEXT,
  scores_json JSONB DEFAULT '{
    "style_alignment_score": null,
    "clarity_score": null,
    "uniqueness_score": null,
    "ar_fitness_score": null,
    "sleeve_flow_score": null
  }'::jsonb,
  chosen BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.conversion_bandit_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID UNIQUE REFERENCES public.workspace_settings(id),
  state_json JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6) SKETCH FINALIZER TABLES
-- =====================================================

CREATE TABLE public.final_sketches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.concierge_sessions(id) ON DELETE CASCADE,
  chosen_variant_id UUID REFERENCES public.concept_variants(id),
  lineart_png_url TEXT,
  overlay_png_url TEXT,
  svg_url TEXT,
  metadata_json JSONB DEFAULT '{
    "placement_zone": null,
    "recommended_size_cm": null,
    "rotation_degrees": 0,
    "anchor_points_json": [],
    "opacity_default": 0.85
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.ar_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.concierge_sessions(id) ON DELETE CASCADE,
  final_sketch_id UUID REFERENCES public.final_sketches(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'building', 'done', 'failed')),
  assets_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7) AR LIVE TABLES
-- =====================================================

CREATE TABLE public.ar_live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.concierge_sessions(id) ON DELETE CASCADE,
  ar_pack_id UUID REFERENCES public.ar_packs(id),
  device_caps_json JSONB,
  calibration_json JSONB,
  mode TEXT DEFAULT 'live' CHECK (mode IN ('live', 'photo_fallback')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.ar_live_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ar_live_session_id UUID NOT NULL REFERENCES public.ar_live_sessions(id) ON DELETE CASCADE,
  video_url TEXT,
  duration_seconds INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.ar_live_calibrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.concierge_sessions(id) ON DELETE CASCADE,
  device_caps_json JSONB,
  calibration_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.ar_live_renders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.concierge_sessions(id) ON DELETE CASCADE,
  mode TEXT CHECK (mode IN ('live', 'photo_fallback')),
  video_url TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.relight_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.concierge_sessions(id) ON DELETE CASCADE,
  params_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.ar_shader_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id),
  key TEXT NOT NULL,
  name TEXT,
  params_json JSONB,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8) DIAGNOSTICS TABLES
-- =====================================================

CREATE TABLE public.job_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.concierge_jobs(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  info_json JSONB,
  timestamp TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.job_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.concierge_jobs(id) ON DELETE CASCADE,
  error_code TEXT,
  provider TEXT,
  message TEXT,
  retryable BOOLEAN DEFAULT true,
  inputs_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9) GOD MODE / FEATURE FLAGS TABLES
-- =====================================================

CREATE TABLE public.feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspace_settings(id),
  key TEXT NOT NULL,
  enabled BOOLEAN DEFAULT false,
  config_json JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, key)
);

CREATE TABLE public.concierge_offer_policy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID UNIQUE REFERENCES public.workspace_settings(id),
  policy_json JSONB DEFAULT '{
    "min_messages_before_preview_offer": 5,
    "preview_offer_cooldown_minutes": 30,
    "max_preview_offers_per_session": 3,
    "sleeve_requires_min_references": 8,
    "single_requires_min_references": 3,
    "require_placement_photo_for_ar_live": true,
    "single_readiness_threshold": 0.75,
    "sleeve_readiness_threshold": 0.85,
    "preview_request_threshold": 0.55,
    "sleeve_preview_request_threshold": 0.70
  }'::jsonb,
  preset TEXT DEFAULT 'balanced' CHECK (preset IN ('conservative', 'balanced', 'aggressive')),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 10) NEURAL CO-DESIGN TABLES
-- =====================================================

CREATE TABLE public.codesign_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.concierge_sessions(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'locked', 'finalized')),
  current_vector_json JSONB DEFAULT '{
    "line_weight": 50,
    "contrast": 50,
    "realism_vs_stylized": 50,
    "ornament_density": 50,
    "negative_space": 50,
    "symmetry": 50,
    "motion_flow": 50
  }'::jsonb,
  locked_axes JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.codesign_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codesign_session_id UUID NOT NULL REFERENCES public.codesign_sessions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('slider_change', 'ab_choice', 'lock', 'comment', 'generate')),
  payload_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.preference_model_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codesign_session_id UUID UNIQUE REFERENCES public.codesign_sessions(id) ON DELETE CASCADE,
  state_json JSONB DEFAULT '{}'::jsonb,
  model_type TEXT DEFAULT 'bradley_terry',
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.codesign_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codesign_session_id UUID NOT NULL REFERENCES public.codesign_sessions(id) ON DELETE CASCADE,
  idx INT NOT NULL,
  image_url TEXT,
  params_json JSONB,
  scores_json JSONB,
  chosen BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 11) CONVERSION ENGINE TABLES
-- =====================================================

CREATE TABLE public.conversion_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.concierge_sessions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('preview_offered', 'preview_viewed', 'deposit_link_sent', 'deposit_paid', 'booking_confirmed', 'client_dropoff')),
  metadata_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.conversion_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID UNIQUE REFERENCES public.workspace_settings(id),
  state_json JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.copy_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id),
  context_key TEXT NOT NULL,
  variants_json JSONB NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.offer_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id),
  strategies_json JSONB NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 12) PROVIDER FALLBACK TABLES
-- =====================================================

CREATE TABLE public.provider_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'up' CHECK (status IN ('up', 'degraded', 'down')),
  latency_ms INT,
  error_rate NUMERIC(4,3),
  last_checked_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.provider_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,
  providers_json JSONB NOT NULL,
  config_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.chaos_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id),
  job_type TEXT NOT NULL,
  simulate_fail_rate NUMERIC(3,2) DEFAULT 0,
  enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 13) QUANTUM ENGINE TABLES
-- =====================================================

CREATE TABLE public.quantum_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.concierge_sessions(id),
  workspace_id UUID REFERENCES public.workspace_settings(id),
  problem_type TEXT NOT NULL CHECK (problem_type IN ('layout', 'schedule', 'optimization')),
  mode TEXT NOT NULL CHECK (mode IN ('classical', 'quantum_inspired', 'quantum_remote')),
  status TEXT DEFAULT 'pending',
  inputs_json JSONB,
  outputs_json JSONB,
  metrics_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 14) ENSEMBLE CONSENSUS TABLES
-- =====================================================

CREATE TABLE public.ensemble_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.concierge_sessions(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'evaluating', 'done', 'failed')),
  strategy_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.ensemble_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.ensemble_runs(id) ON DELETE CASCADE,
  provider TEXT,
  model TEXT,
  image_url TEXT,
  scores_json JSONB,
  verdict TEXT CHECK (verdict IN ('pass', 'fail', 'pending')),
  rank INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.eval_suites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  description TEXT,
  thresholds_json JSONB DEFAULT '{
    "style_alignment": 0.7,
    "originality": 0.7,
    "ar_fitness": 0.6,
    "clarity": 0.7,
    "sleeve_flow": 0.75
  }'::jsonb,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.eval_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.ensemble_candidates(id) ON DELETE CASCADE,
  suite_key TEXT,
  results_json JSONB,
  passed BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 15) FEASIBILITY LAB TABLES
-- =====================================================

CREATE TABLE public.feasibility_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.concierge_sessions(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.concept_variants(id),
  status TEXT DEFAULT 'pending',
  results_json JSONB DEFAULT '{
    "micro_detail_score": null,
    "density_score": null,
    "text_legibility_score": null,
    "overall_feasibility_score": null,
    "recommendations": []
  }'::jsonb,
  aged_previews_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 16) OFFLINE MODE TABLES
-- =====================================================

CREATE TABLE public.offline_queues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.concierge_sessions(id) ON DELETE CASCADE,
  user_id UUID,
  queued_events_json JSONB DEFAULT '[]'::jsonb,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.device_caps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  fingerprint_hash TEXT,
  caps_json JSONB,
  webgpu_supported BOOLEAN,
  webxr_supported BOOLEAN,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 17) COLLABORATION TABLES
-- =====================================================

CREATE TABLE public.collab_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.concierge_sessions(id) ON DELETE CASCADE,
  room_id TEXT UNIQUE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  participants_json JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.collab_ops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.collab_rooms(id) ON DELETE CASCADE,
  op_json JSONB NOT NULL,
  author_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.design_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.concierge_sessions(id) ON DELETE CASCADE,
  version_num INT NOT NULL,
  image_url TEXT,
  params_json JSONB,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.design_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.concierge_sessions(id) ON DELETE CASCADE,
  version_id UUID REFERENCES public.design_versions(id),
  author_id UUID,
  anchor_json JSONB,
  comment_text TEXT,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 18) SELF-IMPROVING SYSTEM TABLES
-- =====================================================

CREATE TABLE public.training_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.concierge_sessions(id),
  workspace_id UUID REFERENCES public.workspace_settings(id),
  inputs_json JSONB,
  outputs_json JSONB,
  outcome_json JSONB,
  quality_score NUMERIC(3,2),
  used_for_training BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.prompt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id),
  key TEXT NOT NULL,
  version INT NOT NULL,
  prompt_text TEXT,
  metrics_json JSONB,
  active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.model_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID REFERENCES public.studio_artists(id),
  workspace_id UUID REFERENCES public.workspace_settings(id),
  model_type TEXT NOT NULL,
  version INT NOT NULL,
  model_ref TEXT,
  metrics_json JSONB,
  active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.ab_rollouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspace_settings(id),
  key TEXT NOT NULL,
  variants_json JSONB NOT NULL,
  traffic_split_json JSONB,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 19) ORIGINALITY / PROVENANCE TABLES
-- =====================================================

CREATE TABLE public.originality_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.concierge_sessions(id) ON DELETE CASCADE,
  final_variant_id UUID REFERENCES public.concept_variants(id),
  report_json JSONB,
  verdict TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.provenance_chain (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.concierge_sessions(id) ON DELETE CASCADE,
  step_key TEXT NOT NULL,
  step_num INT,
  input_hash TEXT,
  output_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 20) STYLE TOKENIZER TABLES
-- =====================================================

CREATE TABLE public.style_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES public.studio_artists(id) ON DELETE CASCADE,
  token_key TEXT NOT NULL,
  vector_json JSONB,
  semantic_label TEXT,
  min_value NUMERIC DEFAULT 0,
  max_value NUMERIC DEFAULT 100,
  current_value NUMERIC DEFAULT 50,
  locked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(artist_id, token_key)
);

CREATE TABLE public.style_token_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES public.studio_artists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tokens_json JSONB,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.style_token_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.concierge_sessions(id),
  token_key TEXT NOT NULL,
  old_value NUMERIC,
  new_value NUMERIC,
  source TEXT CHECK (source IN ('artist', 'codesign', 'auto', 'client')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 21) NEURAL BODY ATLAS TABLES
-- =====================================================

CREATE TABLE public.body_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID,
  session_id UUID REFERENCES public.concierge_sessions(id),
  body_part TEXT NOT NULL,
  geometry_type TEXT DEFAULT 'estimated' CHECK (geometry_type IN ('estimated', 'photo', 'video', '3d')),
  profile_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.body_landmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  body_profile_id UUID NOT NULL REFERENCES public.body_profiles(id) ON DELETE CASCADE,
  landmark_key TEXT NOT NULL,
  position_json JSONB,
  confidence NUMERIC(3,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.body_uv_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  body_profile_id UUID NOT NULL REFERENCES public.body_profiles(id) ON DELETE CASCADE,
  uv_map_url TEXT,
  unwrap_type TEXT DEFAULT 'cylindrical' CHECK (unwrap_type IN ('cylindrical', 'neural', 'custom')),
  resolution_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.deformation_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  body_profile_id UUID NOT NULL REFERENCES public.body_profiles(id) ON DELETE CASCADE,
  zone_key TEXT NOT NULL,
  deformation_score NUMERIC(3,2),
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_concierge_sessions_workspace ON public.concierge_sessions(workspace_id);
CREATE INDEX idx_concierge_sessions_stage ON public.concierge_sessions(stage);
CREATE INDEX idx_concierge_messages_session ON public.concierge_messages(session_id);
CREATE INDEX idx_concierge_jobs_session ON public.concierge_jobs(session_id);
CREATE INDEX idx_concierge_jobs_status ON public.concierge_jobs(status);
CREATE INDEX idx_vision_assets_session ON public.vision_assets(session_id);
CREATE INDEX idx_concept_variants_job ON public.concept_variants(job_id);
CREATE INDEX idx_feature_flags_workspace ON public.feature_flags(workspace_id);
CREATE INDEX idx_conversion_events_session ON public.conversion_events(session_id);
CREATE INDEX idx_ensemble_candidates_run ON public.ensemble_candidates(run_id);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to calculate readiness score
CREATE OR REPLACE FUNCTION public.calculate_readiness_score(p_session_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_brief JSONB;
  v_is_sleeve BOOLEAN;
  v_score NUMERIC := 0;
  v_placement_present BOOLEAN;
  v_size_present BOOLEAN;
  v_style_count INT;
  v_concept_present BOOLEAN;
  v_refs_count INT;
  v_placement_photo BOOLEAN;
  v_hero_count INT;
  v_secondary_count INT;
  v_filler_count INT;
  v_sleeve_type_present BOOLEAN;
  v_sleeve_theme_present BOOLEAN;
BEGIN
  SELECT design_brief_json INTO v_brief FROM concierge_sessions WHERE id = p_session_id;
  
  IF v_brief IS NULL THEN
    RETURN 0;
  END IF;
  
  v_is_sleeve := COALESCE((v_brief->>'is_sleeve')::boolean, false);
  v_placement_present := v_brief->>'placement_zone' IS NOT NULL AND v_brief->>'placement_zone' != '';
  v_size_present := v_brief->>'size_category' IS NOT NULL OR v_brief->>'size_cm' IS NOT NULL;
  v_style_count := COALESCE(jsonb_array_length(v_brief->'style_tags'), 0);
  v_concept_present := v_brief->>'concept_summary' IS NOT NULL AND v_brief->>'concept_summary' != '';
  v_refs_count := COALESCE((v_brief->>'references_count')::int, 0);
  v_placement_photo := COALESCE((v_brief->>'placement_photo_present')::boolean, false);
  
  IF v_is_sleeve THEN
    v_sleeve_type_present := v_brief->>'sleeve_type' IS NOT NULL;
    v_sleeve_theme_present := v_brief->>'sleeve_theme' IS NOT NULL AND v_brief->>'sleeve_theme' != '';
    v_hero_count := COALESCE(jsonb_array_length(v_brief->'elements_json'->'hero'), 0);
    v_secondary_count := COALESCE(jsonb_array_length(v_brief->'elements_json'->'secondary'), 0);
    v_filler_count := COALESCE(jsonb_array_length(v_brief->'elements_json'->'fillers'), 0);
    
    -- Sleeve scoring (stricter)
    IF v_sleeve_type_present THEN v_score := v_score + 0.10; END IF;
    IF v_sleeve_theme_present THEN v_score := v_score + 0.10; END IF;
    IF v_placement_present THEN v_score := v_score + 0.05; END IF;
    IF v_placement_photo THEN v_score := v_score + 0.15; END IF;
    IF v_hero_count >= 1 THEN v_score := v_score + 0.10; END IF;
    IF v_secondary_count >= 1 THEN v_score := v_score + 0.10; END IF;
    IF v_filler_count >= 1 THEN v_score := v_score + 0.10; END IF;
    v_score := v_score + LEAST(v_refs_count * 0.0375, 0.30); -- Max 0.30 for 8+ refs
  ELSE
    -- Single piece scoring
    IF v_placement_present THEN v_score := v_score + 0.20; END IF;
    IF v_size_present THEN v_score := v_score + 0.15; END IF;
    IF v_style_count >= 1 THEN v_score := v_score + 0.15; END IF;
    IF v_concept_present THEN v_score := v_score + 0.20; END IF;
    v_score := v_score + LEAST(v_refs_count * 0.10, 0.30); -- Max 0.30 for 3+ refs
  END IF;
  
  -- Update session
  UPDATE concierge_sessions SET readiness_score = LEAST(v_score, 1.0), updated_at = now() WHERE id = p_session_id;
  
  RETURN LEAST(v_score, 1.0);
END;
$$;

-- Function to check if sketch/AR can be offered
CREATE OR REPLACE FUNCTION public.can_offer_sketch(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_session RECORD;
  v_policy JSONB;
  v_is_sleeve BOOLEAN;
  v_threshold NUMERIC;
  v_can_offer BOOLEAN := false;
  v_reason TEXT;
  v_missing JSONB := '[]'::jsonb;
BEGIN
  SELECT * INTO v_session FROM concierge_sessions WHERE id = p_session_id;
  
  IF v_session IS NULL THEN
    RETURN jsonb_build_object('can_offer', false, 'reason', 'Session not found');
  END IF;
  
  -- Get policy
  SELECT policy_json INTO v_policy FROM concierge_offer_policy WHERE workspace_id = v_session.workspace_id;
  IF v_policy IS NULL THEN
    v_policy := '{
      "min_messages_before_preview_offer": 5,
      "preview_offer_cooldown_minutes": 30,
      "max_preview_offers_per_session": 3,
      "single_readiness_threshold": 0.75,
      "sleeve_readiness_threshold": 0.85,
      "preview_request_threshold": 0.55,
      "sleeve_preview_request_threshold": 0.70
    }'::jsonb;
  END IF;
  
  v_is_sleeve := COALESCE((v_session.design_brief_json->>'is_sleeve')::boolean, false);
  
  -- Check cooldown
  IF v_session.sketch_offer_cooldown_until IS NOT NULL AND v_session.sketch_offer_cooldown_until > now() THEN
    RETURN jsonb_build_object('can_offer', false, 'reason', 'Cooldown active', 'cooldown_until', v_session.sketch_offer_cooldown_until);
  END IF;
  
  -- Check max offers
  IF v_session.max_offers_reached THEN
    RETURN jsonb_build_object('can_offer', false, 'reason', 'Max offers reached for this session');
  END IF;
  
  -- Determine threshold based on stage and intent
  IF v_session.stage IN ('design_alignment', 'preview_ready', 'scheduling', 'deposit', 'confirmed') THEN
    v_threshold := CASE WHEN v_is_sleeve THEN (v_policy->>'sleeve_readiness_threshold')::numeric ELSE (v_policy->>'single_readiness_threshold')::numeric END;
  ELSIF COALESCE((v_session.intent_flags_json->>'preview_request')::boolean, false) OR COALESCE((v_session.intent_flags_json->>'doubt')::boolean, false) THEN
    v_threshold := CASE WHEN v_is_sleeve THEN (v_policy->>'sleeve_preview_request_threshold')::numeric ELSE (v_policy->>'preview_request_threshold')::numeric END;
  ELSE
    RETURN jsonb_build_object('can_offer', false, 'reason', 'Stage not ready and no preview request detected');
  END IF;
  
  -- Check readiness score
  IF v_session.readiness_score >= v_threshold THEN
    v_can_offer := true;
    v_reason := 'Ready for preview';
  ELSE
    v_reason := 'Readiness score too low: ' || v_session.readiness_score::text || ' < ' || v_threshold::text;
    
    -- Calculate what's missing
    IF v_is_sleeve THEN
      IF v_session.design_brief_json->>'sleeve_type' IS NULL THEN
        v_missing := v_missing || '"sleeve_type"'::jsonb;
      END IF;
      IF COALESCE((v_session.design_brief_json->>'references_count')::int, 0) < 8 THEN
        v_missing := v_missing || ('"' || (8 - COALESCE((v_session.design_brief_json->>'references_count')::int, 0))::text || ' more references"')::jsonb;
      END IF;
      IF NOT COALESCE((v_session.design_brief_json->>'placement_photo_present')::boolean, false) THEN
        v_missing := v_missing || '"placement_photo"'::jsonb;
      END IF;
    ELSE
      IF COALESCE((v_session.design_brief_json->>'references_count')::int, 0) < 3 THEN
        v_missing := v_missing || ('"' || (3 - COALESCE((v_session.design_brief_json->>'references_count')::int, 0))::text || ' more references"')::jsonb;
      END IF;
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'can_offer', v_can_offer,
    'reason', v_reason,
    'readiness_score', v_session.readiness_score,
    'threshold', v_threshold,
    'is_sleeve', v_is_sleeve,
    'missing', v_missing,
    'stage', v_session.stage
  );
END;
$$;

-- Function to detect intent
CREATE OR REPLACE FUNCTION public.detect_concierge_intent(p_message TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_lower TEXT;
  v_intent JSONB := '{}'::jsonb;
BEGIN
  v_lower := lower(p_message);
  
  -- Preview request detection
  IF v_lower ~ '(quiero ver|want to see|how would|cómo queda|preview|visualiz|try.?on|probar|before.*book|antes.*reserv|antes.*agendar)' THEN
    v_intent := v_intent || '{"preview_request": true}'::jsonb;
  END IF;
  
  -- Doubt detection
  IF v_lower ~ '(no estoy seguro|not sure|duda|doubt|unsure|maybe|quizás|tal vez|pensando|thinking|consider)' THEN
    v_intent := v_intent || '{"doubt": true}'::jsonb;
  END IF;
  
  -- Urgency detection
  IF v_lower ~ '(urgente|urgent|asap|pronto|soon|esta semana|this week|rápido|quick|cuanto antes)' THEN
    v_intent := v_intent || '{"urgency": true}'::jsonb;
  END IF;
  
  -- Comparison detection
  IF v_lower ~ '(comparar|compare|vs|versus|diferencia|difference|cual es mejor|which is better|opciones|options)' THEN
    v_intent := v_intent || '{"comparison": true}'::jsonb;
  END IF;
  
  RETURN v_intent;
END;
$$;

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_concierge_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = 'public';

CREATE TRIGGER update_concierge_sessions_updated_at
BEFORE UPDATE ON public.concierge_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_concierge_session_timestamp();

CREATE TRIGGER update_concierge_jobs_updated_at
BEFORE UPDATE ON public.concierge_jobs
FOR EACH ROW EXECUTE FUNCTION public.update_concierge_session_timestamp();

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE public.concierge_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concierge_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concierge_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concierge_actions_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vision_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vision_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vision_3d_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concierge_offer_policy ENABLE ROW LEVEL SECURITY;

-- Workspace member policies
CREATE POLICY "Workspace members can manage concierge sessions"
ON public.concierge_sessions FOR ALL
USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can manage concierge messages"
ON public.concierge_messages FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.concierge_sessions cs 
  WHERE cs.id = session_id AND public.is_workspace_member(cs.workspace_id)
));

CREATE POLICY "Workspace members can manage concierge jobs"
ON public.concierge_jobs FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.concierge_sessions cs 
  WHERE cs.id = session_id AND public.is_workspace_member(cs.workspace_id)
));

CREATE POLICY "Workspace members can view actions log"
ON public.concierge_actions_log FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.concierge_sessions cs 
  WHERE cs.id = session_id AND public.is_workspace_member(cs.workspace_id)
));

CREATE POLICY "Workspace members can manage AI runs"
ON public.ai_runs FOR ALL
USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can manage usage events"
ON public.usage_events FOR ALL
USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can manage vision assets"
ON public.vision_assets FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.concierge_sessions cs 
  WHERE cs.id = session_id AND public.is_workspace_member(cs.workspace_id)
));

CREATE POLICY "Workspace members can manage feature flags"
ON public.feature_flags FOR ALL
USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can manage offer policy"
ON public.concierge_offer_policy FOR ALL
USING (public.is_workspace_member(workspace_id));

-- Service role policies for edge functions
CREATE POLICY "Service role full access concierge_sessions"
ON public.concierge_sessions FOR ALL
USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access concierge_messages"
ON public.concierge_messages FOR ALL
USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access concierge_jobs"
ON public.concierge_jobs FOR ALL
USING (auth.role() = 'service_role');

-- Insert default eval suite
INSERT INTO public.eval_suites (key, description, active) VALUES
('default', 'Default evaluation suite for concept quality', true);

-- Insert default provider routes
INSERT INTO public.provider_routes (job_type, providers_json) VALUES
('concept', '["lovable_ai", "openai", "gemini", "hf_diffusion"]'::jsonb),
('vision', '["sam2", "mediapipe", "fallback_simple"]'::jsonb),
('sketch', '["lovable_ai", "custom_diffusion"]'::jsonb),
('ar_pack', '["internal"]'::jsonb);

-- Insert default shader presets
INSERT INTO public.ar_shader_presets (key, name, params_json, active) VALUES
('natural', 'Natural', '{"relight_intensity": 0.5, "ink_diffusion": 0.3, "grain": 0.1}'::jsonb, true),
('editorial', 'Editorial', '{"relight_intensity": 0.7, "ink_diffusion": 0.2, "grain": 0.05}'::jsonb, true),
('high_contrast', 'High Contrast', '{"relight_intensity": 0.9, "ink_diffusion": 0.1, "grain": 0.02}'::jsonb, true);
