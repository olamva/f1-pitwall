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
    className="glass-control ml-auto cursor-pointer px-3.5 py-2 text-sm"
  >
    {YEARS.map((year) => (
      <option key={year}>{year}</option>
    ))}
  </select>
);
