"use client";

import { useState } from "react";

type Props = {
  mint: string;
};

export default function CopyMintButton({ mint }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(mint);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="mt-2 w-full rounded-[8px] border border-border bg-bg-secondary/60 px-3 py-2 text-left transition-colors hover:border-accent/40"
      title="Click to copy mint address"
    >
      <code className="block break-all text-[11px] leading-relaxed text-text-secondary">{mint}</code>
      <span
        role="status"
        aria-live="polite"
        className={`mt-1 inline-block text-[10px] font-semibold ${
          copied ? "text-accent" : "text-text-secondary"
        }`}
      >
        {copied ? "Copied" : "Copy mint"}
      </span>
    </button>
  );
}
