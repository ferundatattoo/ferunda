// =============================================================================
// GOOGLE CALENDAR SYNC v2.0 - CORE BUS CONNECTED
// Consolidated: All calendar sync events published to ferunda-core-bus
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Core Bus Publisher
async function publishToCoreBus(
  supabase: ReturnType<typeof createClient>,
  eventType: string,
  payload: Record<string, unknown>
) {
  try {
    const channel = supabase.channel('ferunda-core-bus');
    await channel.send({
      type: 'broadcast',
      event: eventType,
      payload: { ...payload, timestamp: Date.now(), source: 'google-calendar-sync' }
    });
    console.log(`[GoogleCalendarSync] Published ${eventType} to Core Bus`);
  } catch (err) {
    console.error('[GoogleCalendarSync] Core Bus publish error:', err);
  }
}

type ParsedGoogleError = {
  status: number;
  reason?: string;
  message?: string;
  domain?: string;
  error?: unknown;
};

function parseGoogleApiError(status: number, rawText: string): ParsedGoogleError {
  try {
    const parsed = JSON.parse(rawText);
    const err = parsed?.error;
    const first = Array.isArray(err?.errors) ? err.errors[0] : undefined;

    return {
      status,
      reason: first?.reason,
      message: err?.message,
      domain: first?.domain,
      error: parsed,
    };
  } catch {
    // Not JSON (sometimes Google returns HTML or plain text)
    return { status, message: rawText };
  }
}

interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
}

interface PendingDateImport {
  id: string;
  google_event_id: string;
  date: string;
  city: string;
  summary: string;
  location?: string;
  status: 'pending' | 'approved' | 'rejected';
}

// City detection based on location or summary
function detectCity(event: GoogleCalendarEvent): string | null {
  const text = `${event.summary || ''} ${event.location || ''} ${event.description || ''}`.toLowerCase();

  if (text.includes('austin') || text.includes('atx')) return 'Austin';
  if (text.includes('los angeles') || text.includes('la') || text.includes('l.a.')) return 'Los Angeles';
  if (text.includes('houston') || text.includes('htx')) return 'Houston';
  if (text.includes('new york') || text.includes('nyc')) return 'New York';
  if (text.includes('miami')) return 'Miami';
  if (text.includes('chicago')) return 'Chicago';
  if (text.includes('denver')) return 'Denver';
  if (text.includes('seattle')) return 'Seattle';
  if (text.includes('portland')) return 'Portland';

  return null;
}

// Check if event indicates tattoo availability
function isAvailabilityEvent(event: GoogleCalendarEvent): boolean {
  const summary = (event.summary || '').toLowerCase();
  const description = (event.description || '').toLowerCase();

  const availabilityKeywords = [
    'tattoo', 'session', 'available', 'open', 'booking',
    'guest spot', 'guest', 'studio', 'appointment'
  ];

  const blockedKeywords = [
    'blocked', 'busy', 'personal', 'off', 'vacation',
    'travel day', 'flight', 'meeting'
  ];

  // Check if it's a blocked event
  if (blockedKeywords.some(kw => summary.includes(kw) || description.includes(kw))) {
    return false;
  }

  // Check if it's an availability event
  return availabilityKeywords.some(kw => summary.includes(kw) || description.includes(kw));
}

serve(async (req) => {
  console.log('Google Calendar Sync function called');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    console.log('Request body:', JSON.stringify({ action: body.action, hasAccessToken: !!body.accessToken }));

    const { action, accessToken, dateRange, pendingImports } = body;

    if (action === 'fetch-events') {
      // Fetch events from Google Calendar
      if (!accessToken) {
        return new Response(
          JSON.stringify({ error: 'Access token required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const timeMin = dateRange?.start || new Date().toISOString();
      const timeMax = dateRange?.end || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

      // Fetch from Google Calendar API
      const calendarResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
          `timeMin=${encodeURIComponent(timeMin)}&` +
          `timeMax=${encodeURIComponent(timeMax)}&` +
          `singleEvents=true&orderBy=startTime`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!calendarResponse.ok) {
        const errorText = await calendarResponse.text();
        const parsed = parseGoogleApiError(calendarResponse.status, errorText);

        console.error('Google Calendar API error:', {
          status: calendarResponse.status,
          reason: parsed.reason,
          message: parsed.message,
        });

        return new Response(
          JSON.stringify({
            error: 'Google Calendar API error',
            google: {
              status: parsed.status,
              reason: parsed.reason,
              message: parsed.message,
            },
            details: errorText,
          }),
          { status: calendarResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const calendarData = await calendarResponse.json();
      const events: GoogleCalendarEvent[] = calendarData.items || [];

      // Process events to detect cities and availability
      const pendingDates: PendingDateImport[] = [];
      const cityEvents: Record<string, GoogleCalendarEvent[]> = {};

      for (const event of events) {
        const city = detectCity(event);
        const isAvailability = isAvailabilityEvent(event);
        
        if (city) {
          if (!cityEvents[city]) cityEvents[city] = [];
          cityEvents[city].push(event);

          // Extract date
          const startDate = event.start.dateTime 
            ? event.start.dateTime.split('T')[0] 
            : event.start.date;

          if (startDate && isAvailability) {
            pendingDates.push({
              id: crypto.randomUUID(),
              google_event_id: event.id,
              date: startDate,
              city,
              summary: event.summary,
              location: event.location,
              status: 'pending'
            });
          }
        }
      }

      console.log(`Found ${events.length} total events, ${pendingDates.length} availability dates`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          totalEvents: events.length,
          pendingDates,
          cityEvents: Object.entries(cityEvents).map(([city, evts]) => ({
            city,
            count: evts.length,
            events: evts.slice(0, 5) // Preview first 5
          }))
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'test-connection') {
      if (!accessToken) {
        return new Response(
          JSON.stringify({ error: 'Access token required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const testResponse = await fetch(
        'https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!testResponse.ok) {
        const errorText = await testResponse.text();
        const parsed = parseGoogleApiError(testResponse.status, errorText);

        return new Response(
          JSON.stringify({
            error: 'Google Calendar API error',
            google: {
              status: parsed.status,
              reason: parsed.reason,
              message: parsed.message,
            },
            details: errorText,
          }),
          { status: testResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'approve-batch') {
      // Approve and import selected dates
      if (!pendingImports || !Array.isArray(pendingImports)) {
        return new Response(
          JSON.stringify({ error: 'pendingImports array required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const approvedDates = pendingImports.filter((p: PendingDateImport) => p.status === 'approved');
      
      // Insert into availability table
      const insertData = approvedDates.map((p: PendingDateImport) => ({
        date: p.date,
        city: p.city,
        is_available: true,
        notes: `Synced from Google Calendar: ${p.summary}`,
        external_event_id: p.google_event_id,
        slot_type: 'available'
      }));

      if (insertData.length > 0) {
        const { data: insertedDates, error: insertError } = await supabase
          .from('availability')
          .upsert(insertData, { 
            onConflict: 'date,city',
            ignoreDuplicates: true 
          })
          .select();

        if (insertError) {
          console.error('Insert error:', insertError);
          return new Response(
            JSON.stringify({ error: 'Failed to import dates', details: insertError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`Imported ${insertedDates?.length || 0} dates`);

        return new Response(
          JSON.stringify({ 
            success: true, 
            imported: insertedDates?.length || 0,
            dates: insertedDates
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, imported: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'push-to-calendar') {
      // Push availability dates to Google Calendar
      if (!accessToken) {
        return new Response(
          JSON.stringify({ error: 'Access token required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch availability dates
      const { data: availabilityDates, error: fetchError } = await supabase
        .from('availability')
        .select('*, city_configurations!availability_city_id_fkey(city_name, color_hex)')
        .eq('is_available', true)
        .gte('date', new Date().toISOString().split('T')[0])
        .is('external_event_id', null);

      if (fetchError) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch availability dates' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let created = 0;
      for (const availability of availabilityDates || []) {
        // Create Google Calendar event
        const event = {
          summary: `🖤 Tattoo Available - ${availability.city}`,
          description: availability.notes || 'Available for tattoo session',
          start: { date: availability.date },
          end: { date: availability.date },
        };

        const createResponse = await fetch(
          'https://www.googleapis.com/calendar/v3/calendars/primary/events',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(event),
          }
        );

        if (createResponse.ok) {
          const createdEvent = await createResponse.json();
          
          // Update availability with external_event_id
          await supabase
            .from('availability')
            .update({ external_event_id: createdEvent.id })
            .eq('id', availability.id);
          
          created++;
        }
      }

      return new Response(
        JSON.stringify({ success: true, created }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in google-calendar-sync:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
