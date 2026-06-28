/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {},
  serverExternalPackages: ['pino-pretty', 'lokijs', 'encoding'],
  async rewrites() {
    return [
      {
        source: '/zama-relayer/:path*',
        destination: 'https://relayer.testnet.zama.org/v2/:path*',
      },
    ];
  },
};

export default nextConfig;