import Image from "next/image";

const LOGO_WIDTH = 101;
const LOGO_HEIGHT = 88;
const WORDMARK_WIDTH = 262;
const WORDMARK_HEIGHT = 40;

export default function SolanaSpaceBrand() {
  return (
    <div>
      <div className="flex items-start gap-3 sm:gap-4">
        <Image
          src="/brand/solana-logo-mark.svg"
          alt=""
          width={LOGO_WIDTH}
          height={LOGO_HEIGHT}
          className="h-12 w-auto shrink-0 sm:h-14"
          priority
          aria-hidden
        />
        <div className="min-w-0 pt-0.5">
          <p className="sr-only">Solana Space</p>
          <div className="flex flex-col items-start" aria-hidden>
            <Image
              src="/brand/solana-wordmark.svg"
              alt=""
              width={WORDMARK_WIDTH}
              height={WORDMARK_HEIGHT}
              className="h-[14px] w-auto sm:h-4"
              priority
            />
            <span className="font-space mt-3.5 block text-[26px] leading-none text-solana-mint sm:mt-4 sm:text-[30px]">
              Space
            </span>
          </div>
        </div>
      </div>
      <p className="mt-2 text-[11px] font-medium tracking-wide text-text-muted sm:mt-2.5 sm:text-[12px]">
        Solana daily heat
      </p>
    </div>
  );
}
