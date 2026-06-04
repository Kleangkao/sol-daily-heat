import { Suspense } from "react";
import HeatDashboard from "@/components/heat/HeatDashboard";
import DashboardLoadingShell from "@/components/heat/DashboardLoadingShell";

export default function HomePage() {
  return (
    <Suspense fallback={<DashboardLoadingShell />}>
      <HeatDashboard />
    </Suspense>
  );
}
