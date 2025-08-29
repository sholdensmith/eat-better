import { useEffect, useState } from 'react';
import { Targets, loadTargets, saveTargets } from '../lib/storage';

function roundToNearest25(n: number) { return Math.round(n / 25) * 25; }

export default function Settings() {
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [targets, setTargets] = useState<Targets>({ calories_kcal: 0, protein_g: 0, carbs_g: null, fat_g: null });

  useEffect(() => {
    const t = loadTargets();
    if (t) setTargets(t);
  }, []);

  function parseWeight(w: string): number | null {
    const s = w.trim().toLowerCase();
    if (!s) return null;
    const lbMatch = s.match(/([\d.]+)\s*lb/);
    const kgMatch = s.match(/([\d.]+)\s*kg/);
    if (lbMatch) return parseFloat(lbMatch[1]);
    if (kgMatch) return parseFloat(kgMatch[1]) * 2.20462;
    const plain = parseFloat(s);
    return isNaN(plain) ? null : plain; // assume lb
  }

  function recalc() {
    const lb = parseWeight(weight);
    if (!lb) return;
    const calories = roundToNearest25(14 * lb);
    const protein = Math.round(0.8 * lb);
    setTargets(t => ({ ...t, calories_kcal: calories, protein_g: protein }));
  }

  function onSave() {
    saveTargets(targets);
  }

  return (
    <div className="space-y-4">
      <div className="p-4 border rounded-md bg-white">
        <div className="font-medium mb-2">Profile</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input className="border rounded px-3 py-2" placeholder="Weight (e.g., 190 lb or 86 kg)" value={weight} onChange={e=>setWeight(e.target.value)} />
          <input className="border rounded px-3 py-2" placeholder="Height (e.g., 5'10\" or 178 cm)" value={height} onChange={e=>setHeight(e.target.value)} />
        </div>
        <button className="mt-3 px-3 py-2 border rounded" onClick={recalc}>Recalculate suggestions</button>
      </div>

      <div className="p-4 border rounded-md bg-white">
        <div className="font-medium mb-2">Targets</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="text-sm">Calories (kcal)
            <input className="mt-1 w-full border rounded px-3 py-2" type="number" value={targets.calories_kcal} onChange={e=>setTargets(t=>({...t, calories_kcal: Number(e.target.value)}))} />
          </label>
          <label className="text-sm">Protein (g)
            <input className="mt-1 w-full border rounded px-3 py-2" type="number" value={targets.protein_g} onChange={e=>setTargets(t=>({...t, protein_g: Number(e.target.value)}))} />
          </label>
          <label className="text-sm">Carbs (g)
            <input className="mt-1 w-full border rounded px-3 py-2" type="number" value={targets.carbs_g ?? ''} onChange={e=>setTargets(t=>({...t, carbs_g: e.target.value === '' ? null : Number(e.target.value)}))} />
          </label>
          <label className="text-sm">Fat (g)
            <input className="mt-1 w-full border rounded px-3 py-2" type="number" value={targets.fat_g ?? ''} onChange={e=>setTargets(t=>({...t, fat_g: e.target.value === '' ? null : Number(e.target.value)}))} />
          </label>
        </div>
        <button className="mt-3 px-3 py-2 border rounded bg-blue-600 text-white" onClick={onSave}>Save</button>
      </div>
    </div>
  );
}

