"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { listBrowserWalletOptions } from "@/lib/wallet/browser-wallets";
import type { BrowserWalletId } from "@/lib/wallet/types";
import { WALLET_NETWORK_LABEL } from "@/lib/wallet/types";
import { useSolanaWallet } from "./SolanaWalletProvider";

function WalletRow({
  wallet,
  connecting,
  onConnect,
}: {
  wallet: ReturnType<typeof listBrowserWalletOptions>[number];
  connecting: boolean;
  onConnect: (id: BrowserWalletId) => void;
}) {
  const statusLabel = wallet.installed ? "Detected" : "Install";
  const actionLabel = wallet.installed
    ? connecting
      ? "Connecting…"
      : "Connect"
    : "Install";

  const rowClass =
    "flex w-full items-center justify-between gap-3 rounded-[8px] border border-border bg-bg-secondary/50 px-4 py-3 text-left transition-colors hover:border-accent/50 hover:bg-bg-secondary";

  const meta = (
    <>
      <div className="min-w-0">
        <p className="text-[14px] font-bold text-text-primary">{wallet.name}</p>
        <p className="text-[11px] text-text-muted">{statusLabel}</p>
      </div>
      <span className="shrink-0 text-[12px] font-semibold text-accent">{actionLabel}</span>
    </>
  );

  if (wallet.installed) {
    return (
      <button
        type="button"
        onClick={() => onConnect(wallet.id)}
        disabled={connecting}
        className={rowClass}
      >
        {meta}
      </button>
    );
  }

  return (
    <a
      href={wallet.installUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={rowClass}
    >
      {meta}
    </a>
  );
}

export default function WalletConnectModal() {
  const { modalOpen, closeModal, connect, connecting, error } = useSolanaWallet();
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const [options, setOptions] = useState(() => listBrowserWalletOptions());

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (modalOpen) setOptions(listBrowserWalletOptions());
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", onKey);

    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, [modalOpen, closeModal]);

  const handleConnect = useCallback(
    async (id: BrowserWalletId) => {
      try {
        await connect(id);
      } catch {
        /* error surfaced via context */
      }
    },
    [connect]
  );

  if (!mounted || !modalOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4"
      role="presentation"
      onClick={closeModal}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[calc(100vh-48px)] w-full max-w-[min(400px,calc(100vw-24px))] flex-col overflow-hidden rounded-[14px] border border-border bg-bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
          <div>
            <h2
              id={titleId}
              className="font-heading text-[17px] font-bold uppercase text-text-primary sm:text-[18px]"
            >
              Connect wallet
            </h2>
            <p className="mt-0.5 text-[11px] text-text-muted">{WALLET_NETWORK_LABEL} · connect only</p>
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-[18px] leading-none text-text-muted transition-colors hover:border-accent/50 hover:text-text-primary"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          <div className="space-y-2">
            {options.map((wallet) => (
              <WalletRow
                key={wallet.id}
                wallet={wallet}
                connecting={connecting}
                onConnect={handleConnect}
              />
            ))}
          </div>
          {error ? (
            <p className="mt-3 rounded-[8px] border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-200">
              {error}
            </p>
          ) : null}
        </div>

        <p className="shrink-0 border-t border-border px-4 py-2.5 text-[10px] text-text-muted sm:px-5 sm:text-[11px]">
          No signing or transactions in this pass · not investment advice
        </p>
      </div>
    </div>,
    document.body
  );
}
