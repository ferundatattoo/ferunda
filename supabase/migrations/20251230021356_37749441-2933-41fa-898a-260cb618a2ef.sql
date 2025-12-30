-- =====================================================
-- TATTOO OS v3: Core Foundation Migration
-- Enums, Pre-Gate System, Structured Intents, Policy Engine
-- =====================================================

-- =====================================================
-- PART 1: ENUM TYPES (matching common.defs.json)
-- =====================================================

-- Decision outcomes
DO $$ BEGIN
  CREATE TYPE decision_type AS ENUM ('ALLOW', 'REVIEW', 'BLOCK');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Scope for policy rules
DO $$ BEGIN
  CREATE TYPE scope_type AS ENUM ('studio', 'location', 'artist', 'serviceType', 'resource');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Session models
DO $$ BEGIN
  CREATE TYPE session_model_type AS ENUM ('timed_slots', 'day_session', 'consult_first', 'multi_session_plan');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Work types
DO $$ BEGIN
  CREATE TYPE work_type_enum AS ENUM (
    'new_original', 'cover_up', 'touch_up_own_work', 'touch_up_other_artist',
    'rework', 'repeat_design', 'flash', 'consult_only', 'unknown'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Style tags (comprehensive taxonomy)
DO $$ BEGIN
  CREATE TYPE style_tag_enum AS ENUM (
    'black_and_grey_realism', 'micro_realism', 'portrait_realism', 'realism',
    'fine_line', 'single_needle', 'blackwork', 'dotwork', 'script', 'geometric',
    'illustrative', 'anime', 'american_traditional', 'neo_traditional', 'irezumi',
    'watercolor', 'new_school', 'color_realism', 'tribal', 'ornamental',
    'minimalist', 'surrealism', 'chicano', 'unknown'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Decline reason codes
DO $$ BEGIN
  CREATE TYPE decline_reason_code AS ENUM (
    'style_mismatch', 'color_requested', 'coverup_not_offered', 'touchup_not_offered',
    'rework_not_offered', 'repeat_not_offered', 'too_small_for_detail', 'outside_specialty',
    'budget_mismatch', 'deadline_mismatch', 'medical_review_required', 'content_policy_review',
    'age_verification_required', 'schedule_full', 'insufficient_info', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Risk flags
DO $$ BEGIN
  CREATE TYPE risk_flag_enum AS ENUM (
    'low_confidence', 'contradiction_detected', 'unclear_placement_photo',
    'missing_reference_images', 'tiny_size_for_detail', 'deadline_urgent',
    'budget_low', 'medical_review_required', 'content_policy_review',
    'age_verification_required', 'possible_coverup_hidden', 'possible_repeat',
    'possible_touchup', 'high_complexity', 'calendar_conflict', 'requires_artist_review'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Next action types
DO $$ BEGIN
  CREATE TYPE next_action_type AS ENUM (
    'ASK_FOLLOWUPS', 'REQUEST_REFERENCE_IMAGES', 'REQUEST_PLACEMENT_PHOTO',
    'REQUEST_ID', 'REQUEST_CONSENT', 'OFFER_CONSULT', 'OFFER_WAITLIST',
    'ROUTE_TO_ARTIST', 'ROUTE_TO_ADMIN', 'REROUTE_TO_OTHER_ARTIST',
    'SHOW_AVAILABILITY', 'BOOK_DAY', 'BOOK_SLOT', 'COLLECT_DEPOSIT',
    'SEND_DEPOSIT_LINK', 'CLOSE_OUT'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Trust tier for clients
DO $$ BEGIN
  CREATE TYPE trust_tier_enum AS ENUM ('new', 'standard', 'trusted', 'restricted');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- PART 2: PRE-GATE SYSTEM
-- =====================================================

-- Pre-gate questions (configurable boolean gates)
CREATE TABLE IF NOT EXISTS pre_gate_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID REFERENCES studio_artists(id) ON DELETE CASCADE,
  question_key TEXT NOT NULL,
  question_text TEXT NOT NULL,
  description TEXT,
  display_order INT DEFAULT 0,
  targets_field TEXT NOT NULL, -- wantsColor, isCoverUp, isTouchUp, isRepeatDesign, is18Plus, isRework
  block_on_value BOOLEAN, -- If user answers this value, trigger block check
  is_required BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(artist_id, question_key)
);

-- Pre-gate responses (stored per conversation)
CREATE TABLE IF NOT EXISTS pre_gate_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES chat_conversations(id) ON DELETE CASCADE,
  session_id TEXT,
  responses JSONB NOT NULL DEFAULT '{}', -- { wantsColor: true, isCoverUp: false, ... }
  gate_passed BOOLEAN,
  blocked_by TEXT[] DEFAULT '{}', -- Which question(s) caused block
  block_reasons JSONB DEFAULT '[]', -- Detailed reasons with messages
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- PART 3: STRUCTURED INTENTS (AI Output Schema)
-- =====================================================

CREATE TABLE IF NOT EXISTS structured_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tattoo_brief_id UUID REFERENCES tattoo_briefs(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES chat_conversations(id) ON DELETE CASCADE,
  version TEXT DEFAULT '1.0',
  language TEXT DEFAULT 'en',
  
  -- Declared (from pre-gate) - high confidence booleans
  declared JSONB DEFAULT '{}',
  
  -- Inferred by AI
  inferred JSONB DEFAULT '{}', -- includesColor, placement, sizeText, sizeInchesEstimate, subjectTags
  
  -- Contradictions detected between declared and inferred
  contradictions JSONB DEFAULT '[]',
  
  -- Styles with confidence scores
  styles_detected JSONB DEFAULT '[]', -- [{tag, confidence, evidence}]
  
  -- Work type with confidence
  work_type JSONB DEFAULT '{}', -- {value, confidence, evidence}
  
  -- Complexity assessment
  complexity JSONB DEFAULT '{}', -- {score, label, rationale}
  
  -- Estimated hours
  estimated_hours JSONB DEFAULT '{}', -- {min, max, confidence, rationale}
  
  -- Budget info (optional)
  budget JSONB,
  
  -- Deadline info (optional)
  deadline JSONB,
  
  -- Missing fields that need follow-up
  missing_fields TEXT[] DEFAULT '{}',
  
  -- Follow-up questions generated (max 4)
  followup_questions JSONB DEFAULT '[]',
  
  -- Risk flags with severity
  risk_flags JSONB DEFAULT '[]', -- [{flag, severity, explanation}]
  
  -- Internal notes for rules engine
  notes TEXT,
  
  -- Overall interpretation confidence
  overall_confidence DECIMAL(3,2) DEFAULT 0.0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- PART 4: POLICY RULES ENGINE
-- =====================================================

-- Policy rules (deterministic rule DSL)
CREATE TABLE IF NOT EXISTS policy_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT true,
  
  -- Scope (studio, location, artist, serviceType, resource)
  scope_type TEXT NOT NULL,
  scope_id UUID, -- References the specific entity (null = global)
  
  -- Priority (higher runs first, 0-10000)
  priority INT DEFAULT 100,
  
  -- JSONLogic condition
  condition_json JSONB NOT NULL,
  
  -- Action configuration
  action JSONB NOT NULL, -- {decision, reasonCode, nextActions, setFields, tagsAdd}
  
  -- Explanations
  explain_public TEXT NOT NULL, -- Client-facing message
  explain_internal TEXT NOT NULL, -- Admin/artist debugging
  
  -- Audit trail
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Rule evaluation results (EvaluationTrace for explainability)
CREATE TABLE IF NOT EXISTS rule_evaluation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id TEXT NOT NULL UNIQUE,
  structured_intent_id UUID REFERENCES structured_intents(id) ON DELETE SET NULL,
  tattoo_brief_id UUID REFERENCES tattoo_briefs(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES chat_conversations(id) ON DELETE SET NULL,
  
  -- Evaluation context
  context JSONB NOT NULL, -- {studioId, locationId, artistId, clientId, timezone}
  
  -- Input snapshot (the structured intent used)
  input_snapshot JSONB NOT NULL,
  
  -- All evaluated rules with results
  evaluated_rules JSONB DEFAULT '[]', -- [{ruleId, name, matched, matchNotes, decisionDelta}]
  
  -- Final decision
  final_decision TEXT NOT NULL, -- ALLOW, REVIEW, BLOCK
  final_reasons JSONB DEFAULT '[]', -- [{reasonCode, message, sourceRuleId}]
  
  -- Next actions to take
  next_actions JSONB DEFAULT '[]',
  
  -- Matching info (for multi-artist)
  matching JSONB, -- {fitScores, selectedArtistId}
  
  -- Any errors during evaluation
  errors TEXT[] DEFAULT '{}',
  
  evaluated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- PART 5: CLIENT RISK PROFILE ENHANCEMENTS
-- =====================================================

-- Add risk fields to client_profiles
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS risk_score INT DEFAULT 0;
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS no_show_count INT DEFAULT 0;
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS late_cancel_count INT DEFAULT 0;
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS dispute_count INT DEFAULT 0;
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS deposit_modifier DECIMAL(3,2) DEFAULT 1.0;
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false;
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS trust_tier TEXT DEFAULT 'new';
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS risk_flags TEXT[] DEFAULT '{}';
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS last_risk_assessment TIMESTAMPTZ;

-- Risk events tracking
CREATE TABLE IF NOT EXISTS risk_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_profile_id UUID REFERENCES client_profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- no_show, late_cancel, dispute, payment_failed, chargeback
  severity INT DEFAULT 1, -- 1-5
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  description TEXT,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  occurred_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- PART 6: REPEAT DETECTION SYSTEM
-- =====================================================

CREATE TABLE IF NOT EXISTS design_similarity_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tattoo_brief_id UUID REFERENCES tattoo_briefs(id) ON DELETE CASCADE,
  compared_to_booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  similarity_score DECIMAL(3,2) DEFAULT 0.0,
  matching_factors JSONB DEFAULT '{}', -- {subject: 0.8, placement: 0.5, style: 0.9}
  flagged_as_repeat BOOLEAN DEFAULT false,
  reviewed_by_artist BOOLEAN DEFAULT false,
  review_decision TEXT, -- allow, block
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- PART 7: INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_pre_gate_questions_artist ON pre_gate_questions(artist_id);
CREATE INDEX IF NOT EXISTS idx_pre_gate_responses_conversation ON pre_gate_responses(conversation_id);
CREATE INDEX IF NOT EXISTS idx_structured_intents_conversation ON structured_intents(conversation_id);
CREATE INDEX IF NOT EXISTS idx_structured_intents_brief ON structured_intents(tattoo_brief_id);
CREATE INDEX IF NOT EXISTS idx_policy_rules_scope ON policy_rules(scope_type, scope_id);
CREATE INDEX IF NOT EXISTS idx_policy_rules_enabled ON policy_rules(enabled, priority DESC);
CREATE INDEX IF NOT EXISTS idx_rule_evaluation_results_conversation ON rule_evaluation_results(conversation_id);
CREATE INDEX IF NOT EXISTS idx_risk_events_client ON risk_events(client_profile_id);
CREATE INDEX IF NOT EXISTS idx_design_similarity_brief ON design_similarity_checks(tattoo_brief_id);

-- =====================================================
-- PART 8: ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE pre_gate_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pre_gate_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE structured_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE rule_evaluation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_similarity_checks ENABLE ROW LEVEL SECURITY;

-- Admin policies (authenticated users can manage all)
CREATE POLICY "Admin can manage pre_gate_questions" ON pre_gate_questions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin can manage pre_gate_responses" ON pre_gate_responses FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin can manage structured_intents" ON structured_intents FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin can manage policy_rules" ON policy_rules FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin can manage rule_evaluation_results" ON rule_evaluation_results FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin can manage risk_events" ON risk_events FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin can manage design_similarity_checks" ON design_similarity_checks FOR ALL USING (auth.role() = 'authenticated');

-- Service role policies for edge functions
CREATE POLICY "Service can insert pre_gate_responses" ON pre_gate_responses FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can insert structured_intents" ON structured_intents FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can insert rule_evaluation_results" ON rule_evaluation_results FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can insert risk_events" ON risk_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can insert design_similarity_checks" ON design_similarity_checks FOR INSERT WITH CHECK (true);

-- =====================================================
-- PART 9: SEED DATA - DEFAULT PRE-GATE QUESTIONS
-- =====================================================

-- Insert default pre-gate questions (artist_id = null means global defaults)
INSERT INTO pre_gate_questions (question_key, question_text, description, targets_field, block_on_value, display_order, is_active)
VALUES
  ('wants_color', 'Are you looking for a color tattoo?', 'Helps match with artists who specialize in color or black & grey', 'wantsColor', NULL, 1, true),
  ('is_coverup', 'Is this to cover an existing tattoo?', 'Cover-ups require specialized techniques', 'isCoverUp', NULL, 2, true),
  ('is_touchup', 'Is this a touch-up of another artist''s work?', 'Touch-ups of other artists'' work may have limitations', 'isTouchUp', NULL, 3, true),
  ('is_rework', 'Do you want to rework/modify an existing tattoo?', 'Reworks transform existing pieces into something new', 'isRework', NULL, 4, true),
  ('is_repeat', 'Do you want a design you''ve seen before?', 'Some artists prefer creating original custom work', 'isRepeatDesign', NULL, 5, true),
  ('is_adult', 'Are you 18 years or older?', 'Age verification is required for tattoo services', 'is18Plus', false, 6, true)
ON CONFLICT (artist_id, question_key) DO NOTHING;

-- =====================================================
-- PART 10: SEED DATA - FERUNDA'S POLICY RULES
-- =====================================================

-- Get Ferunda's artist ID
DO $$
DECLARE
  ferunda_id UUID;
BEGIN
  SELECT id INTO ferunda_id FROM studio_artists WHERE is_primary = true LIMIT 1;
  
  IF ferunda_id IS NOT NULL THEN
    -- Rule 1: Block color requests
    INSERT INTO policy_rules (rule_id, name, description, scope_type, scope_id, priority, condition_json, action, explain_public, explain_internal)
    VALUES (
      'ferunda_no_color',
      'Block Color Requests',
      'Ferunda specializes exclusively in black and grey work',
      'artist',
      ferunda_id,
      1000,
      '{"or": [{"==": [{"var": "declared.wantsColor"}, true]}, {"==": [{"var": "inferred.includesColor.value"}, true]}]}',
      '{"decision": "BLOCK", "reasonCode": "color_requested", "nextActions": [{"type": "REROUTE_TO_OTHER_ARTIST", "uiHint": "Suggest color specialists"}]}',
      'I specialize exclusively in black and grey work — it''s where my passion and expertise lie. While I can''t take on color pieces, I''d be happy to suggest talented color artists, or we could explore a stunning black and grey interpretation of your idea.',
      'Client requested color work. Artist only does black and grey.'
    )
    ON CONFLICT (rule_id) DO UPDATE SET
      condition_json = EXCLUDED.condition_json,
      action = EXCLUDED.action,
      explain_public = EXCLUDED.explain_public,
      explain_internal = EXCLUDED.explain_internal;

    -- Rule 2: Block cover-ups
    INSERT INTO policy_rules (rule_id, name, description, scope_type, scope_id, priority, condition_json, action, explain_public, explain_internal)
    VALUES (
      'ferunda_no_coverup',
      'Block Cover-up Requests',
      'Ferunda does not offer cover-up services',
      'artist',
      ferunda_id,
      1000,
      '{"or": [{"==": [{"var": "declared.isCoverUp"}, true]}, {"==": [{"var": "workType.value"}, "cover_up"]}]}',
      '{"decision": "BLOCK", "reasonCode": "coverup_not_offered", "nextActions": [{"type": "REROUTE_TO_OTHER_ARTIST", "uiHint": "Suggest cover-up specialists"}]}',
      'Cover-ups require specialized techniques that aren''t my focus. I want to make sure your piece gets the attention it deserves from an artist who specializes in transforming existing tattoos. Would you like me to suggest some excellent cover-up artists, or could we create something new in a different area?',
      'Client requested cover-up. Artist does not do cover-ups.'
    )
    ON CONFLICT (rule_id) DO UPDATE SET
      condition_json = EXCLUDED.condition_json,
      action = EXCLUDED.action,
      explain_public = EXCLUDED.explain_public,
      explain_internal = EXCLUDED.explain_internal;

    -- Rule 3: Block touch-ups of other artists' work
    INSERT INTO policy_rules (rule_id, name, description, scope_type, scope_id, priority, condition_json, action, explain_public, explain_internal)
    VALUES (
      'ferunda_no_touchup_other',
      'Block Touch-ups of Other Artists'' Work',
      'Ferunda only touches up their own work',
      'artist',
      ferunda_id,
      1000,
      '{"or": [{"==": [{"var": "declared.isTouchUp"}, true]}, {"==": [{"var": "workType.value"}, "touch_up_other_artist"]}]}',
      '{"decision": "BLOCK", "reasonCode": "touchup_not_offered", "nextActions": [{"type": "REROUTE_TO_OTHER_ARTIST"}]}',
      'I only offer touch-ups on my own previous work to ensure continuity and quality. For touch-ups on other artists'' work, I''d recommend reaching out to the original artist or a specialist who focuses on tattoo restoration.',
      'Client requested touch-up of another artist''s work. Artist only touches up own work.'
    )
    ON CONFLICT (rule_id) DO UPDATE SET
      condition_json = EXCLUDED.condition_json,
      action = EXCLUDED.action,
      explain_public = EXCLUDED.explain_public,
      explain_internal = EXCLUDED.explain_internal;

    -- Rule 4: Block reworks
    INSERT INTO policy_rules (rule_id, name, description, scope_type, scope_id, priority, condition_json, action, explain_public, explain_internal)
    VALUES (
      'ferunda_no_rework',
      'Block Rework Requests',
      'Ferunda does not rework existing tattoos',
      'artist',
      ferunda_id,
      1000,
      '{"or": [{"==": [{"var": "declared.isRework"}, true]}, {"==": [{"var": "workType.value"}, "rework"]}]}',
      '{"decision": "BLOCK", "reasonCode": "rework_not_offered", "nextActions": [{"type": "REROUTE_TO_OTHER_ARTIST"}]}',
      'Reworking existing tattoos requires a different skill set than what I specialize in. I focus on creating fresh, original pieces. Would you like to explore a new design instead, or shall I suggest artists who excel at tattoo transformations?',
      'Client requested rework. Artist does not do reworks.'
    )
    ON CONFLICT (rule_id) DO UPDATE SET
      condition_json = EXCLUDED.condition_json,
      action = EXCLUDED.action,
      explain_public = EXCLUDED.explain_public,
      explain_internal = EXCLUDED.explain_internal;

    -- Rule 5: Block repeat designs
    INSERT INTO policy_rules (rule_id, name, description, scope_type, scope_id, priority, condition_json, action, explain_public, explain_internal)
    VALUES (
      'ferunda_no_repeat',
      'Block Repeat Design Requests',
      'Ferunda creates only original custom work',
      'artist',
      ferunda_id,
      900,
      '{"or": [{"==": [{"var": "declared.isRepeatDesign"}, true]}, {"==": [{"var": "workType.value"}, "repeat_design"]}]}',
      '{"decision": "BLOCK", "reasonCode": "repeat_not_offered", "nextActions": [{"type": "ASK_FOLLOWUPS", "uiHint": "Offer custom interpretation"}]}',
      'Each piece I create is one-of-a-kind, designed specifically for you. While I won''t replicate another tattoo, I''d love to create something original inspired by elements you love. Want to share what draws you to that design, and we can craft something uniquely yours?',
      'Client requested repeat design. Artist only does original custom work.'
    )
    ON CONFLICT (rule_id) DO UPDATE SET
      condition_json = EXCLUDED.condition_json,
      action = EXCLUDED.action,
      explain_public = EXCLUDED.explain_public,
      explain_internal = EXCLUDED.explain_internal;

    -- Rule 6: Age verification required
    INSERT INTO policy_rules (rule_id, name, description, scope_type, scope_id, priority, condition_json, action, explain_public, explain_internal)
    VALUES (
      'ferunda_age_required',
      'Age Verification Required',
      'Must be 18+ for tattoo services',
      'artist',
      ferunda_id,
      2000,
      '{"==": [{"var": "declared.is18Plus"}, false]}',
      '{"decision": "BLOCK", "reasonCode": "age_verification_required", "nextActions": [{"type": "CLOSE_OUT"}]}',
      'Thank you for your interest! Tattoo services are only available to clients who are 18 years or older. Feel free to reach out again when you''ve reached that milestone — I''d be honored to create something special for you then.',
      'Client indicated they are under 18. Cannot proceed.'
    )
    ON CONFLICT (rule_id) DO UPDATE SET
      condition_json = EXCLUDED.condition_json,
      action = EXCLUDED.action,
      explain_public = EXCLUDED.explain_public,
      explain_internal = EXCLUDED.explain_internal;

    -- Rule 7: Review small micro realism
    INSERT INTO policy_rules (rule_id, name, description, scope_type, scope_id, priority, condition_json, action, explain_public, explain_internal)
    VALUES (
      'ferunda_small_realism_review',
      'Review Small Micro Realism Requests',
      'Micro realism under 2 inches may not hold detail well',
      'artist',
      ferunda_id,
      500,
      '{"and": [{"in": ["micro_realism", {"var": "stylesDetected.tags"}]}, {"<": [{"var": "inferred.sizeInchesEstimate"}, 2]}]}',
      '{"decision": "REVIEW", "reasonCode": "too_small_for_detail", "nextActions": [{"type": "OFFER_CONSULT", "uiHint": "Discuss sizing options"}]}',
      'For micro realism to truly shine and age beautifully, I typically recommend a minimum of 2-3 inches. At smaller sizes, the intricate details that make realism special can blur over time. Would you like to discuss sizing options to ensure your piece looks stunning for years to come?',
      'Micro realism request under 2 inches. May have detail longevity issues.'
    )
    ON CONFLICT (rule_id) DO UPDATE SET
      condition_json = EXCLUDED.condition_json,
      action = EXCLUDED.action,
      explain_public = EXCLUDED.explain_public,
      explain_internal = EXCLUDED.explain_internal;

    -- Rule 8: Review suspicious cover-up (contradiction detected)
    INSERT INTO policy_rules (rule_id, name, description, scope_type, scope_id, priority, condition_json, action, explain_public, explain_internal)
    VALUES (
      'ferunda_suspicious_coverup',
      'Review Suspicious Cover-up (Contradiction)',
      'Client said no cover-up but AI detected possible existing tattoo',
      'artist',
      ferunda_id,
      800,
      '{"and": [{"==": [{"var": "declared.isCoverUp"}, false]}, {"in": ["possible_coverup_hidden", {"var": "riskFlags.flags"}]}]}',
      '{"decision": "REVIEW", "reasonCode": "insufficient_info", "nextActions": [{"type": "ASK_FOLLOWUPS", "uiHint": "Clarify existing tattoo situation"}]}',
      'I noticed you mentioned an area that might have existing ink. Just to make sure I can give you the best guidance — is there any previous tattoo work in that area, even if it''s faded? This helps me plan the perfect approach for your piece.',
      'AI detected possible existing tattoo but client said no cover-up. Need clarification.'
    )
    ON CONFLICT (rule_id) DO UPDATE SET
      condition_json = EXCLUDED.condition_json,
      action = EXCLUDED.action,
      explain_public = EXCLUDED.explain_public,
      explain_internal = EXCLUDED.explain_internal;

    -- Rule 9: High-risk client requires higher deposit
    INSERT INTO policy_rules (rule_id, name, description, scope_type, scope_id, priority, condition_json, action, explain_public, explain_internal)
    VALUES (
      'ferunda_high_risk_deposit',
      'Higher Deposit for High-Risk Clients',
      'Clients with poor history require increased deposit',
      'artist',
      ferunda_id,
      200,
      '{">=": [{"var": "clientRisk.riskScore"}, 70]}',
      '{"decision": "ALLOW", "reasonCode": "other", "nextActions": [{"type": "COLLECT_DEPOSIT", "depositOverrideCents": 50000}]}',
      'To secure your appointment, a deposit of $500 is required. This ensures your dedicated day is held exclusively for you.',
      'Client has risk score >= 70. Requiring higher deposit.'
    )
    ON CONFLICT (rule_id) DO UPDATE SET
      condition_json = EXCLUDED.condition_json,
      action = EXCLUDED.action,
      explain_public = EXCLUDED.explain_public,
      explain_internal = EXCLUDED.explain_internal;

    -- Rule 10: Medical review flag
    INSERT INTO policy_rules (rule_id, name, description, scope_type, scope_id, priority, condition_json, action, explain_public, explain_internal)
    VALUES (
      'ferunda_medical_review',
      'Medical Review Required',
      'Medical conditions mentioned require artist review',
      'artist',
      ferunda_id,
      1500,
      '{"in": ["medical_review_required", {"var": "riskFlags.flags"}]}',
      '{"decision": "REVIEW", "reasonCode": "medical_review_required", "nextActions": [{"type": "ROUTE_TO_ARTIST"}]}',
      'Thank you for sharing that important health information. I want to make sure we proceed safely. I''ll review your situation and get back to you personally to discuss the best approach. If you have any concerns, please don''t hesitate to consult with your healthcare provider.',
      'Medical condition mentioned. Requires artist review before proceeding.'
    )
    ON CONFLICT (rule_id) DO UPDATE SET
      condition_json = EXCLUDED.condition_json,
      action = EXCLUDED.action,
      explain_public = EXCLUDED.explain_public,
      explain_internal = EXCLUDED.explain_internal;

  END IF;
END $$;

-- =====================================================
-- PART 11: UPDATED_AT TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_pre_gate_questions_updated_at ON pre_gate_questions;
CREATE TRIGGER update_pre_gate_questions_updated_at
  BEFORE UPDATE ON pre_gate_questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_structured_intents_updated_at ON structured_intents;
CREATE TRIGGER update_structured_intents_updated_at
  BEFORE UPDATE ON structured_intents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_policy_rules_updated_at ON policy_rules;
CREATE TRIGGER update_policy_rules_updated_at
  BEFORE UPDATE ON policy_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();