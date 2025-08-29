import { z } from 'zod';

export const TZ = 'America/Los_Angeles';

export function validateSyncKey(h: Headers): string | null {
  const k = h.get('X-Sync-Key');
  if (!k) return null;
  if (k.length < 16) return null; // simple sanity check; UUID v4 is 36 chars
  return k;
}

export function todayKeyLA(): string {
  const d = new Date();
  return formatDayKey(d);
}

export function formatDayKey(d: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(d);
  const y = parts.find(p => p.type === 'year')!.value;
  const m = parts.find(p => p.type === 'month')!.value;
  const day = parts.find(p => p.type === 'day')!.value;
  return `${y}-${m}-${day}`;
}

export function dayKeyMinus(dayKey: string, days: number): string {
  const [y,m,d] = dayKey.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m-1, d));
  dt.setUTCDate(dt.getUTCDate() - days);
  return formatDayKey(dt);
}

// Minimal in-function rate limiter per sync key
const lastCall = new Map<string, number>();
export function rateLimit(key: string, minIntervalMs = 150): boolean {
  const now = Date.now();
  const prev = lastCall.get(key) || 0;
  if (now - prev < minIntervalMs) return false;
  lastCall.set(key, now);
  return true;
}

// Supabase REST helpers
function supabaseHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.SUPABASE_URL;
  if (!key || !url) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  } as Record<string, string>;
}

export async function sbInsert(table: string, rows: any[]) {
  const urlBase = process.env.SUPABASE_URL;
  if (!urlBase) throw new Error('Missing SUPABASE_URL');
  const url = `${urlBase}/rest/v1/${table}`;
  const res = await fetch(url, { method: 'POST', headers: supabaseHeaders(), body: JSON.stringify(rows) });
  if (!res.ok) throw new Error(`Supabase insert failed: ${res.status}`);
  return res.json();
}

export async function sbSelect(table: string, query: string, order?: string) {
  const urlBase = process.env.SUPABASE_URL;
  if (!urlBase) throw new Error('Missing SUPABASE_URL');
  const url = new URL(`${urlBase}/rest/v1/${table}`);
  url.searchParams.set('select', '*');
  // query like: sync_key=eq.xxx&day_key=eq.YYYY-MM-DD
  for (const kv of query.split('&')) {
    const [k,v] = kv.split('=');
    if (k) url.searchParams.set(k, v);
  }
  if (order) url.searchParams.set('order', order);
  const res = await fetch(url.toString(), { headers: supabaseHeaders() });
  if (!res.ok) throw new Error(`Supabase select failed: ${res.status}`);
  return res.json();
}

export async function sbDelete(table: string, query: string) {
  const urlBase = process.env.SUPABASE_URL;
  if (!urlBase) throw new Error('Missing SUPABASE_URL');
  const url = new URL(`${urlBase}/rest/v1/${table}`);
  for (const kv of query.split('&')) {
    const [k,v] = kv.split('=');
    if (k) url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), { method: 'DELETE', headers: supabaseHeaders() });
  if (!res.ok) throw new Error(`Supabase delete failed: ${res.status}`);
  return true;
}

export async function hygienePurge(syncKey: string) {
  const today = todayKeyLA();
  const cutoff = dayKeyMinus(today, 2);
  // delete where day_key < cutoff
  await sbDelete('day_entries', `sync_key=eq.${encodeURIComponent(syncKey)}&day_key=lt.${encodeURIComponent(cutoff)}`);
}

export const ParsedFoodSchema = z.object({
  item: z.string(),
  qty: z.number(),
  unit: z.string(),
  calories_kcal: z.number(),
  protein_g: z.number(),
  carbs_g: z.number(),
  fat_g: z.number(),
  assumptions: z.array(z.string()).optional(),
});
export const ParseResponseSchema = z.object({ items: z.array(ParsedFoodSchema) });
