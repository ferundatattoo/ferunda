import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, ...params } = await req.json();
    console.log(`[enterprise-manager] Action: ${action}`);

    switch (action) {
      case 'create_organization': {
        const { name, slug, user_id, plan = 'free' } = params;

        // Create organization
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name,
            slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
            plan,
            trial_ends_at: plan === 'free' ? null : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
          })
          .select()
          .single();

        if (orgError) throw orgError;

        // Add creator as owner
        const { error: memberError } = await supabase
          .from('organization_members')
          .insert({
            organization_id: org.id,
            user_id,
            role: 'owner',
            status: 'active'
          });

        if (memberError) throw memberError;

        console.log(`[enterprise-manager] Created organization ${org.id}`);

        return new Response(JSON.stringify({ success: true, organization: org }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'invite_member': {
        const { organization_id, email, role, invited_by } = params;

        // Generate invitation token
        const token = crypto.randomUUID();
        const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        const { data: invitation, error } = await supabase
          .from('organization_invitations')
          .insert({
            organization_id,
            email,
            role,
            invited_by,
            token,
            expires_at
          })
          .select()
          .single();

        if (error) throw error;

        // Log audit event
        await supabase.from('enterprise_audit_log').insert({
          organization_id,
          user_id: invited_by,
          action: 'member_invited',
          resource_type: 'invitation',
          resource_id: invitation.id,
          new_values: { email, role }
        });

        console.log(`[enterprise-manager] Invitation sent to ${email}`);

        return new Response(JSON.stringify({ 
          success: true, 
          invitation,
          invite_link: `${Deno.env.get('SITE_URL') || ''}/invite/${token}`
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'accept_invitation': {
        const { token, user_id } = params;

        // Find invitation
        const { data: invitation, error: findError } = await supabase
          .from('organization_invitations')
          .select('*')
          .eq('token', token)
          .is('accepted_at', null)
          .gt('expires_at', new Date().toISOString())
          .single();

        if (findError || !invitation) {
          return new Response(JSON.stringify({ error: 'Invalid or expired invitation' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Add member
        const { error: memberError } = await supabase
          .from('organization_members')
          .insert({
            organization_id: invitation.organization_id,
            user_id,
            role: invitation.role,
            invited_by: invitation.invited_by,
            invited_at: invitation.created_at,
            status: 'active'
          });

        if (memberError) throw memberError;

        // Mark invitation as accepted
        await supabase
          .from('organization_invitations')
          .update({ accepted_at: new Date().toISOString() })
          .eq('id', invitation.id);

        console.log(`[enterprise-manager] User ${user_id} joined org ${invitation.organization_id}`);

        return new Response(JSON.stringify({ 
          success: true, 
          organization_id: invitation.organization_id 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'generate_api_key': {
        const { organization_id, name, scopes, created_by } = params;

        // Generate API key
        const key = `ink_${crypto.randomUUID().replace(/-/g, '')}`;
        const key_hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key))
          .then(hash => Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join(''));

        const { data: apiKey, error } = await supabase
          .from('organization_api_keys')
          .insert({
            organization_id,
            name,
            key_hash,
            key_prefix: key.substring(0, 12),
            scopes: scopes || ['read'],
            created_by,
            expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
          })
          .select()
          .single();

        if (error) throw error;

        // Log audit event
        await supabase.from('enterprise_audit_log').insert({
          organization_id,
          user_id: created_by,
          action: 'api_key_created',
          resource_type: 'api_key',
          resource_id: apiKey.id,
          new_values: { name, scopes }
        });

        return new Response(JSON.stringify({ 
          success: true, 
          api_key: key, // Only returned once!
          key_id: apiKey.id,
          message: 'Store this key securely - it will not be shown again'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get_usage': {
        const { organization_id } = params;

        const { data: usage, error } = await supabase
          .from('organization_usage')
          .select('*')
          .eq('organization_id', organization_id)
          .order('period_start', { ascending: false })
          .limit(12);

        if (error) throw error;

        // Get organization limits
        const { data: org } = await supabase
          .from('organizations')
          .select('plan, plan_limits')
          .eq('id', organization_id)
          .single();

        return new Response(JSON.stringify({ 
          success: true, 
          usage,
          plan: org?.plan,
          limits: org?.plan_limits
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get_audit_log': {
        const { organization_id, limit = 50, offset = 0 } = params;

        const { data: logs, error, count } = await supabase
          .from('enterprise_audit_log')
          .select('*', { count: 'exact' })
          .eq('organization_id', organization_id)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (error) throw error;

        return new Response(JSON.stringify({ 
          success: true, 
          logs,
          total: count,
          has_more: (count || 0) > offset + limit
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('[enterprise-manager] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
