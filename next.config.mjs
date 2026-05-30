/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  experimental: { optimizePackageImports: ["lucide-react"] },
  async rewrites() {
    return [
      // Clean URL for the public snap install page (static file lives at /public/snap.html).
      { source: "/snap", destination: "/snap.html" },
    ];
  },
};

export default nextConfig;
