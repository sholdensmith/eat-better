import type { Handler } from '@netlify/functions';
import { hygienePurge, validateSyncKey } from './_shared/util';
import { sbSelect } from './_shared/util';

export const handler: Handler = async (event) => {
  const syncKey = validateSyncKey(event.headers as any);
  if (!syncKey) return { statusCode: 400, body: 'Missing or invalid X-Sync-Key' };
  await hygienePurge(syncKey).catch(()=>{});
  const dayKey = (event.queryStringParameters?.dayKey || '').trim();
  if (!dayKey) return { statusCode: 400, body: 'Missing dayKey' };
  try {
    const rows = await sbSelect('day_entries', `sync_key=eq.${encodeURIComponent(syncKey)}&day_key=eq.${encodeURIComponent(dayKey)}`, 'consumed_at.asc');
    // Map DB -> API shape
    const out = rows.map((r: any) => ({
      id: r.id,
      dayKey: r.day_key,
      consumedAt: r.consumed_at,
      item: r.item,
      qty: Number(r.qty),
      unit: r.unit,
      calories_kcal: Number(r.calories_kcal),
      protein_g: Number(r.protein_g),
      carbs_g: Number(r.carbs_g),
      fat_g: Number(r.fat_g),
      source: (r.source || 'ai') as any,
      assumptions: r.meta?.assumptions || undefined,
    }));
    return { statusCode: 200, body: JSON.stringify(out) };
  } catch (err: any) {
    return { statusCode: 500, body: `Error: ${err.message || 'unknown'}` };
  }
};

