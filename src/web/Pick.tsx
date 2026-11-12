interface PickProps {
  label: string;
  value: string;
  ids: string[];
  who: Map<string, { name: string }>;
  onChange: (id: string) => void;
}

export const Pick = ({ label, value, ids, who, onChange }: PickProps) => (
  <label className="flex min-w-0 flex-col gap-1 text-xs text-zinc-500">
    {label}
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="glass-control w-full cursor-pointer truncate px-3 py-1.5 text-sm"
    >
      {ids.map((id) => (
        <option key={id} value={id}>
          {who.get(id)?.name ?? id}
        </option>
      ))}
    </select>
  </label>
);
