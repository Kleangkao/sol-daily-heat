/** Solanagram v0 — static homepage image cards only (no API / DB). */

export const SOLANA_GRAM_TITLE = "Solanagram";

export type SolanaSocialPerson = {
  /** Display name for internal clarity and accessibility. */
  name: string;
  xHandle: string;
  xUrl: string;
};

export type SolanaSocialCard = {
  id: string;
  imageSrc: string;
  imageWidth: number;
  imageHeight: number;
  people: SolanaSocialPerson[];
  /** Film-strip crop anchor (`top`, `center`, or any CSS object-position value). */
  thumbObjectPosition?: "top" | "center" | (string & {});
};

/** Image files: resource for pic/0.jpg … 5.jpg */
export const SOLANA_GRAM_CARDS: SolanaSocialCard[] = [
  {
    id: "social-0",
    imageSrc: "/social/0.jpg",
    imageWidth: 1280,
    imageHeight: 1157,
    people: [
      { name: "belluzzo", xHandle: "belluzzojr", xUrl: "https://x.com/belluzzojr" },
      { name: "Dean | Realms", xHandle: "deanmachine", xUrl: "https://x.com/deanmachine" },
      {
        name: "Pedro Nagamine",
        xHandle: "NagaminePe18151",
        xUrl: "https://x.com/NagaminePe18151",
      },
    ],
  },
  {
    id: "social-1",
    imageSrc: "/social/1.jpg",
    imageWidth: 800,
    imageHeight: 575,
    people: [
      { name: "Superteam Brazil", xHandle: "SuperteamBR", xUrl: "https://x.com/SuperteamBR" },
      {
        name: "Whale's Friend | Realms",
        xHandle: "Whalesfriend",
        xUrl: "https://x.com/Whalesfriend",
      },
      { name: "Metaplex", xHandle: "Metaplex", xUrl: "https://x.com/Metaplex" },
      { name: "Takisoul", xHandle: "takisoul", xUrl: "https://x.com/takisoul" },
      { name: "cigarros.sol", xHandle: "cigarrosnft", xUrl: "https://x.com/cigarrosnft" },
    ],
  },
  {
    id: "social-2",
    imageSrc: "/social/2.jpg",
    imageWidth: 923,
    imageHeight: 1280,
    people: [
      { name: "Jaspen", xHandle: "thetitanmaker", xUrl: "https://x.com/thetitanmaker" },
      { name: "Qucks", xHandle: "solquicks", xUrl: "https://x.com/solquicks" },
    ],
  },
  {
    id: "social-3",
    imageSrc: "/social/3.jpg",
    imageWidth: 825,
    imageHeight: 1280,
    people: [
      {
        name: "Tony Beeman",
        xHandle: "tonyboyletweets",
        xUrl: "https://x.com/tonyboyletweets",
      },
      { name: "James", xHandle: "noisesang", xUrl: "https://x.com/noisesang" },
    ],
    thumbObjectPosition: "top",
  },
  {
    id: "social-4",
    imageSrc: "/social/4.jpg",
    imageWidth: 896,
    imageHeight: 1280,
    people: [{ name: "Rob", xHandle: "PudgyPulls", xUrl: "https://x.com/PudgyPulls" }],
  },
  {
    id: "social-5",
    imageSrc: "/social/5.jpg",
    imageWidth: 1280,
    imageHeight: 996,
    people: [
      { name: "Valid", xHandle: "validotxyz", xUrl: "https://x.com/validotxyz" },
      { name: "Frame Tailor", xHandle: "Frame_tailor_", xUrl: "https://x.com/Frame_tailor_" },
    ],
    thumbObjectPosition: "top",
  },
];
