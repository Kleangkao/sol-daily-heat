"use client";

import Image from "next/image";
import { shortenWalletAddress } from "@/lib/wallet/address";
import { WALLET_ICON_SRC } from "@/lib/wallet/wallet-icons";
import { useSolanaWallet } from "./SolanaWalletProvider";

export default function WalletConnectButton() {
  const { address, walletId, walletLabel, openModal, disconnect, connecting } = useSolanaWallet();

  if (address) {
    const iconSrc = walletId ? WALLET_ICON_SRC[walletId] : null;

    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={openModal}
          className="flex items-center gap-2 rounded-[8px] border border-border bg-bg-card/70 px-3 py-2 text-left transition-colors hover:border-accent/50"
        >
          {iconSrc ? (
            <Image
              src={iconSrc}
              alt=""
              width={24}
              height={24}
              className="h-6 w-6 shrink-0 rounded-[6px] object-cover object-center"
            />
          ) : null}
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-accent">
              {walletLabel ?? "Wallet"}
            </p>
            <p className="font-mono text-[13px] font-semibold text-text-primary">
              {shortenWalletAddress(address)}
            </p>
          </div>
        </button>
        <button
          type="button"
          onClick={() => void disconnect()}
          disabled={connecting}
          className="min-h-[44px] rounded-[8px] border border-border bg-bg-secondary/50 px-3 py-2 text-[12px] font-semibold text-text-primary transition-colors hover:border-accent/50 hover:text-accent disabled:opacity-60"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={openModal}
      disabled={connecting}
      className="min-h-[44px] shrink-0 rounded-[8px] border border-border bg-bg-card/70 px-4 py-2 text-[12px] font-semibold uppercase tracking-wide text-text-primary transition-colors hover:border-accent/50 hover:text-accent disabled:opacity-60 sm:text-[13px]"
    >
      {connecting ? "Connecting…" : "Connect Wallet"}
    </button>
  );
}
