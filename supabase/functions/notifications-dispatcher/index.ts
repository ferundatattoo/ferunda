// Phase 5: Notifications Dispatcher Edge Function
// Creates notifications for workspace members based on event type and target role
// This bypasses RLS to create notifications for other users

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  workspaceId: string;
  eventType: string;
  title: string;
  message?: string;
  type: 'booking' | 'message' | 'payment' | 'alert' | 'system' | 'escalation';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  link?: string;
  targetRole: 'studio' | 'artist' | 'assistant' | 'all';
  payload?: Record<string, unknown>;
  // Optional: specific user IDs to notify instead of role-based
  specificUserIds?: string[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Use service role to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: NotificationRequest = await req.json();
    const {
      workspaceId,
      eventType,
      title,
      message,
      type,
      priority,
      link,
      targetRole,
      payload,
      specificUserIds,
    } = body;

    if (!workspaceId || !eventType || !title || !type || !targetRole) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields',
          required: ['workspaceId', 'eventType', 'title', 'type', 'targetRole']
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[notifications-dispatcher] Processing ${eventType} for workspace ${workspaceId}, target: ${targetRole}`);

    let userIds: string[] = [];

    if (specificUserIds && specificUserIds.length > 0) {
      // Use specific user IDs if provided
      userIds = specificUserIds;
    } else {
      // Resolve recipients based on role
      let query = supabase
        .from('workspace_members')
        .select('user_id')
        .eq('workspace_id', workspaceId)
        .eq('is_active', true);

      if (targetRole !== 'all') {
        query = query.eq('role', targetRole);
      }

      const { data: members, error: membersError } = await query;

      if (membersError) {
        console.error('[notifications-dispatcher] Error fetching members:', membersError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch workspace members', details: membersError }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      userIds = members?.map(m => m.user_id).filter(Boolean) || [];
    }

    if (userIds.length === 0) {
      console.log(`[notifications-dispatcher] No recipients found for role ${targetRole}`);
      return new Response(
        JSON.stringify({ success: true, notificationsSent: 0, message: 'No recipients found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[notifications-dispatcher] Creating notifications for ${userIds.length} users`);

    // Create notifications for each user
    const notifications = userIds.map(userId => ({
      user_id: userId,
      type,
      title,
      message: message || '',
      link: link || '',
      priority: priority || 'normal',
      is_read: false,
      metadata: { 
        event: eventType, 
        workspaceId,
        payload: payload ? JSON.parse(JSON.stringify(payload)) : null 
      },
    }));

    const { data: insertedNotifications, error: insertError } = await supabase
      .from('notifications')
      .insert(notifications)
      .select('id');

    if (insertError) {
      console.error('[notifications-dispatcher] Error inserting notifications:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create notifications', details: insertError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[notifications-dispatcher] ✅ Created ${insertedNotifications?.length || 0} notifications`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        notificationsSent: insertedNotifications?.length || 0,
        recipients: userIds 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[notifications-dispatcher] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
