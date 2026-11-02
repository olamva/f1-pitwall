export const currentYear = new Date().getUTCFullYear();

export const YEARS = Array.from({ length: currentYear - 1949 }, (_, index) =>
  String(currentYear - index),
);

interface YearSelectProps {
  value: string;
  onChange: (year: string) => void;
}

export const YearSelect = ({ value, onChange }: YearSelectProps) => (
  <select
    aria-label="Season"
    value={value}
    onChange={(event) => onChange(event.target.value)}
    className="bg-surface ml-auto rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-50"
  >
    {YEARS.map((year) => (
      <option key={year}>{year}</option>
    ))}
  </select>
);
