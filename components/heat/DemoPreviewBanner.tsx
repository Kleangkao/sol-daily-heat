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
          ? "border-b border-amber-500/50 bg-amber-500/15 px-4 py-3 sm:px-6 lg:px-8"
          : "border-b border-amber-500/35 bg-amber-500/10 px-4 py-2.5 sm:px-6 lg:px-8"
      }
    >
      <div className="mx-auto max-w-6xl">
        <p className="text-[13px] font-semibold text-amber-100">
          {isFullDemo
            ? "Demo preview — no live snapshot for this date"
            : "Partial demo — some sections have no live rows for this UTC date"}
        </p>
        <p className="mt-1 text-[12px] text-amber-100/85">
          {formatSnapshotHeroLine(snapshotDate)}. Cards marked{" "}
          <span className="font-medium">(demo)</span> are sample data, not live rankings.
        </p>
      </div>
    </div>
  );
}
