import Image from "next/image";
import { ISLANDDAO_FEATURED, type IslandDaoFeatured } from "@/lib/islanddao/sponsors";

function FeaturedCard({ partner }: { partner: IslandDaoFeatured }) {
  return (
    <a
      href={partner.websiteUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${partner.name}, featured IslandDAO partner (opens in new tab)`}
      className="group flex h-[72px] w-[148px] shrink-0 items-center justify-center rounded-[12px] border border-border bg-bg-card/50 px-4 py-3 transition-colors hover:border-accent/45 hover:bg-bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
    >
      <Image
        src={partner.logoPath}
        alt=""
        width={112}
        height={40}
        className="max-h-10 w-auto max-w-full object-contain opacity-90 transition-opacity group-hover:opacity-100"
        aria-hidden
      />
    </a>
  );
}

function FeaturedRow({
  partners,
  ariaHidden = false,
}: {
  partners: IslandDaoFeatured[];
  ariaHidden?: boolean;
}) {
  return (
    <div
      className="featured-marquee-row flex shrink-0 flex-nowrap items-center gap-3"
      aria-hidden={ariaHidden || undefined}
    >
      {partners.map((partner) => (
        <FeaturedCard key={partner.id} partner={partner} />
      ))}
    </div>
  );
}

export default function IslandDaoSponsorsRail() {
  return (
    <section aria-labelledby="whats-hot-heading" className="mt-3">
      <p
        id="whats-hot-heading"
        className="editorial-pipe text-[11px] font-semibold tracking-[0.14em] text-accent sm:text-[12px]"
      >
        What&apos;s Hot on Solana
      </p>

      <div className="featured-marquee-clip relative mt-2.5 min-h-[76px] w-full max-w-full overflow-hidden py-1">
        <div
          className="featured-marquee-fade pointer-events-none absolute inset-y-0 left-0 z-10 w-8 sm:w-10"
          aria-hidden
        />
        <div
          className="featured-marquee-fade pointer-events-none absolute inset-y-0 right-0 z-10 w-8 rotate-180 sm:w-10"
          aria-hidden
        />

        <div className="featured-marquee-track flex w-max flex-nowrap items-center gap-3">
          <FeaturedRow partners={ISLANDDAO_FEATURED} />
          <FeaturedRow partners={ISLANDDAO_FEATURED} ariaHidden />
        </div>
      </div>
    </section>
  );
}
