import type { Handler } from '@netlify/functions';
import { supabaseHeaders } from './_shared/util';

export const handler: Handler = async () => {
  const env = {
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
  };

  let supabase = { reachable: false, tableExists: false, status: 0, error: undefined as string | undefined };
  let openai = {
    configuredModel: (process.env.OPENAI_MODEL || 'gpt-4.1'),
    attemptedModel: '' as string,
    fallbackModel: 'gpt-4o',
    ok: false,
    usedFallback: false,
    status: 0,
    error: undefined as string | undefined,
  };
  try {
    const base = process.env.SUPABASE_URL;
    if (!base) throw new Error('Missing SUPABASE_URL');
    const url = new URL(`${base}/rest/v1/day_entries`);
    url.searchParams.set('select', 'id');
    url.searchParams.set('limit', '1');
    const res = await fetch(url.toString(), { headers: supabaseHeaders() });
    supabase.status = res.status;
    if (res.ok) {
      supabase.reachable = true;
      supabase.tableExists = true;
    } else if (res.status === 404) {
      supabase.reachable = true; // project reachable
      supabase.tableExists = false; // table missing
      try { const j = await res.json(); supabase.error = j?.message || String(await res.text()); } catch {}
    } else {
      try { const j = await res.json(); supabase.error = j?.message || String(await res.text()); } catch {}
    }
  } catch (e: any) {
    supabase.error = e?.message || 'unknown error';
  }

  // OpenAI Responses API health probe (minimal token usage)
  if (env.OPENAI_API_KEY) {
    const tryModel = async (model: string) => {
      openai.attemptedModel = model;
      try {
        const res = await fetch('https://api.openai.com/v1/responses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model,
            input: [
              { role: 'system', content: [{ type: 'input_text', text: 'You are a health probe.' }] },
              { role: 'user', content: [{ type: 'input_text', text: 'ping' }] },
            ],
            temperature: 0,
            max_output_tokens: 16,
          }),
        });
        openai.status = res.status;
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          openai.error = data?.error?.message || `HTTP ${res.status}`;
          return false;
        }
        openai.ok = true;
        return true;
      } catch (e: any) {
        openai.error = e?.message || 'network error';
        return false;
      }
    };

    const primary = openai.configuredModel;
    const okPrimary = await tryModel(primary);
    if (!okPrimary && primary !== openai.fallbackModel) {
      const okFallback = await tryModel(openai.fallbackModel);
      if (okFallback) openai.usedFallback = true;
    }
  } else {
    openai.error = 'Missing OPENAI_API_KEY';
  }

  const body = JSON.stringify({ env, supabase, openai });
  return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body };
};
