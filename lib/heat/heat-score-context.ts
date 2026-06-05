export type HeatScoreBucket = "very_high" | "high" | "moderate" | "low";

export function heatScoreBucket(score: number): HeatScoreBucket {
  if (score >= 80) return "very_high";
  if (score >= 60) return "high";
  if (score >= 40) return "moderate";
  return "low";
}

const BUCKET_LABEL: Record<HeatScoreBucket, string> = {
  very_high: "Very high",
  high: "High",
  moderate: "Moderate",
  low: "Low",
};

const BUCKET_INTEREST: Record<HeatScoreBucket, string> = {
  very_high: "very high",
  high: "high",
  moderate: "moderate",
  low: "low",
};

/** Display-only copy for topic detail header — does not affect scoring. */
export function buildHeatScoreContext(score: number): string {
  const key = heatScoreBucket(score);
  return `Heat ${score} (${BUCKET_LABEL[key]}) means ${BUCKET_INTEREST[key]} scanner interest for this UTC snapshot; it is not confidence or price direction.`;
}
