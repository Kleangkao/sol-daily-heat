"use client";

import Link from "next/link";
import { formatSnapshotArchiveLabel } from "@/lib/heat/snapshot-date";

type Props = {
  dates: string[];
  activeDate?: string;
};

export default function PastSnapshotsNav({ dates, activeDate }: Props) {
  if (dates.length === 0) return null;

  return (
    <nav
      aria-label="Past snapshot dates"
      className="mt-4 flex flex-wrap items-center justify-center gap-x-1 gap-y-1 text-[11px] text-text-muted"
    >
      <span className="mr-1 text-text-secondary">Past snapshots:</span>
      <Link
        href="/"
        className={
          !activeDate
            ? "font-medium text-heat"
            : "text-text-muted hover:text-accent"
        }
      >
        Latest
      </Link>
      {dates.map((iso) => (
        <span key={iso} className="inline-flex items-center gap-1">
          <span aria-hidden>·</span>
          <Link
            href={`/?date=${iso}`}
            className={
              activeDate === iso
                ? "font-medium text-heat"
                : "text-text-muted hover:text-accent"
            }
          >
            {formatSnapshotArchiveLabel(iso)}
          </Link>
        </span>
      ))}
    </nav>
  );
}
