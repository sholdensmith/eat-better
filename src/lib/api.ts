import { getOrCreateSyncKey } from './storage';

const API = '/api';

export type ParsedFood = {
  item: string; qty: number; unit: string;
  calories_kcal: number; protein_g: number; carbs_g: number; fat_g: number;
  assumptions?: string[];
};

export type Entry = {
  id: string;
  dayKey: string;
  consumedAt: string;
  item: string;
  qty: number;
  unit: string;
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  source: 'ai' | 'manual' | 'label';
  assumptions?: string[];
  previewImageUrl?: string;
};

async function request(path: string, init?: RequestInit) {
  const syncKey = getOrCreateSyncKey();
  const headers = new Headers(init?.headers || {});
  headers.set('X-Sync-Key', syncKey);
  headers.set('Content-Type', 'application/json');
  const res = await fetch(`${API}${path}`, { ...init, headers });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res;
}

export async function parseText(text: string): Promise<{ items: ParsedFood[] }> {
  const res = await request('/parse-text', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
  return res.json();
}

export async function bulkUpsert(dayKey: string, items: ParsedFood[], consumedAt?: string) {
  const res = await request('/entries-bulk-upsert', {
    method: 'POST',
    body: JSON.stringify({ dayKey, items, consumedAt }),
  });
  return res.json();
}

export async function getEntries(dayKey: string): Promise<Entry[]> {
  const res = await request(`/entries-get-today?dayKey=${encodeURIComponent(dayKey)}`);
  return res.json();
}

export async function deleteEntry(id: string) {
  const res = await request(`/entries-delete?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  return res.json();
}

