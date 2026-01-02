import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const body = await req.json();
    
    // Health check handler - quick response to verify function is alive
    if (body?.healthCheck) {
      console.log('[chat-upload-url] Health check received');
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      // Quick check that storage is accessible
      const { error } = await supabase.storage.from('chat-uploads').list('', { limit: 1 });
      
      return new Response(JSON.stringify({ 
        status: error ? 'degraded' : 'ok',
        storage: !error,
        timestamp: Date.now()
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    const { filename, contentType, conversationId } = body;
    
    console.log('[chat-upload-url] Request received:', {
      filename,
      contentType,
      conversationId: conversationId?.slice(0, 8) + '...',
      timestamp: new Date().toISOString()
    });

    if (!filename || !contentType) {
      console.error('[chat-upload-url] Missing required fields');
      return new Response(
        JSON.stringify({ error: 'filename and contentType are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate unique path
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    const ext = filename.split('.').pop() || 'jpg';
    const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, '_').slice(0, 50);
    const path = `concierge/${conversationId || 'anonymous'}/${timestamp}-${random}-${safeName}`;

    console.log('[chat-upload-url] Generated path:', path);

    // Create signed upload URL (valid for 5 minutes)
    const { data: signedData, error: signedError } = await supabase.storage
      .from('chat-uploads')
      .createSignedUploadUrl(path);

    if (signedError) {
      console.error('[chat-upload-url] Failed to create signed URL:', signedError);
      
      // Fallback: try to ensure bucket exists and retry
      const { error: bucketError } = await supabase.storage.createBucket('chat-uploads', {
        public: true,
        fileSizeLimit: 10485760 // 10MB
      });
      
      if (bucketError && !bucketError.message.includes('already exists')) {
        console.error('[chat-upload-url] Bucket creation failed:', bucketError);
      }

      // Retry signed URL
      const { data: retryData, error: retryError } = await supabase.storage
        .from('chat-uploads')
        .createSignedUploadUrl(path);

      if (retryError) {
        console.error('[chat-upload-url] Retry failed:', retryError);
        return new Response(
          JSON.stringify({ error: 'Failed to create upload URL', details: retryError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const publicUrl = `${supabaseUrl}/storage/v1/object/public/chat-uploads/${path}`;
      
      console.log('[chat-upload-url] Success (after retry):', {
        path,
        latencyMs: Date.now() - startTime
      });

      return new Response(
        JSON.stringify({
          uploadUrl: retryData.signedUrl,
          token: retryData.token,
          path,
          publicUrl
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/chat-uploads/${path}`;

    console.log('[chat-upload-url] Success:', {
      path,
      latencyMs: Date.now() - startTime
    });

    return new Response(
      JSON.stringify({
        uploadUrl: signedData.signedUrl,
        token: signedData.token,
        path,
        publicUrl
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('[chat-upload-url] Unexpected error:', errMsg);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errMsg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
