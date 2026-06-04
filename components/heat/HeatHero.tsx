"use client";

import DateSelector from "./DateSelector";
import { formatSnapshotHeroLine } from "@/lib/heat/snapshot-date";
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
  if (dataSource === "mock") return "Demo mock data";
  return "";
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
          Find what is hot on Solana for the selected UTC snapshot before it becomes obvious.
        </p>
        <div className="mt-6 flex flex-wrap items-end gap-4">
          <DateSelector value={date} dates={dates} onChange={onDateChange} />
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-text-muted">
              {isLoading
                ? "Loading live scanner data…"
                : dataSourceLabel(dataSource)
                  ? `${dataSourceLabel(dataSource)} · Not investment advice`
                  : "Not investment advice"}
            </span>
            <span className="text-[11px] font-medium text-text-secondary">
              Snapshot date uses UTC. {formatSnapshotHeroLine(date)}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
