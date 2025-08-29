import type { Handler } from '@netlify/functions';
import { ParsedFoodSchema, hygienePurge, todayKeyLA, validateSyncKey, rateLimit } from './_shared/util';
import { z } from 'zod';
import { sbInsert } from './_shared/util';

const BodySchema = z.object({
  dayKey: z.string().min(10),
  items: z.array(ParsedFoodSchema),
  consumedAt: z.string().datetime().optional(),
});

export const handler: Handler = async (event) => {
  const syncKey = validateSyncKey(event.headers as any);
  if (!syncKey) return { statusCode: 400, body: 'Missing or invalid X-Sync-Key' };
  if (!rateLimit(syncKey)) return { statusCode: 429, body: 'Slow down' };
  await hygienePurge(syncKey).catch(()=>{});

  try {
    const parsed = BodySchema.parse(JSON.parse(event.body || '{}'));
    const nowIso = new Date().toISOString();
    const rows = parsed.items.map((it) => ({
      id: (globalThis as any).crypto?.randomUUID ? (globalThis as any).crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      sync_key: syncKey,
      day_key: parsed.dayKey || todayKeyLA(),
      consumed_at: parsed.consumedAt || nowIso,
      item: it.item,
      qty: it.qty,
      unit: it.unit,
      calories_kcal: it.calories_kcal,
      protein_g: it.protein_g,
      carbs_g: it.carbs_g,
      fat_g: it.fat_g,
      source: 'ai',
      meta: it.assumptions ? { assumptions: it.assumptions } : null,
    }));
    await sbInsert('day_entries', rows);
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err: any) {
    return { statusCode: 400, body: `Error: ${err.message || 'bad request'}` };
  }
};
