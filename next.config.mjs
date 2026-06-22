/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { dev }) => {
    // Avoid stale webpack cache causing missing chunk/CSS 404s during local dev.
    if (dev) config.cache = false;
    return config;
  },
};

export default nextConfig;
