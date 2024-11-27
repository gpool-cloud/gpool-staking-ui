/** @type {import('next').NextConfig} */
const nextConfig = {
    async rewrites() {
      return [
        {
          source: '/api/active-boosts',
          destination: 'https://ore.gpool.cloud/get-active-boosts',
        },
      ];
    },
  }
  
  module.exports = nextConfig