type Props = {
  label: string;
  value: string | null;
  nullMessage: string;
};

export function MetricCard({ label, value, nullMessage }: Props) {
  return (
    <div className="rounded-lg border border-brand-gray-100 bg-brand-gray-50 p-4">
      <div className="mb-1 text-xs uppercase tracking-wide text-brand-gray-400">
        {label}
      </div>
      {value === null ? (
        <div className="text-sm italic text-brand-gray-400">{nullMessage}</div>
      ) : (
        <div className="text-2xl font-medium text-brand-black">{value}</div>
      )}
    </div>
  );
}
