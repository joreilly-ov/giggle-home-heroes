import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ANALYSE_URL = Deno.env.get("ANALYSE_URL") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

function logEvent(event: Record<string, unknown>) {
  try {
    console.log(JSON.stringify({ fn: 'analyse-video', ts: new Date().toISOString(), ...event }));
  } catch {
    console.log('analyse-video log serialise failed');
  }
}

function unauthorized() {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const requestId = req.headers.get('x-request-id') ?? crypto.randomUUID();
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('cf-connecting-ip')
    ?? null;

  // Require a valid authenticated user
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    logEvent({ event: 'auth_failure', reason: 'missing_bearer', request_id: requestId, ip });
    return unauthorized();
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    logEvent({
      event: 'auth_failure',
      reason: authError ? 'invalid_token' : 'no_user',
      auth_error: authError?.message ?? null,
      request_id: requestId,
      ip,
    });
    return unauthorized();
  }

  const limit = checkRateLimit(`analyse-video:${user.id}`, 10, 60_000);
  if (!limit.allowed) {
    logEvent({
      event: 'rate_limit_hit',
      user_id: user.id,
      retry_after_seconds: limit.retryAfter,
      request_id: requestId,
      ip,
    });
    return rateLimitResponse(limit.retryAfter, corsHeaders);
  }

  if (!ANALYSE_URL) {
    return new Response(JSON.stringify({ error: 'Service not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!file) {
      return new Response(JSON.stringify({ error: 'No video file provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const proxyForm = new FormData();
    proxyForm.append('file', file);

    const lat = formData.get('browser_lat');
    const lon = formData.get('browser_lon');
    if (lat) proxyForm.append('browser_lat', lat as string);
    if (lon) proxyForm.append('browser_lon', lon as string);

    const response = await fetch(ANALYSE_URL, {
      method: 'POST',
      body: proxyForm,
      headers: { 'Authorization': authHeader },
    });

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      data = { error: `Analysis service returned an unexpected response (${response.status})` };
    }

    if (!response.ok) {
      const errorMsg = (data as Record<string, unknown>)?.error as string
        || `Analysis service error (${response.status})`;
      return new Response(JSON.stringify({ error: errorMsg }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error proxying video analysis:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
