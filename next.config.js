/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['react', 'react-dom']
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'encrypted-tbn*.gstatic.com' },
      { protocol: 'https', hostname: '*.ggpht.com' },
      { protocol: 'https', hostname: '*.googleusercontent.com' },
      { protocol: 'https', hostname: '*'}
    ]
  }
};

module.exports = nextConfig;
