import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  async rewrites() {
    const raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const base = /^https?:\/\//.test(raw) ? raw : `https://${raw}`;
    return [
      {
        source: '/api/:path*',
        destination: `${base}/:path*`,
      },
    ];
  },
};

export default nextConfig;
