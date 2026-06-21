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
  /** Banner thumb crop — default centers; top keeps header art visible. */
  thumbObjectPosition?: "top" | "center";
  /** Popup About body copy */
  about?: string;
  links: DemoLink[];
};

export type DemoCardLayout = "gaming-row" | "square" | "banner";

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
  cardLayout: "gaming-row",
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
      thumbObjectPosition: "top",
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
      about: "A leading Solana NFT community and ecosystem brand.",
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
      about: "A Solana-native community and collaboration hub.",
      links: [
        { label: "X", href: "https://x.com/islanddao" },
        { label: "Website", href: "https://islanddao.org/" },
      ],
    },
    {
      id: "mad-lads",
      name: "Mad Lads",
      categoryLabel: "NFT",
      imageSrc: "/nft/mad-lads.jpg",
      imageWidth: 1200,
      imageHeight: 1200,
      about:
        "Backpack-native xNFT culture and one of Solana's modern blue-chip NFT names.",
      links: [
        { label: "Website", href: "https://www.madlads.com/" },
        { label: "X", href: "https://x.com/MadLads" },
      ],
    },
    {
      id: "tensor",
      name: "Tensor",
      categoryLabel: "NFT",
      imageSrc: "/nft/tensor.png",
      imageWidth: 1200,
      imageHeight: 1200,
      about:
        "Solana's leading NFT marketplace for collectors, pro traders, and NFT discovery.",
      links: [
        { label: "Website", href: "https://www.tensor.trade" },
        { label: "X", href: "https://x.com/tensor_hq" },
      ],
    },
    {
      id: "famous-fox-federation",
      name: "Famous Fox Federation",
      categoryLabel: "NFT",
      imageSrc: "/nft/famous-fox-federation.png",
      imageWidth: 1200,
      imageHeight: 1200,
      about:
        "A long-running Solana NFT community known for Foxes, tools, and utility.",
      links: [
        { label: "Website", href: "https://famousfoxes.com/" },
        { label: "X", href: "https://x.com/FamousFoxFed" },
      ],
    },
    {
      id: "okay-bears",
      name: "Okay Bears",
      categoryLabel: "NFT",
      imageSrc: "/nft/okay-bears.jpg",
      imageWidth: 1200,
      imageHeight: 1200,
      about:
        "A Solana-born culture brand known for community, art, and mainstream-friendly identity.",
      links: [
        { label: "Website", href: "https://okaybears.com/" },
        { label: "X", href: "https://x.com/okaybears" },
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
      about:
        "A Solana-focused AI product experience designed to help users interact with tools and workflows in a simple, accessible way.",
      links: [
        { label: "X", href: "https://x.com/usebido" },
        { label: "Website", href: "https://www.usebido.com/" },
      ],
    },
    {
      id: "nosana",
      name: "Nosana",
      categoryLabel: "AI",
      imageSrc: "/ai/nosana.jpg",
      imageWidth: 800,
      imageHeight: 450,
      about: "A Solana-based GPU marketplace for AI and high-performance workloads.",
      links: [
        { label: "Website", href: "https://nosana.com/" },
        { label: "X", href: "https://x.com/nosana_ai" },
      ],
    },
    {
      id: "sendai",
      name: "SendAI / Solana Agent Kit",
      categoryLabel: "AI",
      imageSrc: "/ai/sendai.jpg",
      imageWidth: 800,
      imageHeight: 450,
      about:
        "A Solana-native toolkit for connecting AI agents to on-chain actions and workflows.",
      links: [
        { label: "Website", href: "https://www.sendai.fun/" },
        { label: "Agent Kit", href: "https://kit.sendai.fun/" },
        { label: "X", href: "https://x.com/sendaifun" },
      ],
    },
    {
      id: "griffain",
      name: "Griffain",
      categoryLabel: "AI",
      imageSrc: "/ai/griffain.png",
      imageWidth: 800,
      imageHeight: 450,
      about:
        "A consumer-facing Solana AI agent app for natural-language on-chain actions.",
      links: [
        { label: "Website", href: "https://griffain.com/" },
        { label: "X", href: "https://x.com/griffaindotcom" },
      ],
    },
    {
      id: "grass",
      name: "Grass",
      categoryLabel: "AI",
      imageSrc: "/ai/grass.jpg",
      imageWidth: 800,
      imageHeight: 450,
      about:
        "A decentralized data network that turns unused internet bandwidth into AI-era infrastructure.",
      links: [
        { label: "Website", href: "https://www.grass.io/" },
        { label: "X", href: "https://x.com/grass" },
      ],
    },
    {
      id: "ionet",
      name: "io.net",
      categoryLabel: "AI",
      imageSrc: "/ai/ionet.jpg",
      imageWidth: 800,
      imageHeight: 450,
      about: "A decentralized GPU cloud for AI teams that need scalable compute.",
      links: [
        { label: "Website", href: "https://io.net/" },
        { label: "X", href: "https://x.com/ionet" },
      ],
    },
  ],
};

export const HOMEPAGE_DEMO_SECTIONS: DemoSpotlightSection[] = [
  GAMING_DEMO_SECTION,
  NFT_DEMO_SECTION,
  AI_DEMO_SECTION,
];
