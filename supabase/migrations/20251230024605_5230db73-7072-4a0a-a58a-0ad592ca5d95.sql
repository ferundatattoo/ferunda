
-- Sprint 2A Part 2: Create tables and policies

-- 1. Studio permissions system
CREATE TABLE IF NOT EXISTS studio_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  permission_key TEXT NOT NULL,
  permission_name TEXT NOT NULL,
  description TEXT,
  is_granted BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(role, permission_key)
);

-- 2. Policy warnings table (for ALLOW_WITH_WARNING)
CREATE TABLE IF NOT EXISTS policy_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warning_key TEXT NOT NULL UNIQUE,
  warning_title TEXT NOT NULL,
  client_message TEXT NOT NULL,
  artist_note TEXT,
  severity TEXT DEFAULT 'info',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Policy overrides system (project-level exceptions)
CREATE TABLE IF NOT EXISTS policy_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  tattoo_brief_id UUID REFERENCES tattoo_briefs(id) ON DELETE CASCADE,
  overridden_rule_id TEXT NOT NULL,
  original_decision TEXT NOT NULL,
  override_decision TEXT NOT NULL,
  reason TEXT NOT NULL,
  notes TEXT,
  requested_by UUID REFERENCES auth.users(id),
  requested_at TIMESTAMPTZ DEFAULT now(),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_policy_overrides_booking ON policy_overrides(booking_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_policy_overrides_brief ON policy_overrides(tattoo_brief_id) WHERE is_active = true;

-- 4. Comprehensive audit log system
CREATE TABLE IF NOT EXISTS policy_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  changed_by_role TEXT,
  changes_diff JSONB,
  reason TEXT,
  metadata JSONB,
  occurred_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON policy_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_time ON policy_audit_log(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON policy_audit_log(changed_by);

-- 5. Portfolio exemplars (YES/NO style examples)
CREATE TABLE IF NOT EXISTS portfolio_exemplars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID REFERENCES studio_artists(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  exemplar_type TEXT NOT NULL CHECK (exemplar_type IN ('yes', 'no')),
  style_tags TEXT[],
  subject_tags TEXT[],
  mood_tags TEXT[],
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exemplars_artist ON portfolio_exemplars(artist_id) WHERE is_active = true;

-- 6. Style fit scores (enhanced matching)
CREATE TABLE IF NOT EXISTS style_fit_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  tattoo_brief_id UUID REFERENCES tattoo_briefs(id) ON DELETE CASCADE,
  artist_id UUID REFERENCES studio_artists(id) ON DELETE CASCADE NOT NULL,
  overall_score NUMERIC(3,2) NOT NULL,
  style_match_score NUMERIC(3,2),
  subject_match_score NUMERIC(3,2),
  mood_match_score NUMERIC(3,2),
  matched_exemplars UUID[],
  conflicting_exemplars UUID[],
  explanation TEXT,
  detailed_analysis JSONB,
  calculated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fit_scores_booking ON style_fit_scores(booking_id);
CREATE INDEX IF NOT EXISTS idx_fit_scores_artist ON style_fit_scores(artist_id);

-- 7. Studio resources (rooms, chairs, equipment)
CREATE TABLE IF NOT EXISTS studio_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_name TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  description TEXT,
  capacity INT DEFAULT 1,
  city_id UUID REFERENCES city_configurations(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Resource bookings
CREATE TABLE IF NOT EXISTS resource_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID REFERENCES studio_resources(id) ON DELETE CASCADE NOT NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  calendar_event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resource_bookings_time ON resource_bookings(resource_id, start_time, end_time);

-- 9. Intake windows (controlled booking periods)
CREATE TABLE IF NOT EXISTS intake_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID REFERENCES studio_artists(id) ON DELETE CASCADE,
  window_name TEXT NOT NULL,
  description TEXT,
  opens_at TIMESTAMPTZ NOT NULL,
  closes_at TIMESTAMPTZ NOT NULL,
  max_inquiries INT,
  current_count INT DEFAULT 0,
  priority_access_emails TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_intake_windows_artist ON intake_windows(artist_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_intake_windows_dates ON intake_windows(opens_at, closes_at) WHERE is_active = true;

-- 10. Enhanced artist availability modes
ALTER TABLE studio_artists ADD COLUMN IF NOT EXISTS availability_mode TEXT DEFAULT 'local';
ALTER TABLE studio_artists ADD COLUMN IF NOT EXISTS books_status TEXT DEFAULT 'open';
ALTER TABLE studio_artists ADD COLUMN IF NOT EXISTS books_open_until DATE;
ALTER TABLE studio_artists ADD COLUMN IF NOT EXISTS current_queue_size INT DEFAULT 0;
ALTER TABLE studio_artists ADD COLUMN IF NOT EXISTS max_queue_size INT DEFAULT 20;

-- 11. Deposit transactions
CREATE TABLE IF NOT EXISTS deposit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  state deposit_state NOT NULL,
  amount_cents INT NOT NULL,
  currency TEXT DEFAULT 'USD',
  reason TEXT,
  notes TEXT,
  stripe_payment_id TEXT,
  credit_from_booking_id UUID REFERENCES bookings(id),
  expires_at TIMESTAMPTZ,
  processed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deposit_transactions_booking ON deposit_transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_deposit_transactions_state ON deposit_transactions(state);

-- 12. Design revision tokens
ALTER TABLE artist_capabilities ADD COLUMN IF NOT EXISTS max_design_revisions INT DEFAULT 2;
ALTER TABLE artist_capabilities ADD COLUMN IF NOT EXISTS revision_consolidation_window_hours INT DEFAULT 24;

CREATE TABLE IF NOT EXISTS design_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  revision_number INT NOT NULL,
  client_notes TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending',
  artist_response TEXT,
  is_consolidated BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_revisions_booking ON design_revisions(booking_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_revisions_number ON design_revisions(booking_id, revision_number);

-- 13. Add warning_key to policy_rules
ALTER TABLE policy_rules ADD COLUMN IF NOT EXISTS warning_key TEXT;

-- 14. Seed default permissions
INSERT INTO studio_permissions (role, permission_key, permission_name, description, is_granted) VALUES
('admin', 'edit_policies', 'Edit Policies', 'Can modify studio policies and rules', true),
('admin', 'manage_artists', 'Manage Artists', 'Can add/edit/remove artists', true),
('admin', 'approve_overrides', 'Approve Overrides', 'Can approve policy exceptions', true),
('admin', 'view_finances', 'View Finances', 'Can view financial data', true),
('admin', 'manage_calendar', 'Manage Calendar', 'Can manage all calendars', true),
('admin', 'send_messages', 'Send Messages', 'Can send client messages', true),
('admin', 'view_audit_logs', 'View Audit Logs', 'Can view system audit logs', true),
('artist', 'edit_own_profile', 'Edit Own Profile', 'Can edit own artist profile', true),
('artist', 'manage_own_calendar', 'Manage Own Calendar', 'Can manage own calendar', true),
('artist', 'accept_decline_projects', 'Accept/Decline Projects', 'Can accept or decline assigned projects', true),
('artist', 'view_own_bookings', 'View Own Bookings', 'Can view own bookings only', true),
('artist', 'send_messages', 'Send Messages', 'Can send client messages', true),
('artist', 'request_override', 'Request Override', 'Can request policy overrides', true),
('manager', 'route_bookings', 'Route Bookings', 'Can assign bookings to artists', true),
('manager', 'schedule_sessions', 'Schedule Sessions', 'Can schedule tattoo sessions', true),
('manager', 'collect_deposits', 'Collect Deposits', 'Can process deposits', true),
('manager', 'send_messages', 'Send Messages', 'Can send client messages', true),
('manager', 'view_all_bookings', 'View All Bookings', 'Can view all bookings', true),
('manager', 'manage_calendar', 'Manage Calendar', 'Can manage all calendars', true),
('assistant', 'send_messages', 'Send Messages', 'Can send client messages', true),
('assistant', 'update_intake', 'Update Intake', 'Can update intake information', true),
('assistant', 'view_all_bookings', 'View All Bookings', 'Can view all bookings', true),
('assistant', 'update_portal', 'Update Portal', 'Can update customer portal', true)
ON CONFLICT (role, permission_key) DO NOTHING;

-- 15. Seed default warnings
INSERT INTO policy_warnings (warning_key, warning_title, client_message, artist_note, severity) VALUES
('micro_detail_longevity', 'Detail Longevity', 'Very fine details may soften over time. Consider slightly larger sizing for best long-term results.', 'Client wants fine detail work - discuss longevity expectations', 'caution'),
('high_friction_placement', 'Placement Wear', 'This placement area experiences more friction and may require touch-ups sooner.', 'High-friction placement selected - mention aftercare importance', 'info'),
('first_tattoo', 'First Tattoo', 'We recommend starting with a smaller piece to understand your pain tolerance and healing process.', 'First tattoo - take extra time to explain process', 'info'),
('sun_exposure_area', 'Sun Exposure', 'This area gets significant sun exposure. Quality sunscreen is essential for color longevity.', 'Sun-exposed area - emphasize SPF aftercare', 'caution'),
('complex_for_size', 'Complexity Notice', 'The design complexity may require adjustments to work well at this size.', 'High complexity for requested size - discuss simplification options', 'important')
ON CONFLICT (warning_key) DO NOTHING;

-- 16. Enable RLS on all new tables
ALTER TABLE studio_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_exemplars ENABLE ROW LEVEL SECURITY;
ALTER TABLE style_fit_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE intake_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_revisions ENABLE ROW LEVEL SECURITY;

-- 17. RLS Policies - Admin access
CREATE POLICY "Admins can manage permissions" ON studio_permissions
  FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can manage overrides" ON policy_overrides
  FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can view audit logs" ON policy_audit_log
  FOR SELECT USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can manage warnings" ON policy_warnings
  FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can manage exemplars" ON portfolio_exemplars
  FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can view fit scores" ON style_fit_scores
  FOR SELECT USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can manage resources" ON studio_resources
  FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can manage resource bookings" ON resource_bookings
  FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can manage intake windows" ON intake_windows
  FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can manage deposits" ON deposit_transactions
  FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can manage revisions" ON design_revisions
  FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Public read for warnings (needed by concierge)
CREATE POLICY "Public can read active warnings" ON policy_warnings
  FOR SELECT USING (is_active = true);

-- 18. Helper function to check permissions
CREATE OR REPLACE FUNCTION has_permission(_user_id UUID, _permission_key TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role app_role;
BEGIN
  SELECT role INTO user_role FROM user_roles WHERE user_id = _user_id LIMIT 1;
  
  IF user_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  IF user_role = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM studio_permissions 
    WHERE role = user_role 
    AND permission_key = _permission_key 
    AND is_granted = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 19. Audit trigger function
CREATE OR REPLACE FUNCTION log_policy_change()
RETURNS TRIGGER AS $$
DECLARE
  changes JSONB;
  action_type TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    action_type := 'created';
    changes := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    action_type := 'updated';
    changes := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'deleted';
    changes := to_jsonb(OLD);
  END IF;
  
  INSERT INTO policy_audit_log (entity_type, entity_id, action, changed_by, changes_diff, occurred_at)
  VALUES (TG_TABLE_NAME, COALESCE(NEW.id::text, OLD.id::text), action_type, auth.uid(), changes, now());
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Apply audit triggers
DROP TRIGGER IF EXISTS audit_policy_rules ON policy_rules;
CREATE TRIGGER audit_policy_rules
  AFTER INSERT OR UPDATE OR DELETE ON policy_rules
  FOR EACH ROW EXECUTE FUNCTION log_policy_change();

DROP TRIGGER IF EXISTS audit_artist_capabilities ON artist_capabilities;
CREATE TRIGGER audit_artist_capabilities
  AFTER INSERT OR UPDATE OR DELETE ON artist_capabilities
  FOR EACH ROW EXECUTE FUNCTION log_policy_change();

DROP TRIGGER IF EXISTS audit_policy_overrides ON policy_overrides;
CREATE TRIGGER audit_policy_overrides
  AFTER INSERT OR UPDATE OR DELETE ON policy_overrides
  FOR EACH ROW EXECUTE FUNCTION log_policy_change();
