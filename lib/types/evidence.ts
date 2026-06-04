/** Structured evidence on heat cards — facts vs interpretation. */

export type EvidenceKind = "fact" | "market_signal" | "protocol_signal" | "interpretation";

export interface EvidenceItem {
  kind: EvidenceKind;
  label: string;
  text: string;
  url?: string;
  sourceName?: string;
}

export interface SourceLink {
  label: string;
  url: string;
}

export interface SignalBreakdownEntry {
  key: string;
  label: string;
  points: number;
  /** Score component = rule-based interpretation of raw signals */
  kind: "fact" | "interpretation";
}

export interface TopicEvidence {
  whatHappened: string;
  evidenceItems: EvidenceItem[];
  sourceLinks: SourceLink[];
  signalBreakdown: SignalBreakdownEntry[];
  interpretationNote: string;
  watchNext: string;
  factVsInterpretation: {
    facts: string[];
    interpretations: string[];
  };
}
