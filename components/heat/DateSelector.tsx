"use client";

type Props = {
  value: string;
  dates: string[];
  onChange: (date: string) => void;
};

function formatLabel(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function DateSelector({ value, dates, onChange }: Props) {
  return (
    <label className="inline-flex items-center gap-2 text-[13px] text-text-secondary">
      <span className="font-medium text-text-primary">Date</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="cursor-pointer rounded-[8px] border border-border bg-bg-card px-3 py-1.5 text-text-primary outline-none transition-colors hover:border-accent focus:border-accent"
      >
        {dates.map((d) => (
          <option key={d} value={d}>
            {formatLabel(d)}
          </option>
        ))}
      </select>
    </label>
  );
}
