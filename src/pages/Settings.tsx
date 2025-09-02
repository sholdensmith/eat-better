import { useEffect, useState } from 'react';
import { Targets, loadTargets, saveTargets, loadProfile, saveProfile } from '../lib/storage';
import { getHealth, HealthResponse } from '../lib/api';
import PairDevices from '../components/PairDevices';

function roundToNearest25(n: number) { return Math.round(n / 25) * 25; }

export default function Settings() {
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [targets, setTargets] = useState<Targets>({ calories_kcal: 0, protein_g: 0, carbs_g: null, fat_g: null });
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<'male' | 'female'>('male');
  const [activity, setActivity] = useState('1.375'); // lightly active default
  const [deficit, setDeficit] = useState('500');
  const [goalWeight, setGoalWeight] = useState('');
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  useEffect(() => {
    const t = loadTargets();
    if (t) setTargets(t);
    const p = loadProfile();
    if (p) {
      setWeight(p.weight || '');
      setHeight(p.height || '');
      setAge(String(p.age ?? ''));
      setSex((p.sex as any) || 'male');
      setActivity(String(p.activity ?? '1.375'));
      setDeficit(String(p.deficit ?? '500'));
      setGoalWeight(p.goalWeight || '');
    }
    // fetch health info (fire-and-forget)
    getHealth().then(setHealth).catch(err => setHealthError(err?.message || 'Health check failed'));
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

  function parseHeightCm(h: string): number | null {
    const s = h.trim().toLowerCase();
    if (!s) return null;
    const cmMatch = s.match(/([\d.]+)\s*cm/);
    if (cmMatch) return parseFloat(cmMatch[1]);
    // patterns like 5 ft 7 in, 5ft7, 5'7"
    const ftIn = s.match(/(\d+)\s*(?:ft|')\s*(\d+)?\s*(?:in|"|)?/);
    if (ftIn) {
      const ft = parseInt(ftIn[1], 10);
      const ins = ftIn[2] ? parseInt(ftIn[2], 10) : 0;
      return Math.round(ft * 30.48 + ins * 2.54);
    }
    // fallback: two numbers like 5 7
    const twoNums = s.match(/^(\d+)\s+(\d+)$/);
    if (twoNums) {
      const ft = parseInt(twoNums[1], 10);
      const ins = parseInt(twoNums[2], 10);
      return Math.round(ft * 30.48 + ins * 2.54);
    }
    const plain = parseFloat(s);
    return isNaN(plain) ? null : plain; // assume cm
  }

  function recalc() {
    const lb = parseWeight(weight);
    const cm = parseHeightCm(height);
    const years = parseInt(age || '0', 10);
    if (!lb || !cm || !years) return;
    const kg = lb / 2.20462;
    // Mifflin–St Jeor
    const C = sex === 'male' ? 5 : -161;
    const bmr = 10 * kg + 6.25 * cm - 5 * years + C;
    const act = parseFloat(activity || '1.375');
    let tdee = bmr * act;
    const def = parseFloat(deficit || '0');
    let cals = tdee - (isNaN(def) ? 0 : def);
    cals = Math.max(1000, cals); // floor sanity
    const calories = roundToNearest25(cals);

    // Protein suggestion: 0.8–1.0 g/lb; prefer goal weight if provided
    const baseLb = parseWeight(goalWeight) || lb;
    const protein = Math.round(0.9 * baseLb);
    setTargets(t => ({ ...t, calories_kcal: calories, protein_g: protein }));
  }

  function onSave() {
    saveTargets(targets);
    const profile = {
      weight,
      height,
      age: parseInt(age || '0', 10) || 0,
      sex,
      activity: parseFloat(activity || '1.375') || 1.375,
      deficit: parseFloat(deficit || '0') || 0,
      goalWeight: goalWeight || undefined,
    };
    saveProfile(profile);
  }

  return (
    <div className="space-y-4 pb-20">
      <div className="p-4 border rounded-md bg-white">
        <div className="font-medium mb-2">Profile</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input className="border rounded px-3 py-2" placeholder="Weight (e.g., 211 lb or 96 kg)" value={weight} onChange={e=>setWeight(e.target.value)} />
          <input className="border rounded px-3 py-2" placeholder="Height (e.g., 5 ft 7 in or 170 cm)" value={height} onChange={e=>setHeight(e.target.value)} />
          <input className="border rounded px-3 py-2" placeholder="Age (years)" value={age} onChange={e=>setAge(e.target.value)} />
          <div className="flex gap-2 items-center">
            <label className="text-sm">Sex</label>
            <select className="border rounded px-2 py-2" value={sex} onChange={e=>setSex(e.target.value as any)}>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <div className="flex gap-2 items-center">
            <label className="text-sm">Activity</label>
            <select className="border rounded px-2 py-2" value={activity} onChange={e=>setActivity(e.target.value)}>
              <option value="1.2">Sedentary ×1.2</option>
              <option value="1.375">Lightly active ×1.375</option>
              <option value="1.55">Moderately active ×1.55</option>
              <option value="1.725">Very active ×1.725</option>
            </select>
          </div>
          <input className="border rounded px-3 py-2" placeholder="Daily calorie deficit (e.g., 500)" value={deficit} onChange={e=>setDeficit(e.target.value)} />
          <input className="border rounded px-3 py-2" placeholder="Goal weight (optional)" value={goalWeight} onChange={e=>setGoalWeight(e.target.value)} />
        </div>
        <button className="mt-3 px-3 py-2 border rounded" onClick={recalc}>Recalculate suggestions (Mifflin–St Jeor)</button>
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

      <div className="p-4 border rounded-md bg-white">
        <div className="font-medium mb-2">AI Model Health</div>
        {!health && !healthError && <div className="text-sm text-gray-600">Checking OpenAI model…</div>}
        {healthError && <div className="text-sm text-red-600">{healthError}</div>}
        {health && (
          <div className="text-sm">
            <div>Configured: <span className="font-mono">{health.openai.configuredModel}</span></div>
            <div>Attempted: <span className="font-mono">{health.openai.attemptedModel || '—'}</span></div>
            <div>Fallback: <span className="font-mono">{health.openai.fallbackModel}</span></div>
            <div>Status: {health.openai.ok ? <span className="text-green-700">OK</span> : <span className="text-red-700">Error</span>} (HTTP {health.openai.status || 0})</div>
            {health.openai.usedFallback && <div className="text-amber-700">Using fallback model</div>}
            {health.openai.error && <div className="text-gray-700">{health.openai.error}</div>}
          </div>
        )}
      </div>

      <PairDevices />
    </div>
  );
}
