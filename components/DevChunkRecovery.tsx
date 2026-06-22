"use client";

import { useEffect } from "react";

const RELOAD_KEY = "sol-daily-heat-chunk-reload";

function shouldReloadForAsset(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLLinkElement || target instanceof HTMLScriptElement)) {
    return false;
  }

  const href = target instanceof HTMLLinkElement ? target.href : target.src;
  return href.includes("/_next/");
}

/**
 * Dev-only: one automatic reload when a Next chunk/CSS asset 404s (stale .next).
 */
export default function DevChunkRecovery() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    const reloadOnce = () => {
      if (sessionStorage.getItem(RELOAD_KEY)) return;
      sessionStorage.setItem(RELOAD_KEY, "1");
      window.location.reload();
    };

    const onError = (event: Event) => {
      if (shouldReloadForAsset(event.target)) reloadOnce();
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
            ? reason
            : "";
      if (/chunk|module .* not found|Loading CSS chunk/i.test(message)) {
        reloadOnce();
      }
    };

    window.addEventListener("error", onError, true);
    window.addEventListener("unhandledrejection", onRejection);

    const clearFlag = window.setTimeout(() => {
      sessionStorage.removeItem(RELOAD_KEY);
    }, 15_000);

    return () => {
      window.removeEventListener("error", onError, true);
      window.removeEventListener("unhandledrejection", onRejection);
      window.clearTimeout(clearFlag);
    };
  }, []);

  return null;
}
