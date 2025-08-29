type Props = {
  label: string;
  value: number;
  target?: number | null;
  unit?: string;
};

export default function ProgressCard({ label, value, target, unit }: Props) {
  const pct = target && target > 0 ? Math.min(100, Math.round((value / target) * 100)) : null;
  return (
    <div className="p-4 border rounded-md bg-white">
      <div className="text-sm text-gray-600">{label}</div>
      <div className="mt-1 text-2xl font-semibold">
        {Math.round(value)}{unit ? ` ${unit}` : ''}
        {target ? (
          <span className="ml-2 text-gray-500 text-base">/ {Math.round(target)}{unit ? ` ${unit}` : ''}</span>
        ) : null}
      </div>
      {pct !== null && (
        <div className="mt-2 h-2 bg-gray-200 rounded">
          <div className="h-2 bg-blue-600 rounded" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

