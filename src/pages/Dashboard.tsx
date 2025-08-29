import { useEffect, useMemo, useState } from 'react';
import ProgressCard from '../components/ProgressCard';
import QuickAdd from '../components/QuickAdd';
import EntryList from '../components/EntryList';
import { deleteEntry, getEntries, Entry } from '../lib/api';
import { formatDayKey, incrementDayKey, nextLocalMidnightDelayMs, todayKeyLA } from '../lib/date';
import { getLastDayKey, setLastDayKey, loadTargets } from '../lib/storage';

export default function Dashboard() {
  const [dayKey, setDayKey] = useState(todayKeyLA());
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);

  // Reset UI at midnight
  useEffect(() => {
    const last = getLastDayKey();
    const today = todayKeyLA();
    if (last && last !== today) {
      setEntries([]);
    }
    setLastDayKey(today);
    const t = setTimeout(() => {
      setDayKey(todayKeyLA());
      setEntries([]);
      setLastDayKey(todayKeyLA());
      fetchEntries(todayKeyLA());
    }, nextLocalMidnightDelayMs());
    return () => clearTimeout(t);
  }, []);

  async function fetchEntries(k: string) {
    setLoading(true);
    try { setEntries(await getEntries(k)); } finally { setLoading(false); }
  }

  useEffect(() => { fetchEntries(dayKey); }, [dayKey]);

  const totals = useMemo(() => {
    return entries.reduce((acc,e)=>({
      calories: acc.calories + e.calories_kcal,
      protein: acc.protein + e.protein_g,
      carbs: acc.carbs + e.carbs_g,
      fat: acc.fat + e.fat_g,
    }), { calories:0, protein:0, carbs:0, fat:0 });
  }, [entries]);

  const targets = loadTargets();
  const isToday = dayKey === todayKeyLA();
  const dateLabel = (()=>{
    const d = new Date();
    return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'America/Los_Angeles' }).format(d);
  })();

  async function onDelete(id: string) {
    // optimistic
    const prev = entries;
    setEntries(e => e.filter(x => x.id !== id));
    try { await deleteEntry(id); } catch {
      setEntries(prev); // rollback
    }
  }

  return (
    <div className="pb-72">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xl font-semibold">{isToday ? `Today, ${dateLabel}` : dayKey}</div>
        <div className="flex gap-2">
          <button className="px-2 py-1 border rounded" onClick={()=>setDayKey(incrementDayKey(dayKey, -1))}>{'<'}</button>
          <button className="px-2 py-1 border rounded" onClick={()=>setDayKey(incrementDayKey(dayKey, +1))}>{'>'}</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <ProgressCard label="Calories" value={totals.calories} target={targets?.calories_kcal ?? null} unit="kcal" />
        <div className="grid grid-cols-1 gap-3">
          <ProgressCard label="Protein" value={totals.protein} target={targets?.protein_g ?? null} unit="g" />
          <ProgressCard label="Carbs" value={totals.carbs} target={targets?.carbs_g ?? null} unit="g" />
          <ProgressCard label="Fat" value={totals.fat} target={targets?.fat_g ?? null} unit="g" />
        </div>
      </div>

      <QuickAdd disabled={!isToday} onSaved={()=>fetchEntries(dayKey)} />


      <EntryList entries={entries} onDelete={onDelete} />
    </div>
  );
}
