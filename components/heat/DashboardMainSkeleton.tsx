import { PRODUCT_NAME } from "@/lib/product/copy";

export default function DashboardMainSkeleton() {
  return (
    <>
      <p className="sr-only">Loading {PRODUCT_NAME}…</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-[220px] animate-pulse rounded-[12px] border border-border bg-bg-card/60"
          />
        ))}
      </div>
    </>
  );
}
