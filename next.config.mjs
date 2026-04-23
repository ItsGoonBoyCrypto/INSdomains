/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  experimental: { optimizePackageImports: ["lucide-react"] },
};

export default nextConfig;
