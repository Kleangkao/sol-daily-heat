export type IslandDaoFeatured = {
  id: string;
  name: string;
  /** Path under /public (served as /sponsors/...). Omit when textLogo is true. */
  logoPath?: string;
  /** Temporary text-only logo when no asset is available yet. */
  textLogo?: boolean;
  websiteUrl: string;
};

/** @deprecated Use IslandDaoFeatured */
export type IslandDaoSponsor = IslandDaoFeatured;

/** Display-only partners from IslandDAO V4. Not used in ranking or heat logic. */
export const ISLANDDAO_FEATURED: IslandDaoFeatured[] = [
  {
    id: "solana-foundation",
    name: "Solana Foundation",
    logoPath: "/sponsors/solana-foundation.png",
    websiteUrl: "https://solana.org/",
  },
  {
    id: "solana-mobile",
    name: "Solana Mobile",
    logoPath: "/sponsors/solana-mobile.png",
    websiteUrl: "https://solanamobile.com/",
  },
  {
    id: "doublezero",
    name: "DoubleZero",
    logoPath: "/sponsors/doublezero.png",
    websiteUrl: "https://doublezero.xyz/",
  },
  {
    id: "realms",
    name: "Realms",
    logoPath: "/sponsors/realms.png",
    websiteUrl: "https://www.realms.today/",
  },
  {
    id: "solblaze",
    name: "SolBlaze",
    logoPath: "/sponsors/solblaze.png",
    websiteUrl: "https://solblaze.org/",
  },
  {
    id: "play-solana",
    name: "Play Solana",
    logoPath: "/sponsors/play-solana.png",
    websiteUrl: "https://www.playsolana.com/",
  },
  {
    id: "monkedao",
    name: "MonkeDAO",
    logoPath: "/sponsors/monkedao.png",
    websiteUrl: "https://monkedao.io/",
  },
  {
    id: "ioffc",
    name: "IOFFC",
    logoPath: "/sponsors/ioffc.png",
    websiteUrl: "https://www.ionlyflyfirstclass.com/",
  },
  {
    id: "solflare",
    name: "Solflare",
    logoPath: "/sponsors/solflare-logo.webp",
    websiteUrl: "https://solflare.com/",
  },
  {
    id: "surfcash",
    name: "SurfCash",
    logoPath: "/sponsors/surfcash.png",
    websiteUrl: "https://www.getsurf.cash/",
  },
  {
    id: "ride",
    name: "Ride",
    logoPath: "/sponsors/ride.png",
    websiteUrl: "https://www.ride.markets/",
  },
  {
    id: "solmandao",
    name: "SolmanDAO",
    logoPath: "/sponsors/solmandao.png",
    websiteUrl: "https://solman.club/",
  },
];

/** @deprecated Use ISLANDDAO_FEATURED */
export const ISLANDDAO_SPONSORS = ISLANDDAO_FEATURED;
