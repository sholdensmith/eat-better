import type { Handler } from '@netlify/functions';
import { ParseResponseSchema, hygienePurge, validateSyncKey, rateLimit } from './_shared/util';

const SYSTEM_PROMPT = `You are a nutrition estimator. Convert casual food diary inputs into precise items with realistic calories and macros.

Rules:
- Output JSON ONLY matching:
  type ParsedFood = {
    item: string; qty: number; unit: string;
    calories_kcal: number; protein_g: number; carbs_g: number; fat_g: number;
    assumptions?: string[];
  };
  type ParseResponse = { items: ParsedFood[] };
- Prefer grams for solids and ml for liquids when quantities are given.
- If user uses non-metric units (“slice”, “tbsp”), keep that unit and return a reasonable qty with assumptions.
- If uncertain, choose the most reasonable assumption and note it in assumptions.
- Use typical US grocery items and realistic macro values.`;

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

async function callOpenAI(text: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Missing OPENAI_API_KEY');
  }
  const body = {
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: text },
    ],
    temperature: 0.2,
    response_format: { type: 'json_object' },
  } as any;
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new Error('No content');
  return content;
}

export const handler: Handler = async (event) => {
  const syncKey = validateSyncKey(event.headers as any);
  if (!syncKey) return { statusCode: 400, body: 'Missing or invalid X-Sync-Key' };
  if (!rateLimit(syncKey)) return { statusCode: 429, body: 'Slow down' };
  await hygienePurge(syncKey).catch(()=>{});

  try {
    const { text } = JSON.parse(event.body || '{}');
    if (!text || typeof text !== 'string') return { statusCode: 400, body: 'Bad input' };
    let out: any;
    try {
      const raw = await callOpenAI(text);
      out = ParseResponseSchema.parse(JSON.parse(raw));
    } catch (e1) {
      // retry once with a stricter instruction appended
      const raw2 = await callOpenAI(text + '\nReturn JSON ONLY.');
      out = ParseResponseSchema.parse(JSON.parse(raw2));
    }
    return { statusCode: 200, body: JSON.stringify(out) };
  } catch (err: any) {
    return { statusCode: 500, body: `Error: ${err.message || 'unknown'}` };
  }
};
