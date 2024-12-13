/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',
    basePath: '',
    assetPrefix: '',
    images: {
        unoptimized: true,
    },
    trailingSlash: true,
    // Add exportPathMap to explicitly define static routes
    exportPathMap: async function() {
        return {
            '/': { page: '/' },
            '/changelog': { page: '/changelog' }
        };
    }
};

module.exports = nextConfig;