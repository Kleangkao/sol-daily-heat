/** Solana Social v0 — static homepage listings only (no API / DB). */

export type SocialLink = {
  label: string;
  /** Omit when status is coming_soon — do not invent URLs. */
  href?: string;
  status?: "coming_soon";
};

export type SolanaSocialEvent = {
  id: string;
  name: string;
  location: string;
  /** One-line card preview */
  tagline: string;
  /** Modal body copy */
  modalDescription: string;
  links: SocialLink[];
};

export const SOLANA_SOCIAL_TITLE = "Solana Social";
export const SOLANA_SOCIAL_SUBTITLE = "What's happening in the Solana world";

/** v0 mock listings — replace with curated ingest later. */
export const SOLANA_SOCIAL_EVENTS: SolanaSocialEvent[] = [
  {
    id: "islanddao-koh-samui",
    name: "IslandDAO",
    location: "Koh Samui",
    tagline: "Solana community gathering on the ground in Thailand.",
    modalDescription:
      "IslandDAO is a Solana-focused community and event space in Koh Samui — a place for builders, creators, and ecosystem partners to meet in person. This v0 card is a static preview on Solana Space, not a live event feed or endorsement.",
    links: [
      { label: "Website", status: "coming_soon" },
      { label: "Follow", status: "coming_soon" },
    ],
  },
];
