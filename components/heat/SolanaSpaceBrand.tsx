/**
 * Temporary brand lockup — mock S mark and script-style "Space" until final assets/fonts are provided.
 */
export default function SolanaSpaceBrand() {
  return (
    <div className="flex items-center gap-3 sm:gap-4">
      <div
        className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] sm:h-14 sm:w-14 sm:rounded-[12px]"
        style={{
          background:
            "linear-gradient(135deg, #9945FF 0%, #14F195 55%, #00C2FF 100%)",
        }}
        aria-hidden
      >
        <span className="font-heading text-[22px] font-bold leading-none text-white/95 sm:text-[26px]">
          S
        </span>
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="font-heading text-[22px] font-bold uppercase leading-none tracking-[0.06em] text-text-primary sm:text-[28px]">
            Solana
          </span>
          {/* Placeholder until a licensed script/handwritten font asset is supplied */}
          <span className="font-body text-[26px] font-medium italic leading-none tracking-tight text-accent sm:text-[32px]">
            Space
          </span>
        </div>
        <p className="mt-1.5 text-[11px] font-medium lowercase tracking-wide text-text-muted sm:text-[12px]">
          Solana daily heat
        </p>
      </div>
    </div>
  );
}
