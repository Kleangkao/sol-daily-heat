export type DemoLink = {
  label: string;
  href: string;
};

export type DemoCard = {
  id: string;
  name: string;
  categoryLabel: string;
  imageSrc: string;
  imageWidth: number;
  imageHeight: number;
  /** Gaming popups only */
  about?: string;
  links: DemoLink[];
};

export type DemoCardLayout = "banner" | "square";

export type DemoSpotlightSection = {
  id: string;
  title: string;
  description: string;
  cardLayout: DemoCardLayout;
  modalVariant: "gaming-about" | "links-only";
  cards: DemoCard[];
};

export const GAMING_DEMO_SECTION: DemoSpotlightSection = {
  id: "gaming-demo",
  title: "Gaming",
  description: "Solana games and playable worlds — demo spotlight, not a live feed.",
  cardLayout: "banner",
  modalVariant: "gaming-about",
  cards: [
    {
      id: "star-atlas",
      name: "Star Atlas",
      categoryLabel: "Game",
      imageSrc: "/gaming/star-atlas.jpg",
      imageWidth: 1920,
      imageHeight: 1080,
      about:
        "A sci-fi space MMO on Solana with exploration, fleet command, ship combat, crafting, quests, and browser-based ways to play like SAGE Labs and Holosim.",
      links: [
        { label: "X", href: "https://x.com/staratlas" },
        { label: "Website", href: "https://staratlas.com/" },
        { label: "Play in Browser", href: "https://based.staratlas.com/" },
        { label: "Try HoloSim for Free", href: "https://holosim.staratlas.com/" },
        {
          label: "Play on UE5 (Epic Games)",
          href: "https://store.epicgames.com/p/star-atlas-bead34?lang=en-US",
        },
      ],
    },
    {
      id: "wilder-world",
      name: "Wilder World",
      categoryLabel: "Game",
      imageSrc: "/gaming/wilder-world.jpg",
      imageWidth: 1920,
      imageHeight: 1080,
      about:
        "A futuristic open-world metaverse set in Wiami, mixing racing, FPS combat, exploration, missions, and player-owned assets.",
      links: [
        { label: "X", href: "https://x.com/WilderWorld" },
        { label: "Website", href: "https://www.wilderworld.com/" },
        {
          label: "Play Game",
          href: "https://store.epicgames.com/p/wilder-world-wilder-world-alpha-b4ccf8?lang=en-US",
        },
      ],
    },
    {
      id: "amiko-legends",
      name: "Amiko Legends",
      categoryLabel: "Game",
      imageSrc: "/gaming/amiko-legends.jpg",
      imageWidth: 1920,
      imageHeight: 1080,
      about:
        "An extraction creature-collector RPG where players team up with Amiko, take risks on expeditions, collect resources, and extract what they earn.",
      links: [
        { label: "X", href: "https://x.com/AmikoLegends" },
        { label: "Website", href: "https://amikolegends.com/" },
        {
          label: "Play Game",
          href: "https://store.steampowered.com/app/4245930/Amiko_Legends/",
        },
      ],
    },
    {
      id: "honeyland",
      name: "Honeyland",
      categoryLabel: "Game",
      imageSrc: "/gaming/honeyland.jpg",
      imageWidth: 1920,
      imageHeight: 1080,
      about:
        "A casual strategy game where players build a bee swarm, harvest rewards, complete quests, and compete in PvP battles.",
      links: [
        { label: "X", href: "https://x.com/HoneylandHQ" },
        { label: "Website", href: "https://www.honey.land/" },
      ],
    },
  ],
};

export const NFT_DEMO_SECTION: DemoSpotlightSection = {
  id: "nft-demo",
  title: "NFT",
  description: "Solana NFT communities — demo spotlight.",
  cardLayout: "square",
  modalVariant: "links-only",
  cards: [
    {
      id: "monkedao",
      name: "MonkeDAO",
      categoryLabel: "NFT",
      imageSrc: "/nft/monkedao.png",
      imageWidth: 512,
      imageHeight: 512,
      links: [
        { label: "X", href: "https://x.com/MonkeDAO" },
        { label: "Website", href: "https://monkedao.io/" },
      ],
    },
    {
      id: "islanddao",
      name: "IslandDAO",
      categoryLabel: "NFT",
      imageSrc: "/nft/islanddao.png",
      imageWidth: 1200,
      imageHeight: 1200,
      links: [
        { label: "X", href: "https://x.com/islanddao" },
        { label: "Website", href: "https://islanddao.org/" },
      ],
    },
  ],
};

export const AI_DEMO_SECTION: DemoSpotlightSection = {
  id: "ai-demo",
  title: "AI",
  description: "Solana AI projects — demo spotlight.",
  cardLayout: "banner",
  modalVariant: "links-only",
  cards: [
    {
      id: "bido",
      name: "BIDO",
      categoryLabel: "AI",
      imageSrc: "/ai/bido.jpg",
      imageWidth: 800,
      imageHeight: 450,
      links: [
        { label: "X", href: "https://x.com/usebido" },
        { label: "Website", href: "https://www.usebido.com/" },
      ],
    },
  ],
};

export const HOMEPAGE_DEMO_SECTIONS: DemoSpotlightSection[] = [
  GAMING_DEMO_SECTION,
  NFT_DEMO_SECTION,
  AI_DEMO_SECTION,
];
