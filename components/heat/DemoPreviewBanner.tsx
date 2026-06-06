import type { DashboardDataSource } from "@/lib/types/heat";
import { formatSnapshotHeroLine } from "@/lib/heat/snapshot-date";

type Props = {
  dataSource: DashboardDataSource;
  snapshotDate: string;
};

export default function DemoPreviewBanner({ dataSource, snapshotDate }: Props) {
  if (dataSource === "live") return null;

  const isFullDemo = dataSource === "mock";

  return (
    <div
      role="status"
      className={
        isFullDemo
          ? "border-b border-heat/40 bg-heat/10 px-4 py-3 sm:px-6 lg:px-8"
          : "border-b border-heat/30 bg-heat/5 px-4 py-2.5 sm:px-6 lg:px-8"
      }
    >
      <div className="mx-auto max-w-6xl">
        <p className="text-[13px] font-semibold text-heat">
          {isFullDemo
            ? "Demo preview. No live snapshot for this date"
            : "Partial demo. Some sections have no live rows for this UTC date"}
        </p>
        <p className="mt-1 text-[12px] text-text-secondary">
          {formatSnapshotHeroLine(snapshotDate)}. Cards marked{" "}
          <span className="font-medium">(demo)</span> are sample data, not live rankings.
        </p>
      </div>
    </div>
  );
}
