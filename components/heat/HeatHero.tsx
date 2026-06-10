import Link from "next/link";
import { formatSnapshotArchiveHeading } from "@/lib/heat/snapshot-date";
import IslandDaoSponsorsRail from "./IslandDaoSponsorsRail";
type Props = {
  /** Set when viewing ?date= archive (not latest). */
  archiveDate?: string;
};

export default function HeatHero({ archiveDate }: Props) {
  return (
    <header className="relative bg-bg-secondary/20 px-4 pt-8 pb-3 backdrop-blur-[2px] sm:px-6 sm:pt-10 sm:pb-4 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <p className="editorial-pipe text-[12px] font-semibold uppercase tracking-[0.2em] text-accent">
          Solana Radar
        </p>
        <h1 className="mt-2 font-heading text-[30px] font-bold uppercase leading-[1.05] tracking-tight text-text-primary sm:text-[40px] lg:text-[52px]">
          Solana Daily Heat
        </h1>
        <IslandDaoSponsorsRail />
        {archiveDate ? (
          <p className="mt-4 text-[11px] text-text-secondary">
            Archive snapshot · {formatSnapshotArchiveHeading(archiveDate)}
            {" · "}
            <Link href="/" className="font-medium text-heat hover:text-heat-hover">
              Back to latest
            </Link>
          </p>
        ) : null}
      </div>
    </header>
  );
}
