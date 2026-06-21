"use client";

import type { ReactNode } from "react";
import { SolanaWalletProvider } from "./SolanaWalletProvider";

export default function WalletProviders({ children }: { children: ReactNode }) {
  return <SolanaWalletProvider>{children}</SolanaWalletProvider>;
}
