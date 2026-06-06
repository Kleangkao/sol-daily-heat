"use client";

import Link from "next/link";
import { formatSnapshotArchiveHeading } from "@/lib/heat/snapshot-date";
import type { DashboardDataSource } from "@/lib/types/heat";

type Props = {
  dataSource?: DashboardDataSource;
  isLoading?: boolean;
  /** Set when viewing ?date= archive (not latest). */
  archiveDate?: string;
};

function statusLine(dataSource?: DashboardDataSource, isLoading?: boolean): string {
  if (isLoading) return "Loading live scanner data…";
  if (dataSource === "live") {
    return "Live data · Rankings refresh about every 3 hours · Not investment advice";
  }
  if (dataSource === "mixed") {
    return "Mixed live and demo sections · Not investment advice";
  }
  if (dataSource === "mock") {
    return "Demo preview · Not investment advice";
  }
  return "Not investment advice";
}

export default function HeatHero({ dataSource, isLoading, archiveDate }: Props) {
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
          Find what is hot on Solana before it becomes obvious. Card timestamps show when
          each story broke at the source — not when our scanner last refreshed.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <p className="text-[11px] text-text-muted">{statusLine(dataSource, isLoading)}</p>
          {archiveDate ? (
            <p className="text-[11px] text-text-secondary">
              Archive snapshot · {formatSnapshotArchiveHeading(archiveDate)}
              {" · "}
              <Link href="/" className="font-medium text-accent hover:text-accent-hover">
                Back to latest
              </Link>
            </p>
          ) : null}
        </div>
      </div>
    </header>
  );
}
