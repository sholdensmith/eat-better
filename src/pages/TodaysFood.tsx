import { useEffect, useState } from 'react';
import EntryList from '../components/EntryList';
import { deleteEntry, getEntries, Entry } from '../lib/api';
import { todayKeyLA } from '../lib/date';

export default function TodaysFood() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);

  async function fetchEntries() {
    setLoading(true);
    try { setEntries(await getEntries(todayKeyLA())); } finally { setLoading(false); }
  }

  useEffect(() => { fetchEntries(); }, []);

  async function onDelete(id: string) {
    const prev = entries;
    setEntries(e => e.filter(x => x.id !== id));
    try { await deleteEntry(id); } catch {
      setEntries(prev);
    }
  }

  return (
    <div className="pb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xl font-semibold">Today's Food</div>
      </div>
      <EntryList entries={entries} onDelete={onDelete} />
    </div>
  );
}

