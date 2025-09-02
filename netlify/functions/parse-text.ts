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

const DEFAULT_MODEL = 'gpt-4.1';
const FALLBACK_MODEL = 'gpt-4o';
const MODEL = process.env.OPENAI_MODEL || DEFAULT_MODEL;

const RESPONSE_JSON_SCHEMA = {
  name: 'ParseResponse',
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            item: { type: 'string' },
            qty: { type: 'number' },
            unit: { type: 'string' },
            calories_kcal: { type: 'number' },
            protein_g: { type: 'number' },
            carbs_g: { type: 'number' },
            fat_g: { type: 'number' },
            assumptions: { type: 'array', items: { type: 'string' } },
          },
          required: ['item', 'qty', 'unit', 'calories_kcal', 'protein_g', 'carbs_g', 'fat_g'],
        },
      },
    },
    required: ['items'],
  },
  strict: true,
} as const;

function extractResponseText(data: any): string | null {
  if (!data) return null;
  if (typeof data.output_text === 'string' && data.output_text.length > 0) return data.output_text;
  const t = data.content?.[0]?.text;
  if (typeof t === 'string' && t.length > 0) return t;
  return null;
}

function isModelAvailabilityError(status: number, body: any): boolean {
  const code = body?.error?.code || body?.code;
  const msg: string = body?.error?.message || body?.message || '';
  if (code === 'model_not_found') return true;
  if (status === 404) return true;
  if (/model\s+(?:not|isn't|is not)\s+found/i.test(msg)) return true;
  if (/You don't have access to this model/i.test(msg)) return true;
  return false;
}

async function callOpenAIWithModel(model: string, text: string, tighten = false): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Missing OPENAI_API_KEY');
  }
  const body: any = {
    model,
    input: [
      { role: 'system', content: [{ type: 'input_text', text: SYSTEM_PROMPT }] },
      { role: 'user', content: [{ type: 'input_text', text: tighten ? text + '\nReturn JSON ONLY.' : text }] },
    ],
    temperature: 0.2,
    response_format: { type: 'json_schema', json_schema: RESPONSE_JSON_SCHEMA },
  };
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const status = res.status;
    const msg = (data?.error?.message || `OpenAI error: ${status}`);
    const err: any = new Error(msg);
    err.status = status;
    err.body = data;
    throw err;
  }
  const content = extractResponseText(data);
  if (typeof content !== 'string') throw new Error('No content');
  return content;
}

async function callOpenAI(text: string, tighten = false): Promise<string> {
  try {
    return await callOpenAIWithModel(MODEL, text, tighten);
  } catch (err: any) {
    // If the configured/default model is unavailable, transparently retry with fallback
    if (MODEL !== FALLBACK_MODEL && isModelAvailabilityError(err?.status, err?.body)) {
      return await callOpenAIWithModel(FALLBACK_MODEL, text, tighten);
    }
    throw err;
  }
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
      const raw = await callOpenAI(text, false);
      out = ParseResponseSchema.parse(JSON.parse(raw));
    } catch (e1) {
      const raw2 = await callOpenAI(text, true);
      out = ParseResponseSchema.parse(JSON.parse(raw2));
    }
    return { statusCode: 200, body: JSON.stringify(out) };
  } catch (err: any) {
    return { statusCode: 500, body: `Error: ${err.message || 'unknown'}` };
  }
};
