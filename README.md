% Eat Better (MVP)

Single-user, cross-device food logging app with pairing key sync. No login; Netlify Functions call OpenAI (server-side) and Supabase (service-role) for cloud sync. The UI resets daily (America/Los_Angeles).

## Tech

- React + TypeScript + Vite
- Tailwind CSS
- TanStack Query
- Netlify Functions (TypeScript)
- Supabase REST (service-role via functions only)

## Pairing (no login)

- On first load, the client generates a `syncKey` (UUID v4) and stores it in `localStorage`.
- "Pair devices" shows a QR linking to `/#k=<syncKey>`.
- On visiting that URL, the client reads `#k=...`, stores the same `syncKey`, and clears the hash. All API requests attach `X-Sync-Key`.

## Daily reset

- "Today" is computed in `America/Los_Angeles`.
- UI clears at local midnight and re-fetches entries.
- Each function call purges rows older than 2 days for that `syncKey`.

## Environment variables (Netlify)

- `SUPABASE_URL` (e.g., https://YOUR-PROJECT.supabase.co)
- `SUPABASE_SERVICE_ROLE_KEY` (Service role key; never exposed to client)
- `OPENAI_API_KEY` (Server-side only)
- Optional: `OPENAI_MODEL` (default `gpt-4o-mini`)

## Supabase schema

```
create table if not exists day_entries (
  id uuid primary key default gen_random_uuid(),
  sync_key text not null,
  day_key text not null,
  consumed_at timestamptz not null,
  item text not null,
  qty numeric not null,
  unit text not null,
  calories_kcal numeric not null,
  protein_g numeric not null,
  carbs_g numeric not null,
  fat_g numeric not null,
  source text default 'ai',
  meta jsonb,
  created_at timestamptz default now()
);

create index if not exists day_entries_sync_day_idx
  on day_entries (sync_key, day_key);
```

RLS: optional. If enabled, add a policy allowing only service role (or disable RLS for MVP since only functions access it).

Note: The functions now generate `id` values server-side. If you don’t enable `pgcrypto` (for `gen_random_uuid()`), inserts will still work because an `id` is provided explicitly. Enabling the extension is still recommended but not required.

## Local development

- Install deps: `npm install`
- Run dev server: `npm run dev`
- Netlify Functions run via Netlify during deploy. For local testing you can use Netlify CLI (`netlify dev`), but not required to iterate UI.

## Functions (API)

Headers: client sends `X-Sync-Key: <syncKey>`.

- `POST /api/parse-text` → Calls OpenAI with a strict JSON-only prompt. Returns `{ items: ParsedFood[] }`.
- `POST /api/entries-bulk-upsert` → Body `{ dayKey, items, consumedAt? }` inserts rows for `(sync_key, day_key)`.
- `GET /api/entries-get-today?dayKey=YYYY-MM-DD` → Returns entries sorted by time.
- `DELETE /api/entries-delete?id=<id>` → Hard-deletes a row scoped to `sync_key`.

All functions run a small hygiene purge: `DELETE FROM day_entries WHERE sync_key = $1 AND day_key < (today - 2 days)`.

## Acceptance checks

1. First load shows empty Dashboard; Settings nudges targets.
2. Enter weight/height in Settings → suggested calorie/protein → Save → Dashboard shows targets.
3. Quick Add `coffee, 100g yogurt, 14g granola` → review → Save → progress + today list update.
4. Pairing via QR `/#k=...` works across devices; entries sync after adds/deletes.
5. Delete updates totals immediately (optimistic) and persists across refreshes.
6. At local midnight (America/Los_Angeles), UI resets and `/api/entries-get-today` returns empty.

## Notes

- Keys (OpenAI, Supabase) are never exposed to the browser. All calls go through Netlify Functions.
- Input/Output validated with Zod in functions.
- Time math uses `America/Los_Angeles` in both UI and functions.
- A stub for `/api/parse-label` is included for future nutrition label ingestion.
