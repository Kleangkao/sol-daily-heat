import type { ReactNode } from "react";

/** Mobile-only fixed brand row + explore tabs; desktop renders nothing. */
export default function MobileHeatStickyShell({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="mobile-heat-fixed lg:hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">{children}</div>
      </div>
      <div className="mobile-heat-fixed-spacer lg:hidden" aria-hidden />
    </>
  );
}
