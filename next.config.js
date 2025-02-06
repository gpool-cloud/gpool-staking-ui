/** @type {import('next').NextConfig} */
const nextConfig = {
    async rewrites() {
      return [
        {
          source: '/api/:path*',
          destination: 'https://api.gpool.cloud/:path*',
        },
      ];
    },
  }
  
  module.exports = nextConfig