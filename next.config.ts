import type { NextConfig } from 'next';

const isProd = process.env.NODE_ENV === 'production';

if (!isProd && typeof window === 'undefined') {
  try {
    import('./lib/nuaAi/devServer')
      .then((m) => m.startNuaAiLocalDevServer())
      .catch(() => {});
  } catch {}
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  output: isProd ? 'export' : undefined,
  images: {
    unoptimized: true,
  },
  transpilePackages: ['motion'],
  webpack: (config, { dev }) => {
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    return config;
  },
  ...(isProd
    ? {}
    : {
        async rewrites() {
          return [
            {
              source: '/api/nua-ai/:path*',
              destination: 'http://127.0.0.1:3105/api/nua-ai/:path*',
            },
            {
              source: '/api/:path*',
              destination: 'http://127.0.0.1:8788/api/:path*',
            },
          ];
        },
      }),
};

export default nextConfig;
