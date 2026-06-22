/** Solanagram v0 — static homepage image cards only (no API / DB). */

export const SOLANA_GRAM_TITLE = "Solanagram";

export type SolanaSocialPerson = {
  name: string;
  xUrl?: string;
};

export type SolanaSocialCard = {
  id: string;
  imageSrc: string;
  imageWidth: number;
  imageHeight: number;
  people: SolanaSocialPerson[];
  /** Desktop thumbnail crop anchor (object-position). */
  thumbObjectPosition?: "top" | "center";
};

/** Image files: resource for pic/0.jpg … 5.jpg */
export const SOLANA_GRAM_CARDS: SolanaSocialCard[] = [
  {
    id: "social-0",
    imageSrc: "/social/0.jpg",
    imageWidth: 1280,
    imageHeight: 1157,
    people: [
      { name: "belluzzo", xUrl: "https://x.com/belluzzojr" },
      { name: "Dean | Realms", xUrl: "https://x.com/deanmachine" },
      { name: "Pedro Nagamine", xUrl: "https://x.com/NagaminePe18151" },
    ],
  },
  {
    id: "social-1",
    imageSrc: "/social/1.jpg",
    imageWidth: 800,
    imageHeight: 575,
    people: [
      { name: "Superteam Brazil", xUrl: "https://x.com/SuperteamBR" },
      { name: "Metaplex", xUrl: "https://x.com/Metaplex" },
      { name: "Chris" },
      { name: "Takisoul", xUrl: "https://x.com/takisoul" },
      { name: "cigarros.sol", xUrl: "https://x.com/cigarrosnft" },
    ],
  },
  {
    id: "social-2",
    imageSrc: "/social/2.jpg",
    imageWidth: 923,
    imageHeight: 1280,
    people: [
      { name: "Qucks", xUrl: "https://x.com/solquicks" },
      { name: "Jaspen", xUrl: "https://x.com/thetitanmaker" },
    ],
  },
  {
    id: "social-3",
    imageSrc: "/social/3.jpg",
    imageWidth: 825,
    imageHeight: 1280,
    people: [
      { name: "James", xUrl: "https://x.com/noisesang" },
      { name: "Tony Beeman", xUrl: "https://x.com/beeman_nl" },
    ],
    thumbObjectPosition: "top",
  },
  {
    id: "social-4",
    imageSrc: "/social/4.jpg",
    imageWidth: 896,
    imageHeight: 1280,
    people: [{ name: "Rob" }],
  },
  {
    id: "social-5",
    imageSrc: "/social/5.jpg",
    imageWidth: 1280,
    imageHeight: 948,
    people: [{ name: "IslandDAO", xUrl: "https://x.com/islanddao" }],
  },
];
