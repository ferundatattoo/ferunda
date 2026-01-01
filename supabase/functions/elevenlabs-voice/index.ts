import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  action: 'clone_voice' | 'generate_speech' | 'list_voices' | 'delete_voice';
  name?: string;
  audioUrl?: string;
  voiceId?: string;
  text?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    
    if (!ELEVENLABS_API_KEY) {
      console.error('ELEVENLABS_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'ElevenLabs API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: RequestBody = await req.json();
    const { action, name, audioUrl, voiceId, text } = body;

    console.log(`ElevenLabs action: ${action}`);

    switch (action) {
      case 'clone_voice': {
        if (!name || !audioUrl) {
          return new Response(
            JSON.stringify({ error: 'Name and audioUrl are required for voice cloning' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`Cloning voice: ${name} from ${audioUrl}`);

        // Download the audio file from the URL
        const audioResponse = await fetch(audioUrl);
        if (!audioResponse.ok) {
          throw new Error(`Failed to download audio from ${audioUrl}`);
        }
        const audioBlob = await audioResponse.blob();

        // Create FormData for the multipart request
        const formData = new FormData();
        formData.append('name', name);
        formData.append('files', audioBlob, 'voice_sample.webm');
        formData.append('description', `Voice clone for ${name}`);

        // Send to ElevenLabs
        const cloneResponse = await fetch('https://api.elevenlabs.io/v1/voices/add', {
          method: 'POST',
          headers: {
            'xi-api-key': ELEVENLABS_API_KEY,
          },
          body: formData
        });

        if (!cloneResponse.ok) {
          const errorText = await cloneResponse.text();
          console.error('ElevenLabs clone error:', errorText);
          throw new Error(`Failed to clone voice: ${errorText}`);
        }

        const cloneData = await cloneResponse.json();
        console.log('Voice cloned successfully:', cloneData.voice_id);

        return new Response(
          JSON.stringify({ 
            success: true, 
            voice_id: cloneData.voice_id,
            name: cloneData.name 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'generate_speech': {
        if (!voiceId || !text) {
          return new Response(
            JSON.stringify({ error: 'voiceId and text are required for speech generation' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`Generating speech with voice ${voiceId}: "${text.slice(0, 50)}..."`);

        const ttsResponse = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
          {
            method: 'POST',
            headers: {
              'xi-api-key': ELEVENLABS_API_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text,
              model_id: 'eleven_multilingual_v2',
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75,
                style: 0.5,
                use_speaker_boost: true
              }
            })
          }
        );

        if (!ttsResponse.ok) {
          const errorText = await ttsResponse.text();
          console.error('ElevenLabs TTS error:', errorText);
          throw new Error(`Failed to generate speech: ${errorText}`);
        }

        const audioBuffer = await ttsResponse.arrayBuffer();
        console.log('Speech generated successfully, size:', audioBuffer.byteLength);

        return new Response(audioBuffer, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'audio/mpeg'
          }
        });
      }

      case 'list_voices': {
        console.log('Listing voices');

        const listResponse = await fetch('https://api.elevenlabs.io/v1/voices', {
          headers: {
            'xi-api-key': ELEVENLABS_API_KEY,
          }
        });

        if (!listResponse.ok) {
          const errorText = await listResponse.text();
          console.error('ElevenLabs list error:', errorText);
          throw new Error(`Failed to list voices: ${errorText}`);
        }

        const voicesData = await listResponse.json();
        console.log(`Found ${voicesData.voices?.length || 0} voices`);

        return new Response(
          JSON.stringify({ 
            success: true, 
            voices: voicesData.voices 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete_voice': {
        if (!voiceId) {
          return new Response(
            JSON.stringify({ error: 'voiceId is required for deletion' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`Deleting voice ${voiceId}`);

        const deleteResponse = await fetch(`https://api.elevenlabs.io/v1/voices/${voiceId}`, {
          method: 'DELETE',
          headers: {
            'xi-api-key': ELEVENLABS_API_KEY,
          }
        });

        if (!deleteResponse.ok) {
          const errorText = await deleteResponse.text();
          console.error('ElevenLabs delete error:', errorText);
          throw new Error(`Failed to delete voice: ${errorText}`);
        }

        console.log('Voice deleted successfully');

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('ElevenLabs function error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
