import { Suspense } from "react";
import HeatDashboard from "@/components/heat/HeatDashboard";
import HomePageLoadingFallback from "@/components/heat/HomePageLoadingFallback";

export default function HomePage() {
  return (
    <Suspense fallback={<HomePageLoadingFallback />}>
      <HeatDashboard />
    </Suspense>
  );
}
