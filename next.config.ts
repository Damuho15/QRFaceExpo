
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  env: {
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  },
  async rewrites() {
    return [
      {
        source: '/rest/v1/:path*',
        destination: 'https://qisldnceqvfcqvkzsvrd.supabase.co/rest/v1/:path*',
      },
      {
        source: '/storage/v1/:path*',
        destination: 'https://qisldnceqvfcqvkzsvrd.supabase.co/storage/v1/:path*',
      }
    ];
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.qrserver.com',
        port: '',
        pathname: '/v1/create-qr-code/**',
      },
      {
        protocol: 'https',
        hostname: 'qisldnceqvfcqvkzsvrd.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      }
    ],
  },
};

export default nextConfig;

    