import Image from "next/image";
import Link from "next/link";
import { formatSnapshotArchiveHeading } from "@/lib/heat/snapshot-date";
import IslandDaoSponsorsRail from "./IslandDaoSponsorsRail";
import SolanaSpaceBrand from "./SolanaSpaceBrand";

const WORDMARK_WIDTH = 262;
const WORDMARK_HEIGHT = 40;

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

        <h1 className="mt-6 max-w-3xl sm:mt-8">
          <span className="sr-only">What&apos;s hot on Solana</span>
          <span
            className="inline-flex flex-wrap items-center gap-x-1.5 sm:gap-x-2"
            aria-hidden
          >
            <span className="text-[11px] font-semibold uppercase leading-none tracking-[0.12em] text-text-primary sm:text-[12px]">
              What&apos;s hot on
            </span>
            <Image
              src="/brand/solana-wordmark.svg"
              alt=""
              width={WORDMARK_WIDTH}
              height={WORDMARK_HEIGHT}
              className="h-[11px] w-auto shrink-0 translate-y-[1.5px] sm:h-[12px] sm:translate-y-[2px]"
              priority
            />
          </span>
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
