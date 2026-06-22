import Image from "next/image";
import Link from "next/link";
import { formatSnapshotArchiveHeading } from "@/lib/heat/snapshot-date";
import { USE_SOLANA_GRADIENT_THEME } from "@/lib/theme/background-theme";
import IslandDaoSponsorsRail from "./IslandDaoSponsorsRail";
import SolanaSpaceBrand from "./SolanaSpaceBrand";
import SolanaWordmarkGradient from "./SolanaWordmarkGradient";
import { HeroLightningEmoji } from "./EmojiAccents";
import WalletConnectButton from "@/components/wallet/WalletConnectButton";

const WORDMARK_WIDTH = 262;
const WORDMARK_HEIGHT = 40;

type Props = {
  /** Set when viewing ?date= archive (not latest). */
  archiveDate?: string;
};

export function HeroHeadRow() {
  return (
    <div className="heat-hero-head-row flex items-start justify-between gap-3 sm:gap-4">
      <SolanaSpaceBrand />
      <div className="shrink-0">
        <WalletConnectButton />
      </div>
    </div>
  );
}

export default function HeatHero({ archiveDate }: Props) {
  return (
    <header className="hero-stage relative px-4 pb-4 sm:px-6 sm:pb-5 lg:px-8 lg:pt-10">
      <div className="hero-stage__overlay pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-7xl">
        <div className="pb-2.5 lg:pb-0">
          <HeroHeadRow />
        </div>

        <h1 className="mt-4 max-w-3xl sm:mt-6 lg:mt-8">
          <span className="sr-only">What&apos;s Hot on Solana ⚡</span>
          <span className="inline-flex flex-wrap items-end gap-x-2" aria-hidden>
            <span className="translate-y-[2px] text-[16px] font-semibold uppercase leading-none tracking-[0.12em] text-text-primary sm:translate-y-[2px] sm:text-[17px]">
              What&apos;s Hot on
            </span>
            {USE_SOLANA_GRADIENT_THEME ? (
              <>
                <Image
                  src="/brand/solana-wordmark.svg"
                  alt=""
                  width={WORDMARK_WIDTH}
                  height={WORDMARK_HEIGHT}
                  className="h-[13px] w-auto shrink-0 lg:hidden sm:h-[14px]"
                  priority
                />
                <SolanaWordmarkGradient className="hidden h-[13px] w-auto shrink-0 lg:block sm:h-[14px]" />
              </>
            ) : (
              <Image
                src="/brand/solana-wordmark.svg"
                alt=""
                width={WORDMARK_WIDTH}
                height={WORDMARK_HEIGHT}
                className="h-[13px] w-auto shrink-0 sm:h-[14px]"
                priority
              />
            )}
            <span className="inline-flex items-center" aria-hidden>
              <HeroLightningEmoji />
            </span>
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
