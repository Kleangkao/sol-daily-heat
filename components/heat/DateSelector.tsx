"use client";

import { formatSnapshotDateOption } from "@/lib/heat/snapshot-date";

type Props = {
  value: string;
  dates: string[];
  onChange: (date: string) => void;
};

export default function DateSelector({ value, dates, onChange }: Props) {
  return (
    <label className="inline-flex flex-col gap-1 text-[13px] text-text-secondary sm:flex-row sm:items-center sm:gap-2">
      <span className="font-medium text-text-primary">UTC snapshot date</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="UTC snapshot date"
        className="cursor-pointer rounded-[8px] border border-border bg-bg-card px-3 py-1.5 text-text-primary outline-none transition-colors hover:border-accent focus:border-accent"
      >
        {dates.map((d) => (
          <option key={d} value={d}>
            {formatSnapshotDateOption(d)}
          </option>
        ))}
      </select>
    </label>
  );
}
