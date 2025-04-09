/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow images from these domains
  images: {
    domains: [
      'www.javbus.com',
      'pics.dmm.co.jp',
      'busapi.furey.top'
    ],
    // Enable remote image optimization
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Output as a static site (optional - remove if you need server-side features)
  // output: 'export',
  // Disable strict mode for faster development (enable in production)
  reactStrictMode: false,
  // Increase timeout for builds
  experimental: {
    // For larger codebases
    serverComponentsExternalPackages: ['sharp', 'axios'],
  },
  // Configure webpack to handle large JSON files
  webpack: (config) => {
    // Increase the maximum assets size to avoid build failures
    config.performance.maxAssetSize = 500000;
    return config;
  },
  // Enable static image imports for better optimization
  staticPageGenerationTimeout: 120,
  // Configure redirects if needed
  async redirects() {
    return [];
  },
  // Environment variables to expose to the browser
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://busapi.furey.top/api',
    NEXT_PUBLIC_WATCH_URL_PREFIX: process.env.NEXT_PUBLIC_WATCH_URL_PREFIX || 'https://missav.ai'
  }
};

module.exports = nextConfig; 