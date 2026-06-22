/** Solana Gram v0 — static homepage image cards only (no API / DB). */

export const SOLANA_GRAM_TITLE = "Solana Gram";

export type SolanaSocialCard = {
  id: string;
  imageSrc: string;
  imageWidth: number;
  imageHeight: number;
  people: string[];
  /** Desktop thumbnail crop anchor (object-position). */
  thumbObjectPosition?: "top" | "center";
};

/** Image files: resource for pic/1.jpg … 5.jpg */
export const SOLANA_GRAM_CARDS: SolanaSocialCard[] = [
  {
    id: "social-1",
    imageSrc: "/social/1.jpg",
    imageWidth: 800,
    imageHeight: 575,
    people: ["Super team Brazil", "Megaplex", "Chris", "Takisoul"],
  },
  {
    id: "social-2",
    imageSrc: "/social/2.jpg",
    imageWidth: 923,
    imageHeight: 1280,
    people: ["Qucks", "Jaspen"],
  },
  {
    id: "social-3",
    imageSrc: "/social/3.jpg",
    imageWidth: 825,
    imageHeight: 1280,
    people: ["James", "Tony"],
    thumbObjectPosition: "top",
  },
  {
    id: "social-4",
    imageSrc: "/social/4.jpg",
    imageWidth: 896,
    imageHeight: 1280,
    people: ["Rob"],
  },
  {
    id: "social-5",
    imageSrc: "/social/5.jpg",
    imageWidth: 1280,
    imageHeight: 948,
    people: ["IslandDAO"],
  },
];
