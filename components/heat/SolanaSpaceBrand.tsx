import Image from "next/image";

const LOGO_WIDTH = 101;
const LOGO_HEIGHT = 88;
const WORDMARK_WIDTH = 262;
const WORDMARK_HEIGHT = 40;

export default function SolanaSpaceBrand() {
  return (
    <div className="flex items-center gap-3 sm:gap-4">
      <Image
        src="/brand/solana-logo-mark.svg"
        alt=""
        width={LOGO_WIDTH}
        height={LOGO_HEIGHT}
        className="h-12 w-auto shrink-0 sm:h-14"
        priority
        aria-hidden
      />
      <div className="min-w-0">
        <p className="sr-only">Solana Space</p>
        <div className="flex flex-col items-start" aria-hidden>
          <Image
            src="/brand/solana-wordmark.svg"
            alt=""
            width={WORDMARK_WIDTH}
            height={WORDMARK_HEIGHT}
            className="h-5 w-auto sm:h-6"
            priority
          />
          <span className="font-space -mt-0.5 block text-[32px] leading-[0.95] text-solana-mint sm:-mt-1 sm:text-[38px]">
            Space
          </span>
        </div>
        <p className="mt-1.5 text-[11px] font-medium lowercase tracking-wide text-text-muted sm:mt-2 sm:text-[12px]">
          Solana daily heat
        </p>
      </div>
    </div>
  );
}
