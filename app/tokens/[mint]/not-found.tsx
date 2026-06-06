import Link from "next/link";

export default function TokenNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="editorial-pipe text-[12px] font-semibold uppercase tracking-[0.2em] text-accent">
        Solana Daily Heat
      </p>
      <h1 className="mt-3 font-heading text-[32px] font-bold text-text-primary">Token not found</h1>
      <p className="mt-3 max-w-md text-[14px] text-text-secondary">
        No stored scanner record for this mint, or the address is invalid. Demo tokens and
        placeholder mints do not have detail pages.
      </p>
      <Link
        href="/"
        className="mt-6 text-[14px] font-semibold text-heat hover:text-heat-hover"
      >
        ← Back to Daily Heat
      </Link>
    </div>
  );
}
