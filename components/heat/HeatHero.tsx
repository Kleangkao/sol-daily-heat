import Link from "next/link";
import { formatSnapshotArchiveHeading } from "@/lib/heat/snapshot-date";
import IslandDaoSponsorsRail from "./IslandDaoSponsorsRail";
import SolanaSpaceBrand from "./SolanaSpaceBrand";

type Props = {
  /** Set when viewing ?date= archive (not latest). */
  archiveDate?: string;
};

export default function HeatHero({ archiveDate }: Props) {
  return (
    <header className="hero-stage relative px-4 pt-8 pb-4 sm:px-6 sm:pt-10 sm:pb-5 lg:px-8">
      <div className="hero-stage__overlay pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-6xl">
        <SolanaSpaceBrand />

        <h1 className="mt-6 max-w-3xl font-heading text-[32px] font-bold uppercase leading-[1.05] tracking-tight text-text-primary sm:mt-8 sm:text-[44px] lg:text-[56px]">
          What&apos;s hot on Solana
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
