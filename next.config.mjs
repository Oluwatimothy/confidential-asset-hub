/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {},
  serverExternalPackages: ['pino-pretty', 'lokijs', 'encoding'],
};

export default nextConfig;