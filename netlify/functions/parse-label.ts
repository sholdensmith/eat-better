import type { Handler } from '@netlify/functions';
import { validateSyncKey } from './_shared/util';

// Stub for backlog: accepts multipart/form-data with an image; for now, return 501.
export const handler: Handler = async (event) => {
  const syncKey = validateSyncKey(event.headers as any);
  if (!syncKey) return { statusCode: 400, body: 'Missing or invalid X-Sync-Key' };
  return { statusCode: 501, body: 'Not implemented' };
};

