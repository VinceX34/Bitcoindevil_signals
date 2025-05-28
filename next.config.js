/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.cryptohopper.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig; 