"use client";

import DateSelector from "./DateSelector";

import type { DashboardDataSource } from "@/lib/types/heat";

type Props = {
  date: string;
  dates: string[];
  onDateChange: (date: string) => void;
  dataSource?: DashboardDataSource;
  isLoading?: boolean;
};

function dataSourceLabel(dataSource?: DashboardDataSource): string {
  if (dataSource === "live") return "Live data";
  if (dataSource === "mixed") return "Mixed — some sections use demo data";
  return "Demo mock data";
}

export default function HeatHero({ date, dates, onDateChange, dataSource, isLoading }: Props) {
  return (
    <header className="border-b border-border bg-bg-secondary/40 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-accent">
          Solana Radar
        </p>
        <h1 className="mt-2 font-heading text-[40px] font-bold uppercase leading-none tracking-tight text-text-primary sm:text-[52px]">
          Solana Daily Heat
        </h1>
        <p className="mt-3 max-w-2xl text-balance text-[15px] leading-relaxed text-text-secondary">
          Find what is hot on Solana today before it becomes obvious.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <DateSelector value={date} dates={dates} onChange={onDateChange} />
          <span className="text-[11px] text-text-muted">
            {isLoading ? "Loading…" : dataSourceLabel(dataSource)} · Not investment advice
          </span>
        </div>
      </div>
    </header>
  );
}
