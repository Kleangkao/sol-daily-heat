import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "bg-primary": "var(--bg-primary)",
        "bg-secondary": "var(--bg-secondary)",
        "bg-card": "var(--bg-card)",
        accent: "var(--accent)",
        "accent-hover": "var(--accent-hover)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-muted": "var(--text-muted)",
        border: "var(--border)",
        danger: "var(--danger)",
        heat: "var(--heat)",
        "heat-hover": "var(--heat-hover)",
        "solana-mint": "var(--solana-mint)",
      },
      fontFamily: {
        heading: ["var(--font-barlow)", "sans-serif"],
        body: ["var(--font-outfit)", "system-ui", "sans-serif"],
        space: ["var(--font-great-vibes)", "cursive"],
      },
    },
  },
  plugins: [],
};

export default config;
