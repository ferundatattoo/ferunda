-- =============================================
-- ARTIST CAPABILITIES & RULES SYSTEM
-- Comprehensive system for managing what each artist accepts/rejects
-- =============================================

-- 1. MASTER STYLE CATALOG with detailed metadata
CREATE TABLE public.tattoo_style_catalog (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  style_key text NOT NULL UNIQUE,
  display_name text NOT NULL,
  category text NOT NULL DEFAULT 'general', -- e.g., 'realism', 'traditional', 'contemporary', 'cultural'
  description text,
  parent_style_key text, -- for sub-styles (e.g., 'color_realism' -> 'realism')
  related_styles text[] DEFAULT '{}',
  typical_duration_hours_min numeric,
  typical_duration_hours_max numeric,
  complexity_level integer DEFAULT 5, -- 1-10 scale
  requires_color boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Seed with comprehensive style catalog
INSERT INTO public.tattoo_style_catalog (style_key, display_name, category, description, requires_color, complexity_level, related_styles) VALUES
-- REALISM FAMILY
('black_grey_realism', 'Black & Grey Realism', 'realism', 'Photorealistic tattoos using only black ink and grey wash', false, 9, ARRAY['micro_realism', 'portrait_realism']),
('color_realism', 'Color Realism', 'realism', 'Photorealistic tattoos using full color palette', true, 9, ARRAY['portrait_realism', 'nature_realism']),
('micro_realism', 'Micro Realism', 'realism', 'Highly detailed small-scale realistic tattoos', false, 10, ARRAY['black_grey_realism', 'fine_line']),
('portrait_realism', 'Portrait Realism', 'realism', 'Realistic portraits of people or animals', false, 10, ARRAY['black_grey_realism', 'color_realism']),
('surrealism', 'Surrealism', 'realism', 'Dreamlike, fantastical realistic imagery', false, 8, ARRAY['black_grey_realism', 'color_realism']),
-- FINE LINE FAMILY
('fine_line', 'Fine Line', 'contemporary', 'Delicate, thin-line tattoo work', false, 7, ARRAY['single_needle', 'minimalist']),
('single_needle', 'Single Needle', 'contemporary', 'Ultra-fine detail work using a single needle', false, 8, ARRAY['fine_line', 'micro_realism']),
('minimalist', 'Minimalist', 'contemporary', 'Simple, clean designs with minimal elements', false, 5, ARRAY['fine_line', 'geometric']),
-- TRADITIONAL FAMILY
('american_traditional', 'American Traditional', 'traditional', 'Bold lines, limited color palette, classic imagery', true, 6, ARRAY['neo_traditional', 'sailor_jerry']),
('neo_traditional', 'Neo-Traditional', 'traditional', 'Modern take on traditional with more colors and detail', true, 7, ARRAY['american_traditional', 'illustrative']),
('japanese_traditional', 'Japanese Traditional (Irezumi)', 'cultural', 'Traditional Japanese imagery and techniques', true, 9, ARRAY['neo_japanese', 'oriental']),
('neo_japanese', 'Neo-Japanese', 'cultural', 'Modern interpretation of Japanese style', true, 8, ARRAY['japanese_traditional']),
-- BLACKWORK FAMILY
('blackwork', 'Blackwork', 'contemporary', 'Bold, solid black designs', false, 6, ARRAY['tribal', 'geometric_blackwork']),
('geometric', 'Geometric', 'contemporary', 'Precise geometric patterns and shapes', false, 7, ARRAY['sacred_geometry', 'dotwork']),
('sacred_geometry', 'Sacred Geometry', 'contemporary', 'Mathematically inspired spiritual patterns', false, 8, ARRAY['geometric', 'mandala']),
('mandala', 'Mandala', 'contemporary', 'Circular spiritual designs', false, 7, ARRAY['sacred_geometry', 'dotwork']),
('tribal', 'Tribal', 'cultural', 'Bold black tribal patterns', false, 5, ARRAY['blackwork', 'polynesian']),
('polynesian', 'Polynesian', 'cultural', 'Traditional Pacific Island tribal work', false, 7, ARRAY['tribal', 'maori']),
-- ILLUSTRATIVE FAMILY
('illustrative', 'Illustrative', 'contemporary', 'Drawing/illustration inspired tattoos', false, 7, ARRAY['neo_traditional', 'sketch']),
('sketch', 'Sketch Style', 'contemporary', 'Appears like pencil sketches', false, 6, ARRAY['illustrative', 'fine_line']),
('watercolor', 'Watercolor', 'contemporary', 'Mimics watercolor painting techniques', true, 8, ARRAY['abstract', 'illustrative']),
('abstract', 'Abstract', 'contemporary', 'Non-representational artistic tattoos', false, 6, ARRAY['watercolor', 'trash_polka']),
('trash_polka', 'Trash Polka', 'contemporary', 'Chaotic collage style mixing realism and graphic elements', false, 8, ARRAY['abstract', 'blackwork']),
-- OTHER STYLES
('dotwork', 'Dotwork', 'contemporary', 'Images created from dots', false, 8, ARRAY['geometric', 'mandala']),
('ornamental', 'Ornamental', 'contemporary', 'Decorative, jewelry-like designs', false, 7, ARRAY['geometric', 'mandala']),
('lettering', 'Lettering/Script', 'general', 'Text-based tattoos', false, 5, ARRAY['fine_line', 'traditional_lettering']),
('botanical', 'Botanical', 'contemporary', 'Plant and flower focused designs', false, 6, ARRAY['fine_line', 'illustrative']),
('animal', 'Animal/Wildlife', 'general', 'Animal-focused tattoos in various styles', false, 7, ARRAY['realism', 'illustrative']),
('dark_art', 'Dark Art/Horror', 'contemporary', 'Macabre, horror-themed imagery', false, 7, ARRAY['blackwork', 'black_grey_realism']),
('chicano', 'Chicano', 'cultural', 'Fine line black and grey, cultural imagery', false, 8, ARRAY['black_grey_realism', 'fine_line']),
('biomechanical', 'Biomechanical', 'contemporary', 'Mechanical/organic fusion designs', false, 9, ARRAY['black_grey_realism', 'surrealism']);

-- 2. ARTIST CAPABILITIES - What each artist CAN/WILL do
CREATE TABLE public.artist_capabilities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id uuid NOT NULL REFERENCES public.studio_artists(id) ON DELETE CASCADE,
  
  -- STYLES
  accepted_styles text[] DEFAULT '{}', -- styles they actively work in
  rejected_styles text[] DEFAULT '{}', -- styles they explicitly WON'T do
  signature_styles text[] DEFAULT '{}', -- their best/preferred styles (subset of accepted)
  
  -- WORK TYPE PREFERENCES
  accepts_coverups boolean DEFAULT false,
  accepts_reworks boolean DEFAULT false, -- fixing other artists' work
  accepts_touchups boolean DEFAULT true, -- their own previous work
  accepts_color_work boolean DEFAULT true,
  accepts_black_grey_only boolean DEFAULT true,
  accepts_first_timers boolean DEFAULT true,
  accepts_matching_tattoos boolean DEFAULT true, -- couple/friend matching
  
  -- SIZE PREFERENCES
  min_size_inches numeric DEFAULT 1,
  max_size_inches numeric, -- null = no limit
  preferred_size_min numeric DEFAULT 3,
  preferred_size_max numeric DEFAULT 12,
  accepts_full_sleeves boolean DEFAULT true,
  accepts_full_back boolean DEFAULT true,
  accepts_bodysuits boolean DEFAULT false,
  
  -- PLACEMENT RESTRICTIONS
  rejected_placements text[] DEFAULT '{}', -- e.g., ['face', 'hands', 'neck'] for some artists
  requires_consultation_placements text[] DEFAULT '{}', -- placements needing in-person consult first
  
  -- SESSION PREFERENCES  
  session_type text DEFAULT 'day_session', -- 'hourly', 'day_session', 'by_piece', 'mixed'
  min_session_hours numeric DEFAULT 4,
  max_session_hours numeric DEFAULT 8,
  prefers_multi_session boolean DEFAULT true, -- for large projects
  accepts_walk_ins boolean DEFAULT false,
  
  -- BOOKING RULES
  max_clients_per_day integer DEFAULT 1,
  requires_deposit boolean DEFAULT true,
  deposit_amount numeric DEFAULT 500,
  requires_reference_images boolean DEFAULT false,
  requires_consultation_for_large boolean DEFAULT true,
  large_project_threshold_hours numeric DEFAULT 6,
  
  -- CREATIVE PREFERENCES
  prefers_custom_only boolean DEFAULT true, -- no flash/pre-made
  offers_flash boolean DEFAULT false,
  will_repeat_designs boolean DEFAULT false, -- same design for multiple clients
  allows_design_changes boolean DEFAULT true, -- changes after approval
  max_revision_rounds integer DEFAULT 3,
  
  -- SPECIAL CONDITIONS
  special_conditions jsonb DEFAULT '{}', -- flexible key-value for anything else
  internal_notes text, -- admin only notes
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT unique_artist_capabilities UNIQUE (artist_id)
);

-- 3. STUDIO RULES - Global policies that apply to all artists
CREATE TABLE public.studio_booking_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_key text NOT NULL UNIQUE,
  rule_category text NOT NULL, -- 'booking', 'deposit', 'cancellation', 'style', 'general'
  rule_name text NOT NULL,
  rule_description text NOT NULL,
  rule_value jsonb NOT NULL, -- flexible value storage
  applies_to_artists text[] DEFAULT '{}', -- empty = all, or specific artist IDs
  is_active boolean DEFAULT true,
  priority integer DEFAULT 0, -- higher = more important
  error_message text, -- what to tell clients who violate
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default studio rules
INSERT INTO public.studio_booking_rules (rule_key, rule_category, rule_name, rule_description, rule_value, error_message) VALUES
('require_deposit', 'deposit', 'Require Deposit', 'All bookings require a deposit to secure the appointment', '{"required": true, "amount": 500}', 'A deposit is required to secure your appointment.'),
('min_notice_days', 'booking', 'Minimum Notice', 'Minimum days notice required for booking', '{"days": 3}', 'Please book at least 3 days in advance.'),
('cancellation_policy', 'cancellation', 'Cancellation Policy', 'Deposit forfeiture rules', '{"refund_if_cancelled_days_before": 7, "refund_percentage": 50}', 'Cancellations within 7 days forfeit 50% of deposit.'),
('max_reschedules', 'booking', 'Maximum Reschedules', 'How many times a client can reschedule', '{"max": 2}', 'Maximum 2 reschedules allowed per booking.'),
('no_drunk_clients', 'general', 'Sobriety Requirement', 'Clients must be sober', '{"required": true}', 'For safety and quality, clients must be completely sober.'),
('age_requirement', 'general', 'Age Requirement', 'Minimum age for tattoos', '{"min_age": 18}', 'You must be 18 or older to get a tattoo.'),
('id_required', 'general', 'ID Required', 'Valid ID required at appointment', '{"required": true}', 'Please bring valid government-issued ID to your appointment.');

-- 4. CONCIERGE REJECTION TEMPLATES - Pre-built responses for common rejections
CREATE TABLE public.concierge_rejection_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rejection_type text NOT NULL, -- 'style', 'coverup', 'placement', 'size', 'timeline', 'general'
  rejection_reason text NOT NULL, -- e.g., 'color_work', 'face_tattoo', 'too_small'
  template_response text NOT NULL, -- the polite rejection message
  alternative_suggestions text[], -- what to suggest instead
  referral_enabled boolean DEFAULT false, -- offer to refer to other artists
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Insert polite rejection templates
INSERT INTO public.concierge_rejection_templates (rejection_type, rejection_reason, template_response, alternative_suggestions, referral_enabled) VALUES
('style', 'color_work', 'I specialize exclusively in black and grey work - it''s really where my passion and expertise lies. Color tattoos require a different skill set, and I want to make sure you get the absolute best result for your piece. Would you like me to suggest some amazing color artists I know, or would you be interested in exploring a black and grey interpretation of your idea?', ARRAY['Black and grey version', 'Referral to color specialist'], true),
('style', 'coverup', 'Cover-up work requires very specific techniques and experience that I don''t specialize in. To get the best possible result covering your existing tattoo, I''d recommend working with an artist who focuses on cover-ups. Want me to connect you with someone great, or can I help you with a different project?', ARRAY['Referral to coverup specialist', 'New tattoo in different area'], true),
('style', 'traditional', 'My style focuses on realism and fine line work, which is quite different from traditional tattooing. Traditional requires bold lines and specific color palettes that aren''t my specialty. I want you to get exactly what you''re envisioning! Can I refer you to a fantastic traditional artist, or explore a realistic interpretation?', ARRAY['Realistic interpretation', 'Referral to traditional artist'], true),
('placement', 'face', 'I don''t do face or head tattoos as a personal policy. These are life-changing decisions that I believe require extensive consideration. If you''re set on this placement, I can connect you with artists who specialize in this area.', ARRAY['Alternative placement', 'Referral'], true),
('placement', 'hands_feet', 'Hand and foot tattoos require special consideration due to how they heal and age. I prefer to discuss these placements in person first. Would you like to schedule a consultation, or explore a different placement?', ARRAY['Schedule consultation', 'Alternative placement'], false),
('size', 'too_small', 'For the level of detail you''re describing, I''d need to work a bit larger to ensure it ages beautifully and the details stay crisp. Could we discuss sizing up a bit, or simplifying the design to work at your preferred size?', ARRAY['Larger size', 'Simplified design'], false),
('timeline', 'rush', 'Quality work takes time, and I don''t want to rush your piece. My current availability is X weeks out, which gives us time to perfect the design. Would that timeline work, or would you like to join my waitlist for cancellations?', ARRAY['Wait for availability', 'Join waitlist'], false),
('general', 'repeat_design', 'Each tattoo I create is a unique piece for that client - I don''t repeat designs. But I''d love to create something original inspired by what drew you to that piece! What elements spoke to you most?', ARRAY['Custom design inspired by reference'], false),
('general', 'not_a_fit', 'Based on what you''re describing, I think another artist might be better suited to bring your vision to life. My specialty is X, and your project sounds more like Y. Can I help connect you with the right artist?', ARRAY['Referral to better-fit artist'], true);

-- 5. Enable RLS
ALTER TABLE public.tattoo_style_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_booking_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concierge_rejection_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Public read for styles catalog
CREATE POLICY "Anyone can view style catalog" ON public.tattoo_style_catalog FOR SELECT USING (is_active = true);

-- RLS Policies - Public read for capabilities (needed by concierge)
CREATE POLICY "Anyone can view artist capabilities" ON public.artist_capabilities FOR SELECT USING (true);

-- RLS Policies - Public read for studio rules (needed by concierge)  
CREATE POLICY "Anyone can view studio rules" ON public.studio_booking_rules FOR SELECT USING (is_active = true);

-- RLS Policies - Public read for rejection templates (needed by concierge)
CREATE POLICY "Anyone can view rejection templates" ON public.concierge_rejection_templates FOR SELECT USING (is_active = true);

-- Admin management policies
CREATE POLICY "Admins can manage style catalog" ON public.tattoo_style_catalog FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage artist capabilities" ON public.artist_capabilities FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage studio rules" ON public.studio_booking_rules FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage rejection templates" ON public.concierge_rejection_templates FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert Ferunda's capabilities (based on user description)
INSERT INTO public.artist_capabilities (
  artist_id,
  accepted_styles,
  rejected_styles,
  signature_styles,
  accepts_coverups,
  accepts_reworks,
  accepts_color_work,
  accepts_black_grey_only,
  session_type,
  max_clients_per_day,
  prefers_custom_only,
  will_repeat_designs
) 
SELECT 
  id,
  ARRAY['black_grey_realism', 'micro_realism', 'fine_line', 'single_needle', 'portrait_realism'],
  ARRAY['color_realism', 'american_traditional', 'neo_traditional', 'japanese_traditional', 'watercolor', 'tribal', 'polynesian', 'chicano'],
  ARRAY['black_grey_realism', 'micro_realism'],
  false, -- no coverups
  false, -- no reworks
  false, -- no color
  true,  -- black & grey only
  'day_session',
  1, -- one client per day
  true, -- custom only
  false -- never repeats designs
FROM public.studio_artists
WHERE is_primary = true
LIMIT 1;

-- Create updated_at trigger
CREATE TRIGGER update_artist_capabilities_updated_at
  BEFORE UPDATE ON public.artist_capabilities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_studio_booking_rules_updated_at
  BEFORE UPDATE ON public.studio_booking_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();