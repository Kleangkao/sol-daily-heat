/** Static explore row for loading states — matches sticky offset of ExploreBar. */
export default function ExploreBarSkeleton() {
  const pillWidths = [92, 112, 52, 60, 52, 56, 44, 72, 68, 64];

  return (
    <div
      className="explore-bar-shell -mx-4 border-b border-border/70 px-4 sm:-mx-6 sm:px-6 lg:sticky lg:top-0 lg:z-30 lg:mx-0 lg:border-b lg:bg-bg-primary/95 lg:px-0 lg:pb-2 lg:pt-[max(0.25rem,env(safe-area-inset-top,0px))] lg:backdrop-blur-md"
      aria-hidden
    >
      <div className="flex gap-2 overflow-hidden max-lg:pb-0 lg:pb-0.5">
        {pillWidths.map((width, i) => (
          <div
            key={i}
            className="h-11 shrink-0 animate-pulse rounded-full border border-border bg-bg-secondary/70"
            style={{ width }}
          />
        ))}
      </div>
    </div>
  );
}
