export default function DashboardLoadingShell() {
  return (
    <main
      className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8"
      aria-busy="true"
      aria-live="polite"
    >
      <p className="text-[14px] font-medium text-text-secondary">
        Loading live scanner data…
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-[220px] animate-pulse rounded-[12px] border border-border bg-bg-card/60"
          />
        ))}
      </div>
    </main>
  );
}
