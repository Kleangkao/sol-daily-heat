import type { RawItem, Source } from "@/lib/types/db";

export type ClusterMetrics = {
  editorialSourceCount: number;
  signalCount: number;
  uniqueSignals: string[];
  /** Used for heat-score source diversity */
  effectiveSourceCount: number;
  /** Shown on cards as "N sources" */
  displaySourceCount: number;
};

const SIGNAL_LABELS: Record<string, string> = {
  boost: "DexScreener boost",
  new_pair: "new pair",
  tvl_move: "TVL move",
  chain_tvl: "chain TVL",
  fees_move: "fees move",
  chain_fees: "chain fees",
};

function itemTypeOf(item: RawItem): string {
  return (item.metadata_json?.item_type as string) ?? "news";
}

export function computeClusterMetrics(
  items: Array<RawItem & { sources?: Source }>
): ClusterMetrics {
  const editorialSourceIds = new Set<string>();
  const seenSignalRows = new Set<string>();
  let signalCount = 0;
  const signalSet = new Set<string>();

  for (const item of items) {
    const itemType = itemTypeOf(item);
    const signal = item.metadata_json?.signal as string | undefined;

    if (itemType === "news" || itemType === "manual") {
      if (item.metadata_json?.sitemap_discovery === true) continue;
      editorialSourceIds.add(item.source_id);
    } else if (itemType === "market" || itemType === "protocol") {
      const rowKey = item.external_id ?? item.id;
      if (seenSignalRows.has(rowKey)) continue;
      seenSignalRows.add(rowKey);
      signalCount += 1;
      if (signal) signalSet.add(signal);
    } else {
      editorialSourceIds.add(item.source_id);
    }
  }

  const editorialSourceCount = editorialSourceIds.size;
  const uniqueSignals = Array.from(signalSet);
  const effectiveSourceCount =
    editorialSourceCount > 0 ? editorialSourceCount : signalCount > 0 ? 1 : 1;
  const displaySourceCount = editorialSourceCount > 0 ? editorialSourceCount : 1;

  return {
    editorialSourceCount,
    signalCount,
    uniqueSignals,
    effectiveSourceCount,
    displaySourceCount,
  };
}

export function formatSignalLabels(signals: string[]): string {
  return signals
    .map((s) => SIGNAL_LABELS[s] ?? s.replace(/_/g, " "))
    .join(", ");
}
