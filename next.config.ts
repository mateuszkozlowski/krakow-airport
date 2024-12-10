/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export', // This ensures static export
  trailingSlash: true, // Important for GitHub Pages, to include trailing slashes
  images: {
    unoptimized: true, // Disable Next.js image optimization (not supported on GitHub Pages)
  },
};

export default nextConfig;
