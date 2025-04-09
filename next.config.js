/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'www.javbus.com',
      'pics.dmm.co.jp',
      'javbus.com',
      'dmm.co.jp',
      'missav.ai',
      'missav.com'
    ],
    unoptimized: true, // Allow unoptimized images for external sources
  },
  async rewrites() {
    return [
      {
        source: '/api/proxy/:path*',
        destination: 'https://missav.ai/:path*',
      },
    ];
  },
};

module.exports = nextConfig; 