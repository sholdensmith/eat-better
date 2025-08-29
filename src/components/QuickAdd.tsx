import { useState } from 'react';
import { ParsedFood, parseText, bulkUpsert } from '../lib/api';
import { todayKeyLA } from '../lib/date';

type Props = { disabled?: boolean; onSaved?: () => void };

export default function QuickAdd({ disabled, onSaved }: Props) {
  const [text, setText] = useState('');
  const [items, setItems] = useState<ParsedFood[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true); setError(null);
    try {
      const res = await parseText(text.trim());
      setItems(res.items);
    } catch (err: any) {
      setError(err.message || 'Failed to parse');
    } finally { setLoading(false); }
  }

  async function onSaveAll() {
    if (!items) return;
    setLoading(true); setError(null);
    try {
      await bulkUpsert(todayKeyLA(), items);
      setItems(null);
      setText('');
      onSaved?.();
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally { setLoading(false); }
  }

  return (
    <div className="p-4 border rounded-md bg-white">
      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          className="flex-1 border rounded px-3 py-2"
          placeholder="coffee, 100g yogurt, 14g granola"
          value={text}
          onChange={e=>setText(e.target.value)}
          disabled={disabled || loading}
        />
        <button className="px-3 py-2 border rounded bg-blue-600 text-white disabled:opacity-50" disabled={disabled || loading}>Parse</button>
      </form>
      {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
      {items && (
        <div className="mt-3">
          <div className="text-sm font-medium mb-2">Review</div>
          <div className="space-y-2">
            {items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-6 gap-2 items-center">
                <input className="col-span-2 border rounded px-2 py-1 text-sm" value={it.item} onChange={e=>setItems(repl(items, idx, { ...it, item: e.target.value }))} />
                <input className="border rounded px-2 py-1 text-sm" type="number" value={it.qty} onChange={e=>setItems(repl(items, idx, { ...it, qty: Number(e.target.value) }))} />
                <input className="border rounded px-2 py-1 text-sm" value={it.unit} onChange={e=>setItems(repl(items, idx, { ...it, unit: e.target.value }))} />
                <input className="border rounded px-2 py-1 text-sm" type="number" value={it.calories_kcal} onChange={e=>setItems(repl(items, idx, { ...it, calories_kcal: Number(e.target.value) }))} />
                <div className="text-xs text-gray-600">P{Math.round(it.protein_g)} C{Math.round(it.carbs_g)} F{Math.round(it.fat_g)}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button className="px-3 py-2 border rounded" onClick={()=>setItems(null)}>Cancel</button>
            <button className="px-3 py-2 border rounded bg-green-600 text-white" onClick={onSaveAll}>Save all</button>
          </div>
        </div>
      )}
    </div>
  );
}

function repl<T>(arr: T[], idx: number, v: T): T[] {
  return arr.map((x,i)=> i===idx ? v : x);
}

