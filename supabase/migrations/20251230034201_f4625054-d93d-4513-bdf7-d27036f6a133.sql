-- Phase 3: Seed luxury email templates (corrected column names)
INSERT INTO public.email_templates (name, subject, body, template_type, is_active)
VALUES
  ('Session Confirmed', 'Session confirmed', 
   '<p>Your session is confirmed for {{date_time}}.</p><p>You can view your project details here: <a href="{{portal_link}}">View Project</a></p>', 
   'booking', true),
  
  ('Deposit Reminder', 'Secure your session', 
   '<p>To secure the time, the deposit can be completed here: <a href="{{deposit_link}}">Complete Deposit</a></p>', 
   'payment', true),
  
  ('48-Hour Reminder', 'Reminder for {{date}}', 
   '<p>A reminder for your session on {{date_time}}.</p><p>Your preparation details are here: <a href="{{portal_link}}">View Preparation</a></p>', 
   'reminder', true),
  
  ('24-Hour Confirmation Request', 'Please confirm your session', 
   '<p>Please confirm your session for {{date_time}}.</p><p><a href="{{confirm_link}}">Confirm</a> | <a href="{{reschedule_link}}">Reschedule</a></p>', 
   'reminder', true),
  
  ('Reschedule Options', 'Rescheduling options', 
   '<p>Understood. Here are the most suitable alternatives:</p><ul><li>{{option_1}}</li><li>{{option_2}}</li><li>{{option_3}}</li></ul>', 
   'booking', true),
  
  ('Day 3 Aftercare Check-in', 'How is it feeling?', 
   '<p>How is it feeling today?</p><p>If you''d like, upload a photo here: <a href="{{upload_link}}">Upload Photo</a></p>', 
   'aftercare', true),
  
  ('Day 30 Healed Photo Request', 'Healed photo request', 
   '<p>If you''re happy with the healed result, you can upload a photo here: <a href="{{upload_link}}">Upload Photo</a></p><p>If you prefer it remains private, that is completely fine.</p>', 
   'aftercare', true)
ON CONFLICT (name) DO UPDATE SET
  subject = EXCLUDED.subject,
  body = EXCLUDED.body,
  template_type = EXCLUDED.template_type;

-- Seed luxury concierge message templates (corrected column names)
INSERT INTO public.concierge_message_templates (template_key, template_name, message_content, category, available_variables, is_active, allow_ai_variation)
VALUES
  ('policy_summary_display', 'Policy Summary Display', 
   'Before we proceed, here''s a summary of the studio policies:

A deposit of {{deposit_amount}} secures your session.
Cancellations or reschedules require {{cancellation_hours}} hours notice.
If you arrive more than {{late_minutes}} minutes late, the session may need to be rescheduled.

Would you like to view the full policies, or shall we continue?', 
   'policy', ARRAY['deposit_amount', 'cancellation_hours', 'late_minutes'], true, false),
  
  ('deposit_collected_confirmation', 'Deposit Collected Confirmation', 
   'Your deposit has been received. Your session is now secured for {{date_time}}.

You can view your project details anytime in your client portal.', 
   'payment', ARRAY['date_time', 'portal_link'], true, true),
  
  ('reschedule_confirmed', 'Reschedule Confirmed', 
   'Your session has been rescheduled to {{new_date_time}}.

Your original deposit applies to this session.', 
   'booking', ARRAY['new_date_time', 'original_date'], true, true),
  
  ('late_arrival_warning', 'Late Arrival Warning', 
   'If you''re running late, please let me know. If you arrive more than {{late_minutes}} minutes late, we may need to reschedule to protect the quality of your session.', 
   'booking', ARRAY['late_minutes'], true, true)
ON CONFLICT (template_key) DO UPDATE SET
  template_name = EXCLUDED.template_name,
  message_content = EXCLUDED.message_content,
  category = EXCLUDED.category,
  available_variables = EXCLUDED.available_variables;