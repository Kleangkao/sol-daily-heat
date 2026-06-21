"use client";

import { useCallback, useState, type ReactNode } from "react";
import {
  sendMemoTransaction,
  signMemoTransaction,
  signOwnershipMessage,
  walletSupportsMemoSend,
  walletSupportsMemoSign,
  type SendMemoResult,
  type SignMemoResult,
  type SignMessageResult,
} from "@/lib/wallet/wallet-actions";
import type { BrowserWalletId } from "@/lib/wallet/types";
import { shortenWalletAddress } from "@/lib/wallet/address";

type ActionId = "sign-message" | "sign-memo" | "send-memo";

type Props = {
  walletId: BrowserWalletId;
  address: string;
};

function ResultBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[8px] border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-200">{title}</p>
      <div className="mt-1 space-y-1 text-[11px] text-text-primary">{children}</div>
    </div>
  );
}

export default function WalletActionsPanel({ walletId, address }: Props) {
  const [loading, setLoading] = useState<ActionId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signMessageResult, setSignMessageResult] = useState<SignMessageResult | null>(null);
  const [signMemoResult, setSignMemoResult] = useState<SignMemoResult | null>(null);
  const [sendMemoResult, setSendMemoResult] = useState<SendMemoResult | null>(null);

  const canSignMemo = walletSupportsMemoSign(walletId);
  const canSendMemo = walletSupportsMemoSend(walletId);

  const runAction = useCallback(
    async (id: ActionId, fn: () => Promise<void>) => {
      setLoading(id);
      setError(null);
      try {
        await fn();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Wallet action failed.");
      } finally {
        setLoading(null);
      }
    },
    []
  );

  const actionButtonClass =
    "w-full rounded-[8px] border border-border bg-bg-secondary/50 px-3 py-2.5 text-left transition-colors hover:border-accent/50 hover:bg-bg-secondary disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
          Wallet Actions
        </p>
        <p className="mt-0.5 font-mono text-[11px] text-text-secondary">
          {shortenWalletAddress(address, 6)}
        </p>
      </div>

      <div className="space-y-2">
        <button
          type="button"
          disabled={loading != null}
          onClick={() =>
            void runAction("sign-message", async () => {
              const result = await signOwnershipMessage(walletId, address);
              setSignMessageResult(result);
            })
          }
          className={actionButtonClass}
        >
          <span className="text-[13px] font-semibold text-text-primary">
            {loading === "sign-message" ? "Signing…" : "Sign Message"}
          </span>
          <span className="mt-0.5 block text-[11px] text-text-muted">
            Sign a plain text message to verify wallet ownership. No transaction is sent and no
            network fee is charged.
          </span>
        </button>

        <button
          type="button"
          disabled={loading != null || !canSignMemo}
          onClick={() =>
            void runAction("sign-memo", async () => {
              const result = await signMemoTransaction(walletId, address);
              setSignMemoResult(result);
            })
          }
          className={actionButtonClass}
        >
          <span className="text-[13px] font-semibold text-text-primary">
            {loading === "sign-memo" ? "Signing…" : "Sign Memo Transaction"}
          </span>
          <span className="mt-0.5 block text-[11px] text-text-muted">
            Sign a memo-only transaction locally. It is not sent to the network.
          </span>
        </button>

        <button
          type="button"
          disabled={loading != null || !canSendMemo}
          onClick={() =>
            void runAction("send-memo", async () => {
              const result = await sendMemoTransaction(walletId, address);
              setSendMemoResult(result);
            })
          }
          className={actionButtonClass}
        >
          <span className="text-[13px] font-semibold text-text-primary">
            {loading === "send-memo" ? "Sending…" : "Send Memo Transaction"}
          </span>
          <span className="mt-0.5 block text-[11px] text-text-muted">
            Sends a memo-only transaction on Solana mainnet. It does not transfer SOL or tokens,
            but a small network fee may apply.
          </span>
        </button>
      </div>

      {!canSignMemo ? (
        <p className="text-[10px] text-text-muted">
          Sign Memo Transaction requires a wallet that supports sign-only transactions.
        </p>
      ) : null}

      {error ? (
        <p className="rounded-[8px] border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-200">
          {error}
        </p>
      ) : null}

      {signMessageResult ? (
        <ResultBlock title="Message signed">
          <p className="whitespace-pre-wrap break-words text-text-secondary">{signMessageResult.message}</p>
          <p className="break-all font-mono text-[10px]">{signMessageResult.signature}</p>
        </ResultBlock>
      ) : null}

      {signMemoResult ? (
        <ResultBlock title="Memo transaction signed (not sent)">
          <p className="text-text-secondary">{signMemoResult.memo}</p>
          <p className="break-all font-mono text-[10px]">{signMemoResult.signedTransactionBase64}</p>
        </ResultBlock>
      ) : null}

      {sendMemoResult ? (
        <ResultBlock title="Memo transaction sent">
          <p className="text-text-secondary">{sendMemoResult.memo}</p>
          <p className="break-all font-mono text-[10px]">{sendMemoResult.signature}</p>
          <a
            href={sendMemoResult.explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block font-semibold text-accent hover:text-heat-hover"
          >
            View on Solscan
          </a>
          <p className="text-[10px] text-text-muted">
            This sends a memo-only transaction on Solana mainnet. It does not transfer SOL or
            tokens, but it may cost a small network fee.
          </p>
        </ResultBlock>
      ) : null}
    </div>
  );
}
