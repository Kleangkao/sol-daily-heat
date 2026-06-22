"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  browserWalletLabel,
  connectBrowserWallet,
  disconnectBrowserWallet,
  tryAutoConnectBrowserWallet,
} from "@/lib/wallet/browser-wallets";
import { friendlyWalletError } from "@/lib/wallet/errors";
import type { BrowserWalletId } from "@/lib/wallet/types";
import {
  clearSavedBrowserWalletId,
  getSavedBrowserWalletId,
  saveBrowserWalletId,
} from "@/lib/wallet/wallet-persistence";
import WalletConnectModal from "./WalletConnectModal";

type WalletContextValue = {
  address: string | null;
  walletId: BrowserWalletId | null;
  walletLabel: string | null;
  connecting: boolean;
  reconnecting: boolean;
  error: string | null;
  modalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  connect: (id: BrowserWalletId) => Promise<void>;
  disconnect: () => Promise<void>;
  clearError: () => void;
};

const WalletContext = createContext<WalletContextValue | null>(null);

export function SolanaWalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [walletId, setWalletId] = useState<BrowserWalletId | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function restoreWallet() {
      const savedId = getSavedBrowserWalletId();
      if (!savedId) {
        setReconnecting(false);
        return;
      }

      setReconnecting(true);
      try {
        const restored = await tryAutoConnectBrowserWallet(savedId);
        if (cancelled) return;

        if (!restored) {
          clearSavedBrowserWalletId();
          return;
        }

        setWalletId(savedId);
        setAddress(restored);
      } finally {
        if (!cancelled) setReconnecting(false);
      }
    }

    void restoreWallet();
    return () => {
      cancelled = true;
    };
  }, []);

  const openModal = useCallback(() => {
    setError(null);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const connect = useCallback(async (id: BrowserWalletId) => {
    setConnecting(true);
    setError(null);
    try {
      const pubkey = await connectBrowserWallet(id);
      setWalletId(id);
      setAddress(pubkey);
      saveBrowserWalletId(id);
      setModalOpen(false);
    } catch (e) {
      setError(friendlyWalletError(e));
      throw e;
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    setError(null);
    try {
      if (walletId) {
        await disconnectBrowserWallet(walletId);
      }
    } finally {
      clearSavedBrowserWalletId();
      setWalletId(null);
      setAddress(null);
      setModalOpen(false);
    }
  }, [walletId]);

  const walletLabel = walletId ? browserWalletLabel(walletId) : null;

  const value = useMemo(
    () => ({
      address,
      walletId,
      walletLabel,
      connecting,
      reconnecting,
      error,
      modalOpen,
      openModal,
      closeModal,
      connect,
      disconnect,
      clearError,
    }),
    [
      address,
      walletId,
      walletLabel,
      connecting,
      reconnecting,
      error,
      modalOpen,
      openModal,
      closeModal,
      connect,
      disconnect,
      clearError,
    ]
  );

  return (
    <WalletContext.Provider value={value}>
      {children}
      <WalletConnectModal />
    </WalletContext.Provider>
  );
}

export function useSolanaWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error("useSolanaWallet must be used within SolanaWalletProvider");
  }
  return ctx;
}
