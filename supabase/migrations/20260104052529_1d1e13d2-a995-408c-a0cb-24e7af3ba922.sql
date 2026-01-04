-- Add missing tables to supabase_realtime publication for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.omnichannel_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_avatar_videos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_learning_data;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_scheduling_suggestions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.design_revisions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.escalation_events;