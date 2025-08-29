import { Entry } from '../lib/api';

type Props = {
  entries: Entry[];
  onDelete: (id: string) => void;
};

export default function EntryList({ entries, onDelete }: Props) {
  return (
    <div className="">
      <div className="font-medium mb-2">Today's Food</div>
      <div className="divide-y">
        {entries.map(e => (
          <div key={e.id} className="py-2 flex items-center justify-between">
            <div className="text-sm">
              <div className="font-medium">{e.item}</div>
              <div className="text-gray-600">{e.qty} {e.unit}</div>
            </div>
            <div className="text-right">
              <div className="text-sm">{Math.round(e.calories_kcal)} kcal</div>
              <div className="text-xs text-gray-600">P {Math.round(e.protein_g)} / C {Math.round(e.carbs_g)} / F {Math.round(e.fat_g)}</div>
              <button className="text-red-600 text-xs mt-1" onClick={() => onDelete(e.id)}>Delete</button>
            </div>
          </div>
        ))}
        {entries.length === 0 && (
          <div className="py-6 text-sm text-gray-600">No entries yet.</div>
        )}
      </div>
    </div>
  );
}
