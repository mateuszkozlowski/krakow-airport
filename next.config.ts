/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',  // Change this from 'export'
  images: {
    unoptimized: true,
  }
};

module.exports = nextConfig;