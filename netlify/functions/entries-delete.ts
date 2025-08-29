import type { Handler } from '@netlify/functions';
import { hygienePurge, rateLimit, validateSyncKey } from './_shared/util';
import { sbDelete } from './_shared/util';

export const handler: Handler = async (event) => {
  const syncKey = validateSyncKey(event.headers as any);
  if (!syncKey) return { statusCode: 400, body: 'Missing or invalid X-Sync-Key' };
  if (!rateLimit(syncKey)) return { statusCode: 429, body: 'Slow down' };
  await hygienePurge(syncKey).catch(()=>{});
  const id = (event.queryStringParameters?.id || '').trim();
  if (!id) return { statusCode: 400, body: 'Missing id' };
  try {
    // Ensure the row belongs to this sync_key
    await sbDelete('day_entries', `id=eq.${encodeURIComponent(id)}&sync_key=eq.${encodeURIComponent(syncKey)}`);
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err: any) {
    return { statusCode: 500, body: `Error: ${err.message || 'unknown'}` };
  }
};

