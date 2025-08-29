import { Entry } from '../lib/api';

type Totals = { calories: number; protein: number; carbs: number; fat: number };
type Targets = { calories_kcal?: number | null; protein_g?: number | null; carbs_g?: number | null; fat_g?: number | null } | null;

type Props = {
  entries: Entry[];
  totals: Totals;
  targets: Targets;
};

export default function TodayFeedback({ entries, totals, targets }: Props) {
  const last = entries.length
    ? entries.reduce((a, b) => (new Date(a.consumedAt) > new Date(b.consumedAt) ? a : b))
    : null;

  const calTarget = targets?.calories_kcal ?? null;
  const proteinTarget = targets?.protein_g ?? null;

  const calProgress = calTarget ? totals.calories / calTarget : null;
  const proteinProgress = proteinTarget ? totals.protein / proteinTarget : null;

  const feedback = (() => {
    if (!calTarget && !proteinTarget) {
      if (totals.calories === 0) return 'No entries yet. Log your first meal and set targets in Settings to get guidance.';
      return 'Nice start. Keep portions reasonable and favor protein.';
    }
    if (calTarget && totals.calories >= calTarget) {
      return "You've hit your calories for today. Keep anything else light and protein-forward.";
    }
    if (proteinTarget && proteinProgress! < 0.5) {
      return 'Protein is lagging. Make your next meal lean and protein-heavy.';
    }
    if (calProgress! >= 0.75) {
      return 'You are close to your calorie target. Stay intentional with snacks.';
    }
    if (calProgress! < 0.35) {
      return 'Pace is light so far. Eat a solid, balanced meal—prioritize protein.';
    }
    return 'On track. Keep meals simple, lean, and measured.';
  })();

  const timeStr = last
    ? new Intl.DateTimeFormat('en-US', { timeStyle: 'short', timeZone: 'America/Los_Angeles' }).format(new Date(last.consumedAt))
    : null;

  return (
    <div className="mt-3 text-sm bg-white border rounded-md p-3">
      {last ? (
        <div className="mb-1">
          <span className="font-medium">Last logged:</span>{' '}
          {last.item} — {last.qty} {last.unit} ({Math.round(last.calories_kcal)} kcal)
          {timeStr ? <> at {timeStr}</> : null}
        </div>
      ) : (
        <div className="mb-1 text-gray-700">No entries yet today.</div>
      )}
      {/* Progress line intentionally omitted; shown elsewhere on dashboard */}
      <div className="text-gray-900 mt-1">{feedback}</div>
    </div>
  );
}
