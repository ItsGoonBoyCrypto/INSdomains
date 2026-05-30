/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  experimental: { optimizePackageImports: ["lucide-react"] },
  async rewrites() {
    return [
      // Clean URLs for static snap pages (static files live at /public/<name>.html).
      { source: "/snap", destination: "/snap.html" },
      { source: "/snap-help", destination: "/snap-help.html" },
      { source: "/snap-demo", destination: "/snap-demo.html" },
    ];
  },
};

export default nextConfig;
