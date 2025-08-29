import type { Handler } from '@netlify/functions';
import { supabaseHeaders } from './_shared/util';

export const handler: Handler = async () => {
  const env = {
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
  };

  let supabase = { reachable: false, tableExists: false, status: 0, error: undefined as string | undefined };
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

  const body = JSON.stringify({ env, supabase });
  return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body };
};

