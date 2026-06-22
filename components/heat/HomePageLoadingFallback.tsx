import HeatHero from "@/components/heat/HeatHero";
import ExploreBarSkeleton from "@/components/heat/ExploreBarSkeleton";
import DashboardMainSkeleton from "@/components/heat/DashboardMainSkeleton";

/** Initial Suspense fallback — same shell as the loaded mobile/desktop layout. */
export default function HomePageLoadingFallback() {
  return (
    <div className="min-h-screen">
      <HeatHero
        mobileStickySlot={
          <div className="lg:hidden">
            <ExploreBarSkeleton />
          </div>
        }
      />
      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <div className="hidden lg:block">
          <ExploreBarSkeleton />
        </div>
        <DashboardMainSkeleton />
      </main>
    </div>
  );
}
