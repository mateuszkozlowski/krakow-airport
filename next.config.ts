/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true, // Enable React strict mode
  output: 'export', // Enable static export
  trailingSlash: true, // Ensure trailing slash for all paths
  images: {
    unoptimized: true, // Disable Next.js image optimization
  },
};

export default nextConfig;
