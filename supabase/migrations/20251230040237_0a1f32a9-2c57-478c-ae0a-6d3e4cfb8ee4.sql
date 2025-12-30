-- Seed default luxury policy
INSERT INTO public.studio_policies (is_active, version, settings, summary_text, full_policy_text)
VALUES (
  true, 1,
  '{"deposit_model":"fixed_by_service","cancellation_window_hours":72,"late_threshold_minutes":15,"hold_slot_minutes":15,"no_show_rule":"deposit_forfeit","late_policy_rule":"may_reschedule","max_free_reschedules":1,"minimum_age":18}'::jsonb,
  'A deposit secures your session and is applied to the final total. Cancellations or reschedules require 72 hours notice. Late arrivals may reduce session time.',
  'Deposits protect reserved time and are non-refundable. With 72 hours notice, deposits may be transferred once. Cancellations within the notice window forfeit the deposit. If more than 15 minutes late, the appointment may be rescheduled.'
);

-- Seed workspace settings
INSERT INTO public.workspace_settings (workspace_name, brand_tone, primary_timezone, currency, settings)
VALUES ('Ferunda Studio', 'luxury', 'America/Chicago', 'USD',
  '{"session_blocks_hours":[3,4,6,8],"min_lead_time_hours":48,"notice_window_hours":72,"late_threshold_min":15,"hold_slot_minutes":15}'::jsonb
);

-- Seed message templates
INSERT INTO public.concierge_message_templates (template_key, template_name, category, message_content, is_active, allow_ai_variation) VALUES 
('hold_created', 'Slot Hold Created', 'booking', 'We are holding your selected time. Complete deposit within 15 minutes to confirm.', true, false),
('hold_expired', 'Slot Hold Expired', 'booking', 'The hold on your selected time has expired. Would you like to select a new time?', true, true),
('one_tap_confirmation', '24h Confirmation', 'reminder', 'Your session is tomorrow. Please confirm or reschedule.', true, false),
('aftercare_day1', 'Aftercare Day 1', 'aftercare', 'How is your new tattoo feeling? Keep it clean and moisturized.', true, true)
ON CONFLICT (template_key) DO NOTHING;